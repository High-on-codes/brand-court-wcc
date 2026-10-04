import type { Charge, PersonaVote } from "@/lib/schemas/trial";

export type TallyOutcome = "sustained" | "dismissed" | "hung";

export type ChargeTally = {
  chargeId: string;
  sustain: number;
  dismiss: number;
  outcome: TallyOutcome;
};

/**
 * Deterministic vote-counting — the jury's chargeVotes are tallied in code,
 * not interpreted by an LLM. A tie (only possible with an even juror count)
 * is "hung", not silently broken either way. This result is handed to the
 * Judge as evidence and also used to filter the Judge's own revisions
 * (lib/trial/orchestrator.ts drops any revision for a dismissed charge),
 * so a charge the jury rejected can't still surface a revision regardless
 * of what the Judge writes.
 */
export function tallyJuryVotes(charges: Charge[], votes: PersonaVote[]): ChargeTally[] {
  return charges.map((charge) => {
    let sustain = 0;
    let dismiss = 0;
    for (const voter of votes) {
      const ballot = voter.chargeVotes.find((v) => v.chargeId === charge.id);
      if (!ballot) continue;
      if (ballot.sustain) sustain++;
      else dismiss++;
    }
    const outcome: TallyOutcome =
      sustain > dismiss ? "sustained" : dismiss > sustain ? "dismissed" : "hung";
    return { chargeId: charge.id, sustain, dismiss, outcome };
  });
}
