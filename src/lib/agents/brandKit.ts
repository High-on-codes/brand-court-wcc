import { callStructuredAgent } from "./client";
import { BrandKitSchema, type BrandKit, type Revision } from "@/lib/schemas/trial";
import type { BriefInput } from "@/lib/schemas/brief";

const SYSTEM = `You compile a final brand kit after a Brand Court trial concluded.
Use only the accepted revisions and the original brief — do not invent new critiques at this stage.
The palette roles and contrast notes must be consistent with the brief's palette and any accessibility revisions that were accepted.
Keep voice rules short and imperative (e.g. "Lead with the outcome, not the feature").`;

export async function runBrandKitCompiler(
  brief: BriefInput,
  acceptedRevisions: Revision[],
  verdictSummary: string
): Promise<BrandKit> {
  const revisionsBlock = acceptedRevisions
    .map((r) => `- ${r.title}: ${r.after}`)
    .join("\n");

  const prompt = `Original brief:\n${brief.brief}\n\nTagline: ${brief.tagline ?? "(none)"}\nPalette: ${
    brief.paletteHex.length ? brief.paletteHex.join(", ") : "(none provided)"
  }\n\nVerdict summary: ${verdictSummary}\n\nAccepted revisions:\n${revisionsBlock || "(none accepted — kit reflects the original brief as-is)"}\n\nCompile the final brand kit.`;

  return callStructuredAgent({
    system: SYSTEM,
    prompt,
    schema: BrandKitSchema,
    maxOutputTokens: 1536,
  });
}
