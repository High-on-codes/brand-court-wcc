import { z } from "zod";
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
Each persona gives an overall impression (guilty, not_guilty, or mixed) justified in their own voice.
Each persona must ALSO cast an explicit sustain/dismiss vote on every single charge by its id — this structured ballot, not the overall impression, is what gets tallied. Do not skip any charge id.`;

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
  const chargeIds = charges.map((c) => c.id);

  const prompt = `Brand brief:\n${brief.brief}\n\nCharges:\n${chargesBlock}\n\nDefense rebuttals:\n${rebuttalsBlock}\n\nCast your three persona votes. Every juror's chargeVotes array must include exactly these charge ids, each with a sustain (true/false) call: ${chargeIds.join(", ")}.`;

  // Same structural shape as JuryOutputSchema (so Gemini's responseJsonSchema
  // is unchanged), plus a completeness check safeParse enforces: every
  // juror must vote on every known charge id. z.toJSONSchema can't express
  // that cross-field rule, so it's passed separately as `jsonSchema` below —
  // Gemini still just sees "array of chargeVotes", the refine only gates
  // what we accept.
  const schema = JuryOutputSchema.superRefine((data, ctx) => {
    data.votes.forEach((vote, voteIndex) => {
      const covered = new Set(vote.chargeVotes.map((cv) => cv.chargeId));
      for (const id of chargeIds) {
        if (!covered.has(id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Juror "${vote.persona}" did not vote on charge ${id}`,
            path: ["votes", voteIndex, "chargeVotes"],
          });
        }
      }
    });
  });

  return callStructuredAgent({
    system: SYSTEM,
    prompt,
    schema,
    jsonSchema: z.toJSONSchema(JuryOutputSchema),
    // Default (1536) was tuned for 3 justifications with no structured
    // ballot. Each juror now also returns one {chargeId, sustain} entry per
    // charge (up to 6 charges × 3 jurors) — raised to avoid truncation
    // mid-response, which otherwise reads as invalid JSON and burns the
    // one retry on a cut-off string rather than a real schema mismatch.
    maxOutputTokens: 2560,
  });
}
