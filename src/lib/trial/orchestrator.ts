import { evaluatePalette } from "@/lib/checks/contrast";
import { tallyJuryVotes, type ChargeTally } from "@/lib/checks/tally";
import { runProsecutor } from "@/lib/agents/prosecutor";
import { runDefense } from "@/lib/agents/defense";
import { runJury } from "@/lib/agents/jury";
import { runJudge } from "@/lib/agents/judge";
import type { BriefInput } from "@/lib/schemas/brief";
import type {
  ProsecutorOutput,
  DefenseOutput,
  JuryOutput,
  JudgeOutput,
} from "@/lib/schemas/trial";

export type TrialEvent =
  | { type: "evidence"; data: ReturnType<typeof evaluatePalette> }
  | { type: "charges"; data: ProsecutorOutput }
  | { type: "rebuttals"; data: DefenseOutput }
  | { type: "votes"; data: JuryOutput }
  | { type: "tally"; data: ChargeTally[] }
  | { type: "verdict"; data: JudgeOutput }
  | { type: "error"; data: { message: string } };

/**
 * Runs one full trial as an async generator so the API route can stream
 * each phase to the client as it completes, instead of waiting for all
 * four agent calls to finish. Order is fixed and sequential: the contract
 * only works if later agents see earlier agents' real output, not a
 * placeholder.
 */
export async function* runTrial(brief: BriefInput): AsyncGenerator<TrialEvent> {
  try {
    const evidence = evaluatePalette(brief.paletteHex);
    yield { type: "evidence", data: evidence };

    const prosecution = await runProsecutor(brief, evidence);
    yield { type: "charges", data: prosecution };

    const defense = await runDefense(brief, prosecution.charges);
    yield { type: "rebuttals", data: defense };

    const jury = await runJury(brief, prosecution.charges, defense.rebuttals);
    yield { type: "votes", data: jury };

    const tally = tallyJuryVotes(prosecution.charges, jury.votes);
    yield { type: "tally", data: tally };

    const liveChargeIds = new Set(
      tally.filter((t) => t.outcome !== "dismissed").map((t) => t.chargeId)
    );

    let verdict: JudgeOutput;
    if (liveChargeIds.size === 0) {
      // Every charge was dismissed — there is nothing left for the Judge to
      // revise, and JudgeOutputSchema requires at least one revision, so
      // asking the model to produce one here would force it to violate its
      // own instructions just to satisfy the schema. Short-circuit instead.
      verdict = {
        verdictSummary:
          "The jury dismissed every charge. The brand stands as submitted — no revisions ordered.",
        revisions: [],
      };
    } else {
      const raw = await runJudge(
        brief,
        prosecution.charges,
        defense.rebuttals,
        jury.votes,
        tally
      );
      // Deterministic enforcement, not just a prompt instruction: a
      // revision for a charge the jury actually dismissed never reaches
      // the human gate, regardless of what the Judge wrote.
      verdict = {
        ...raw,
        revisions: raw.revisions.filter((r) => liveChargeIds.has(r.chargeId)),
      };
    }
    yield { type: "verdict", data: verdict };
  } catch (err) {
    yield {
      type: "error",
      data: { message: err instanceof Error ? err.message : "Unknown trial error" },
    };
  }
}
