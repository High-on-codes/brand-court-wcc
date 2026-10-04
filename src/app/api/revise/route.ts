import { z } from "zod";
import { BriefInputSchema } from "@/lib/schemas/brief";
import { RevisionSchema } from "@/lib/schemas/trial";
import { runJudgeRetry } from "@/lib/agents/judge";

export const runtime = "nodejs";
export const maxDuration = 30;

const ReviseRequestSchema = z.object({
  brief: BriefInputSchema,
  revision: RevisionSchema,
  feedback: z.string().min(1, "Explain what to change before retrying."),
});

export async function POST(req: Request) {
  const json = await req.json();
  const parsed = ReviseRequestSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { brief, revision, feedback } = parsed.data;

  try {
    const retry = await runJudgeRetry(brief, revision, feedback);
    return Response.json(retry);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Retry failed" },
      { status: 502 }
    );
  }
}
