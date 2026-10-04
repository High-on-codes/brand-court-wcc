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

const SYSTEM = `You are the Judge in Brand Court, an adversarial brand-critique trial.
Weigh the charges, rebuttals, and jury votes, then issue a verdict summary and one concrete revision per charge that the jury found credible (guilty or mixed).
Each revision must be concrete and actionable: a specific before/after change to wording, color, or positioning — never vague advice like "improve your messaging".`;

export async function runJudge(
  brief: BriefInput,
  charges: Charge[],
  rebuttals: Rebuttal[],
  votes: PersonaVote[]
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

  const prompt = `Brand brief:\n${brief.brief}\n\nCharges:\n${chargesBlock}\n\nRebuttals:\n${rebuttalsBlock}\n\nJury votes:\n${votesBlock}\n\nIssue your verdict and proposed revisions.`;

  return callStructuredAgent({
    system: SYSTEM,
    prompt,
    schema: JudgeOutputSchema,
    toolName: "issue_verdict",
    toolDescription: "Issue the verdict summary and proposed revisions.",
    maxTokens: 2048,
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
    toolName: "retry_revision",
    toolDescription: "Propose exactly one replacement revision.",
  });
}
