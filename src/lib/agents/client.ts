import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const AGENT_MODEL = "claude-sonnet-5";

type StructuredCallArgs<T extends z.ZodTypeAny> = {
  system: string;
  prompt: string;
  schema: T;
  toolName: string;
  toolDescription: string;
  maxTokens?: number;
};

/**
 * Calls Claude with a forced tool-use turn so the response is structured
 * JSON by construction, then validates it against the zod schema. On a
 * validation failure it retries exactly once, feeding the validation
 * errors back to the model. A second failure throws — callers must not
 * retry further (this is the "one auto-retry" contract from the plan).
 */
export async function callStructuredAgent<T extends z.ZodTypeAny>({
  system,
  prompt,
  schema,
  toolName,
  toolDescription,
  maxTokens = 1536,
}: StructuredCallArgs<T>): Promise<z.infer<T>> {
  const inputSchema = z.toJSONSchema(schema) as Anthropic.Tool.InputSchema;

  const tool: Anthropic.Tool = {
    name: toolName,
    description: toolDescription,
    input_schema: inputSchema,
  };

  const attempt = async (extraUserNote?: string) => {
    const messages: Anthropic.MessageParam[] = [
      { role: "user", content: extraUserNote ? `${prompt}\n\n${extraUserNote}` : prompt },
    ];

    const response = await anthropic.messages.create({
      model: AGENT_MODEL,
      max_tokens: maxTokens,
      system,
      messages,
      tools: [tool],
      tool_choice: { type: "tool", name: toolName },
    });

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );
    if (!toolUse) {
      throw new Error(`Agent "${toolName}" returned no tool_use block`);
    }
    return schema.safeParse(toolUse.input);
  };

  const first = await attempt();
  if (first.success) return first.data;

  const errorNote = `Your previous response failed schema validation:\n${first.error.message}\nCall the tool again with corrected arguments that satisfy the schema exactly.`;
  const retry = await attempt(errorNote);
  if (retry.success) return retry.data;

  throw new Error(
    `Agent "${toolName}" failed schema validation twice: ${retry.error.message}`
  );
}
