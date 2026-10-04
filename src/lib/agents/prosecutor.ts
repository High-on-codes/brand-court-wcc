import { callStructuredAgent } from "./client";
import { ProsecutorOutputSchema, type ProsecutorOutput } from "@/lib/schemas/trial";
import type { BriefInput } from "@/lib/schemas/brief";
import type { PaletteReport } from "@/lib/checks/contrast";

const SYSTEM = `You are the Prosecutor in Brand Court, an adversarial brand-critique trial.
You bring charges against a brand across four categories only: positioning, differentiation, accessibility, voice.
Every accessibility charge MUST cite the deterministic contrast evidence provided — never estimate contrast yourself, only cite the numbers you are given.
Be specific and concrete. Cite exact words, colors, or claims from the brief as evidence. Avoid generic complaints.
Raise 2-6 charges, ranked roughly by severity.`;

export async function runProsecutor(
  brief: BriefInput,
  contrastReport: PaletteReport
): Promise<ProsecutorOutput> {
  const evidenceBlock =
    contrastReport.failures.length > 0
      ? `Deterministic contrast-check evidence (WCAG, computed in code, not by you):\n${contrastReport.failures
          .map((f) => `- ${f.pair}: ratio ${f.ratio}:1 (${f.level})`)
          .join("\n")}`
      : "Deterministic contrast-check evidence: no WCAG failures found in the submitted palette.";

  const prompt = `Brand brief:\n${brief.brief}\n\nTagline: ${brief.tagline ?? "(none provided)"}\nPalette: ${
    brief.paletteHex.length ? brief.paletteHex.join(", ") : "(none provided)"
  }\nSite: ${brief.siteUrl || "(none provided)"}\n\n${evidenceBlock}\n\nFile charges against this brand.`;

  return callStructuredAgent({
    system: SYSTEM,
    prompt,
    schema: ProsecutorOutputSchema,
    toolName: "file_charges",
    toolDescription: "File formal charges against the brand under review.",
  });
}
