import { callStructuredAgent } from "./client";
import {
  JuryOutputSchema,
  type JuryOutput,
  type Charge,
  type Rebuttal,
} from "@/lib/schemas/trial";
import type { BriefInput } from "@/lib/schemas/brief";

const SYSTEM = `You are three jurors voting in Brand Court, an adversarial brand-critique trial.
You role-play three distinct target-customer personas inferred from the brand brief (e.g. a price-sensitive first-time buyer, a loyal repeat customer, a skeptical comparison-shopper).
Each persona votes independently: guilty (the charge holds), not_guilty (the rebuttal is convincing), or mixed. Justify each vote in the persona's own voice, referencing specific charges and rebuttals.`;

export async function runJury(
  brief: BriefInput,
  charges: Charge[],
  rebuttals: Rebuttal[]
): Promise<JuryOutput> {
  const chargesBlock = charges
    .map((c) => `- [${c.id}] ${c.title}: ${c.description}`)
    .join("\n");
  const rebuttalsBlock = rebuttals
    .map((r) => `- [${r.chargeId}] ${r.response}${r.concession ? " (conceded)" : ""}`)
    .join("\n");

  const prompt = `Brand brief:\n${brief.brief}\n\nCharges:\n${chargesBlock}\n\nDefense rebuttals:\n${rebuttalsBlock}\n\nCast your three persona votes.`;

  return callStructuredAgent({
    system: SYSTEM,
    prompt,
    schema: JuryOutputSchema,
  });
}
