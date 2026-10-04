import { callStructuredAgent } from "./client";
import {
  JudgeOutputSchema,
  RevisionRetrySchema,
  type JudgeOutput,
  type RevisionRetry,
  type Charge,
  type Rebuttal,
  type PersonaVote,
  type Revision,
} from "@/lib/schemas/trial";
import type { BriefInput } from "@/lib/schemas/brief";
import type { ChargeTally } from "@/lib/checks/tally";

const SYSTEM = `You are the Judge in Brand Court, an adversarial brand-critique trial.
You are given the jury's tally for each charge — sustained, dismissed, or hung — computed deterministically from their ballots, not your own reading of the room.
Do not propose a revision for a dismissed charge; the jury rejected it. Propose one concrete revision for every sustained charge, and for a hung charge propose a cautious, minimal revision and say in the verdict summary that the jury was split.
Each revision must be concrete and actionable: a specific before/after change to wording, color, or positioning — never vague advice like "improve your messaging".`;

export async function runJudge(
  brief: BriefInput,
  charges: Charge[],
  rebuttals: Rebuttal[],
  votes: PersonaVote[],
  tally: ChargeTally[]
): Promise<JudgeOutput> {
  const chargesBlock = charges
    .map((c) => `- [${c.id}] ${c.title}: ${c.description}`)
    .join("\n");
  const rebuttalsBlock = rebuttals
    .map((r) => `- [${r.chargeId}] ${r.response}${r.concession ? " (conceded)" : ""}`)
    .join("\n");
  const votesBlock = votes
    .map((v) => `- ${v.persona}: ${v.verdict} — ${v.justification}`)
    .join("\n");
  const tallyBlock = tally
    .map((t) => `- [${t.chargeId}] ${t.sustain} sustain / ${t.dismiss} dismiss → ${t.outcome}`)
    .join("\n");

  const prompt = `Brand brief:\n${brief.brief}\n\nCharges:\n${chargesBlock}\n\nRebuttals:\n${rebuttalsBlock}\n\nJury votes:\n${votesBlock}\n\nDeterministic tally (computed in code, not by you):\n${tallyBlock}\n\nIssue your verdict and proposed revisions.`;

  return callStructuredAgent({
    system: SYSTEM,
    prompt,
    schema: JudgeOutputSchema,
    maxOutputTokens: 2048,
  });
}

const RETRY_SYSTEM = `You are the Judge in Brand Court. A human reviewer rejected one of your proposed revisions and gave feedback.
Produce exactly one replacement revision for the same charge that addresses the feedback. This is your only retry — make it count.`;

export async function runJudgeRetry(
  brief: BriefInput,
  rejected: Revision,
  feedback: string
): Promise<RevisionRetry> {
  const prompt = `Brand brief:\n${brief.brief}\n\nRejected revision:\n[${rejected.id}] for charge ${rejected.chargeId}\nTitle: ${rejected.title}\nDescription: ${rejected.description}\nProposed change: ${rejected.after}\n\nHuman feedback: ${feedback}\n\nPropose one replacement revision for charge ${rejected.chargeId}.`;

  return callStructuredAgent({
    system: RETRY_SYSTEM,
    prompt,
    schema: RevisionRetrySchema,
  });
}
