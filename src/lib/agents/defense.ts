import { callStructuredAgent } from "./client";
import {
  DefenseOutputSchema,
  type DefenseOutput,
  type Charge,
} from "@/lib/schemas/trial";
import type { BriefInput } from "@/lib/schemas/brief";

const SYSTEM = `You are Defense Counsel in Brand Court, an adversarial brand-critique trial.
You rebut every charge filed by the Prosecutor. For charges grounded in objective evidence (e.g. a cited WCAG contrast failure), concede rather than deny — your credibility depends on not contesting facts.
For subjective charges (positioning, differentiation, voice), argue the brand's actual intent and context. One rebuttal per charge, no exceptions.`;

export async function runDefense(
  brief: BriefInput,
  charges: Charge[]
): Promise<DefenseOutput> {
  const chargesBlock = charges
    .map((c) => `- [${c.id}] (${c.category}, ${c.severity}) ${c.title}: ${c.description}`)
    .join("\n");

  const prompt = `Brand brief:\n${brief.brief}\n\nCharges filed by the Prosecutor:\n${chargesBlock}\n\nRebut each charge by its id.`;

  return callStructuredAgent({
    system: SYSTEM,
    prompt,
    schema: DefenseOutputSchema,
    toolName: "file_rebuttals",
    toolDescription: "File one rebuttal per charge id.",
  });
}
