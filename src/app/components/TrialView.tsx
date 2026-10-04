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
import type { ChargeTally } from "@/lib/checks/tally";
import { roman } from "@/lib/format/roman";
import { trialTranscriptToMarkdown } from "@/lib/export/transcript";
import { RevisionGate, type GateStatus } from "./RevisionGate";

type Props = {
  caseNumber: string;
  brief: BriefInput;
  evidence?: PaletteReport;
  charges?: ProsecutorOutput;
  rebuttals?: DefenseOutput;
  votes?: JuryOutput;
  tally?: ChargeTally[];
  verdict?: JudgeOutput;
  errorMessage?: string;
  onReady: (acceptedRevisions: Revision[], verdictSummary: string) => void;
  readyDisabled?: boolean;
};

export function TrialView({
  caseNumber,
  brief,
  evidence,
  charges,
  rebuttals,
  votes,
  tally,
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
    // Zero revisions only happens once a verdict exists and every charge
    // was dismissed (see orchestrator.ts) — vacuously nothing to decide.
    if (activeRevisions.length === 0) return true;
    return activeRevisions.every((r) => {
      const s = statuses[r.id] ?? "pending";
      return s === "accepted" || s === "locked";
    });
  }, [activeRevisions, statuses]);

  function handleDownloadTranscript() {
    if (!charges || !rebuttals || !votes || !tally || !verdict || !evidence) return;
    const revisionRecords = activeRevisions.map((r) => ({
      revision: r,
      status: statuses[r.id] ?? "pending",
    }));
    const markdown = trialTranscriptToMarkdown({
      caseNumber,
      brief,
      evidence,
      charges,
      rebuttals,
      votes,
      tally,
      verdict,
      revisionRecords,
    });
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${caseNumber}-transcript.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

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
    <div className="flex flex-col gap-8 w-full">
      {errorMessage && (
        <p
          className="text-sm p-3 border"
          style={{
            color: "var(--prosecution)",
            borderColor: "var(--prosecution)",
            background: "var(--prosecution-bg)",
          }}
        >
          The trial could not proceed: {errorMessage}
        </p>
      )}

      {evidence && (
        <Section exhibit="Exhibit A" title="Deterministic Evidence" accent="ink">
          {evidence.failures.length === 0 ? (
            <p className="text-sm text-ink-muted italic">
              No WCAG contrast failures found in the submitted palette.
            </p>
          ) : (
            <ul className="flex flex-col gap-1 font-mono text-[13px]">
              {evidence.failures.map((f, i) => (
                <li key={i} className="text-ink-muted">
                  {f.pair} — <span className="text-ink">{f.ratio}:1</span> ({f.level})
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      {charges && (
        <Section
          exhibit={`Counts I–${roman(charges.charges.length)}`}
          title="Charges of the Prosecution"
          accent="prosecution"
        >
          <ol className="flex flex-col gap-4">
            {charges.charges.map((c, i) => (
              <li key={c.id} className="pl-4" style={{ borderLeft: "2px solid var(--prosecution)" }}>
                <p className="label-caps !text-[0.65rem]" style={{ color: "var(--prosecution)" }}>
                  Count {roman(i + 1)} · {c.category} · {c.severity}
                </p>
                <p className="font-medium text-[15px] mt-0.5">{c.title}</p>
                <p className="text-sm text-ink-muted mt-1 leading-relaxed">{c.description}</p>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {rebuttals && (
        <Section exhibit="Response" title="Answer of the Defense" accent="defense">
          <ol className="flex flex-col gap-4">
            {rebuttals.rebuttals.map((r, i) => (
              <li key={i} className="pl-4" style={{ borderLeft: "2px solid var(--defense)" }}>
                <p className="text-sm leading-relaxed">{r.response}</p>
                {r.concession && (
                  <p className="label-caps !text-[0.62rem] mt-1" style={{ color: "var(--defense)" }}>
                    Conceded
                  </p>
                )}
              </li>
            ))}
          </ol>
        </Section>
      )}

      {votes && (
        <Section exhibit="Deliberation" title="Verdict of the Jury" accent="jury">
          <ol className="flex flex-col gap-4">
            {votes.votes.map((v, i) => (
              <li key={i} className="pl-4" style={{ borderLeft: "2px solid var(--jury)" }}>
                <p className="label-caps !text-[0.65rem]" style={{ color: "var(--jury)" }}>
                  Juror {roman(i + 1)} · {v.persona} · {v.verdict.replace("_", " ")}
                </p>
                <p className="text-sm text-ink-muted mt-1 leading-relaxed">{v.justification}</p>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {tally && charges && (
        <Section exhibit="Exhibit B" title="Tally of the Jury" accent="jury">
          <ul className="flex flex-col gap-1 font-mono text-[13px]">
            {tally.map((t) => {
              const charge = charges.charges.find((c) => c.id === t.chargeId);
              return (
                <li key={t.chargeId} className="text-ink-muted">
                  {charge?.title ?? t.chargeId} —{" "}
                  <span className="text-ink">
                    {t.sustain} sustain / {t.dismiss} dismiss
                  </span>{" "}
                  →{" "}
                  <span
                    className="uppercase"
                    style={{
                      color:
                        t.outcome === "sustained"
                          ? "var(--prosecution)"
                          : t.outcome === "dismissed"
                          ? "var(--defense)"
                          : "var(--verdict)",
                    }}
                  >
                    {t.outcome}
                  </span>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {verdict && (
        <Section exhibit="Final Order" title="Ruling of the Court" accent="verdict">
          <p className="text-sm leading-relaxed mb-5">{verdict.verdictSummary}</p>

          {activeRevisions.length === 0 ? (
            <p className="text-sm text-ink-muted italic mb-5">
              Every charge was dismissed — the brand stands as submitted, nothing to revise.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
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
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleDownloadTranscript}
              className="stamp-button stamp-lock py-3 px-4"
            >
              Download Transcript
            </button>
            <button
              onClick={handleGenerateKit}
              disabled={!allDecided || readyDisabled}
              className="btn-primary py-3 px-6 flex-1"
            >
              {readyDisabled ? "Compiling Brand Kit…" : "Enter Final Judgment"}
            </button>
          </div>
        </Section>
      )}
    </div>
  );
}

const ACCENT_VAR: Record<string, string> = {
  ink: "var(--ink)",
  prosecution: "var(--prosecution)",
  defense: "var(--defense)",
  jury: "var(--jury)",
  verdict: "var(--verdict)",
};

function Section({
  exhibit,
  title,
  accent,
  children,
}: {
  exhibit: string;
  title: string;
  accent: keyof typeof ACCENT_VAR;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3 border-b pb-2 rule-hairline">
        <h3 className="font-display text-lg" style={{ color: ACCENT_VAR[accent] }}>
          {title}
        </h3>
        <span className="label-caps !text-[0.62rem] whitespace-nowrap">{exhibit}</span>
      </div>
      {children}
    </section>
  );
}
