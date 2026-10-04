import { z } from "zod";
import { BriefInputSchema } from "@/lib/schemas/brief";
import { RevisionSchema } from "@/lib/schemas/trial";
import { runBrandKitCompiler } from "@/lib/agents/brandKit";

export const runtime = "nodejs";
export const maxDuration = 30;

const RequestSchema = z.object({
  brief: BriefInputSchema,
  acceptedRevisions: z.array(RevisionSchema),
  verdictSummary: z.string(),
});

export async function POST(req: Request) {
  const json = await req.json();
  const parsed = RequestSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { brief, acceptedRevisions, verdictSummary } = parsed.data;

  try {
    const kit = await runBrandKitCompiler(brief, acceptedRevisions, verdictSummary);
    return Response.json(kit);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Brand kit compilation failed" },
      { status: 502 }
    );
  }
}
