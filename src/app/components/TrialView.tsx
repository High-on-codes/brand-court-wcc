"use client";

import { useMemo, useState } from "react";
import type { BriefInput } from "@/lib/schemas/brief";
import type {
  ProsecutorOutput,
  DefenseOutput,
  JuryOutput,
  JudgeOutput,
  Revision,
} from "@/lib/schemas/trial";
import type { PaletteReport } from "@/lib/checks/contrast";
import { RevisionGate, type GateStatus } from "./RevisionGate";

type Props = {
  brief: BriefInput;
  evidence?: PaletteReport;
  charges?: ProsecutorOutput;
  rebuttals?: DefenseOutput;
  votes?: JuryOutput;
  verdict?: JudgeOutput;
  errorMessage?: string;
  onReady: (acceptedRevisions: Revision[], verdictSummary: string) => void;
  readyDisabled?: boolean;
};

export function TrialView({
  brief,
  evidence,
  charges,
  rebuttals,
  votes,
  verdict,
  errorMessage,
  onReady,
  readyDisabled,
}: Props) {
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [statuses, setStatuses] = useState<Record<string, GateStatus>>({});
  const [retried, setRetried] = useState<Record<string, boolean>>({});
  const [retrying, setRetrying] = useState<string | null>(null);

  const activeRevisions = useMemo(
    () => (revisions.length > 0 ? revisions : verdict?.revisions ?? []),
    [revisions, verdict]
  );

  const allDecided = useMemo(() => {
    if (activeRevisions.length === 0) return false;
    return activeRevisions.every((r) => {
      const s = statuses[r.id] ?? "pending";
      return s === "accepted" || s === "locked";
    });
  }, [activeRevisions, statuses]);

  async function handleReject(revision: Revision, feedback: string) {
    setRetrying(revision.id);
    try {
      const res = await fetch("/api/revise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief, revision, feedback }),
      });
      const data = await res.json();
      if (!res.ok) {
        const message = typeof data.error === "string" ? data.error : "Retry failed";
        throw new Error(message);
      }

      const replacement: Revision = data.revision;
      setRevisions((prev) => {
        const base = prev.length > 0 ? prev : verdict?.revisions ?? [];
        return base.map((r) => (r.id === revision.id ? replacement : r));
      });
      setRetried((prev) => ({ ...prev, [replacement.id]: true, [revision.id]: true }));
      setStatuses((prev) => ({ ...prev, [replacement.id]: "pending" }));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setRetrying(null);
    }
  }

  function handleGenerateKit() {
    const accepted = activeRevisions.filter((r) => {
      const s = statuses[r.id] ?? "pending";
      return s === "accepted" || s === "locked";
    });
    onReady(accepted, verdict?.verdictSummary ?? "");
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl">
      {errorMessage && (
        <p className="text-sm text-red-600 border border-red-200 rounded-md p-3 bg-red-50">
          Trial error: {errorMessage}
        </p>
      )}

      {evidence && (
        <Section title="Deterministic evidence (contrast checks)">
          {evidence.failures.length === 0 ? (
            <p className="text-sm text-gray-600">No WCAG contrast failures found.</p>
          ) : (
            <ul className="text-sm text-gray-700 list-disc pl-5">
              {evidence.failures.map((f, i) => (
                <li key={i}>
                  {f.pair} — {f.ratio}:1 ({f.level})
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      {charges && (
        <Section title="Prosecutor: charges">
          <ul className="flex flex-col gap-2">
            {charges.charges.map((c) => (
              <li key={c.id} className="text-sm border-l-2 border-red-400 pl-3">
                <span className="font-medium">
                  [{c.category}/{c.severity}] {c.title}
                </span>
                <p className="text-gray-600">{c.description}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {rebuttals && (
        <Section title="Defense: rebuttals">
          <ul className="flex flex-col gap-2">
            {rebuttals.rebuttals.map((r, i) => (
              <li key={i} className="text-sm border-l-2 border-blue-400 pl-3">
                <p className="text-gray-700">{r.response}</p>
                {r.concession && (
                  <span className="text-xs text-gray-500 italic">conceded</span>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {votes && (
        <Section title="Jury: persona votes">
          <ul className="flex flex-col gap-2">
            {votes.votes.map((v, i) => (
              <li key={i} className="text-sm border-l-2 border-purple-400 pl-3">
                <span className="font-medium">
                  {v.persona} — {v.verdict}
                </span>
                <p className="text-gray-600">{v.justification}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {verdict && (
        <Section title="Judge: verdict and proposed revisions">
          <p className="text-sm text-gray-700 mb-3">{verdict.verdictSummary}</p>
          <div className="flex flex-col gap-3">
            {activeRevisions.map((r) => (
              <RevisionGate
                key={r.id}
                revision={r}
                status={retrying === r.id ? "pending" : statuses[r.id] ?? "pending"}
                retryUsed={!!retried[r.id]}
                onAccept={() => setStatuses((p) => ({ ...p, [r.id]: "accepted" }))}
                onLock={() => setStatuses((p) => ({ ...p, [r.id]: "locked" }))}
                onReject={(feedback) => handleReject(r, feedback)}
              />
            ))}
          </div>

          <button
            onClick={handleGenerateKit}
            disabled={!allDecided || readyDisabled}
            className="mt-4 bg-black text-white rounded-md py-2.5 px-4 font-medium disabled:opacity-40 text-sm"
          >
            {readyDisabled ? "Compiling brand kit..." : "Generate final brand kit"}
          </button>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-500">
        {title}
      </h3>
      {children}
    </div>
  );
}
