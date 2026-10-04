import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const AGENT_MODEL = "gemini-3.8-flash";

type StructuredCallArgs<T extends z.ZodTypeAny> = {
  system: string;
  prompt: string;
  schema: T;
  /**
   * The JSON Schema sent to Gemini as responseJsonSchema. Defaults to
   * z.toJSONSchema(schema). Pass this separately when `schema` carries a
   * .superRefine/.refine that z.toJSONSchema can't (and shouldn't) express
   * structurally — e.g. a cross-field completeness check — so Gemini still
   * gets a clean shape while safeParse still enforces the refinement.
   */
  jsonSchema?: object;
  maxOutputTokens?: number;
};

/**
 * Calls Gemini with responseMimeType "application/json" + a JSON Schema
 * (derived straight from the zod schema via z.toJSONSchema, so there's one
 * source of truth for shape), then validates the parsed JSON against the
 * same zod schema. On a validation or parse failure it retries exactly
 * once, feeding the error back to the model. A second failure throws —
 * callers must not retry further (the "one auto-retry" contract).
 */
export async function callStructuredAgent<T extends z.ZodTypeAny>({
  system,
  prompt,
  schema,
  jsonSchema,
  maxOutputTokens = 1536,
}: StructuredCallArgs<T>): Promise<z.infer<T>> {
  const responseJsonSchema = jsonSchema ?? z.toJSONSchema(schema);

  const attempt = async (extraUserNote?: string) => {
    const contents = extraUserNote ? `${prompt}\n\n${extraUserNote}` : prompt;

    const response = await genai.models.generateContent({
      model: AGENT_MODEL,
      contents,
      config: {
        systemInstruction: system,
        responseMimeType: "application/json",
        responseJsonSchema,
        maxOutputTokens,
      },
    });

    const text = response.text;
    if (!text) {
      return { success: false as const, error: new Error("Gemini returned no text") };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return {
        success: false as const,
        error: new Error(`Gemini response was not valid JSON: ${text.slice(0, 200)}`),
      };
    }

    const result = schema.safeParse(parsed);
    if (!result.success) {
      return { success: false as const, error: result.error };
    }
    return { success: true as const, data: result.data };
  };

  const first = await attempt();
  if (first.success) return first.data;

  const errorNote = `Your previous response failed schema validation:\n${first.error.message}\nReturn corrected JSON that satisfies the schema exactly.`;
  const retry = await attempt(errorNote);
  if (retry.success) return retry.data;

  throw new Error(`Agent call failed schema validation twice: ${retry.error.message}`);
}
