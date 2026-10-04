"use client";

import { useEffect, useState } from "react";
import { BriefForm } from "./components/BriefForm";
import { TrialView } from "./components/TrialView";
import { BrandKitView } from "./components/BrandKitView";
import type { BriefInput } from "@/lib/schemas/brief";
import type {
  ProsecutorOutput,
  DefenseOutput,
  JuryOutput,
  JudgeOutput,
  Revision,
  BrandKit,
} from "@/lib/schemas/trial";
import type { PaletteReport } from "@/lib/checks/contrast";
import type { TrialEvent } from "@/lib/trial/orchestrator";

type Phase = "brief" | "trial" | "kit";

function makeCaseNumber() {
  const now = new Date();
  const stamp = now.toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = Math.floor(Math.random() * 900 + 100);
  return `BC-${stamp}-${suffix}`;
}

export default function Home() {
  // Deferred to after mount: computing this during render would mismatch
  // between the server-rendered HTML and the client's hydration pass.
  // suppressHydrationWarning doesn't cover this (the text has sibling
  // nodes, not one bare string child), so this is the real fix, not a
  // style choice — the lint rule's cascading-render concern doesn't apply
  // to a single cosmetic value set once on mount.
  const [caseNumber, setCaseNumber] = useState("—");
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setCaseNumber(makeCaseNumber()), []);

  const [phase, setPhase] = useState<Phase>("brief");
  const [brief, setBrief] = useState<BriefInput | null>(null);
  const [trialLoading, setTrialLoading] = useState(false);
  const [kitLoading, setKitLoading] = useState(false);
  const [kit, setKit] = useState<BrandKit | null>(null);

  const [evidence, setEvidence] = useState<PaletteReport>();
  const [charges, setCharges] = useState<ProsecutorOutput>();
  const [rebuttals, setRebuttals] = useState<DefenseOutput>();
  const [votes, setVotes] = useState<JuryOutput>();
  const [verdict, setVerdict] = useState<JudgeOutput>();
  const [errorMessage, setErrorMessage] = useState<string>();

  async function startTrial(input: BriefInput) {
    setBrief(input);
    setPhase("trial");
    setTrialLoading(true);
    setEvidence(undefined);
    setCharges(undefined);
    setRebuttals(undefined);
    setVotes(undefined);
    setVerdict(undefined);
    setErrorMessage(undefined);

    try {
      const res = await fetch("/api/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data?.error ? JSON.stringify(data.error) : "Trial request failed"
        );
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";

        for (const chunk of chunks) {
          const line = chunk.trim();
          if (!line.startsWith("data:")) continue;
          const event: TrialEvent = JSON.parse(line.slice(5).trim());
          applyEvent(event);
        }
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Trial failed");
    } finally {
      setTrialLoading(false);
    }
  }

  function applyEvent(event: TrialEvent) {
    switch (event.type) {
      case "evidence":
        setEvidence(event.data);
        break;
      case "charges":
        setCharges(event.data);
        break;
      case "rebuttals":
        setRebuttals(event.data);
        break;
      case "votes":
        setVotes(event.data);
        break;
      case "verdict":
        setVerdict(event.data);
        break;
      case "error":
        setErrorMessage(event.data.message);
        break;
    }
  }

  async function generateKit(acceptedRevisions: Revision[], verdictSummary: string) {
    if (!brief) return;
    setKitLoading(true);
    try {
      const res = await fetch("/api/brand-kit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief, acceptedRevisions, verdictSummary }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Brand kit compilation failed");
      setKit(data);
      setPhase("kit");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Brand kit failed");
    } finally {
      setKitLoading(false);
    }
  }

  function restart() {
    setPhase("brief");
    setBrief(null);
    setKit(null);
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-10 sm:py-16">
      <div className="case-card w-full max-w-2xl px-6 py-8 sm:px-12 sm:py-12 flex flex-col items-center gap-10">
        <header className="text-center flex flex-col items-center gap-3 w-full">
          <p className="label-caps">In the Matter of Your Brand</p>
          <h1 className="font-display text-4xl sm:text-5xl tracking-tight">
            Brand Court
          </h1>
          <div className="rule-double w-24 my-1" />
          <p className="text-[15px] leading-relaxed text-ink-muted max-w-md italic">
            A Prosecutor files charges, Defense rebuts, a jury of target-customer
            personas votes, and a Judge proposes revisions — you approve every
            change before it ships.
          </p>
          <p className="label-caps !text-[0.65rem] opacity-70 mt-1">Case No. {caseNumber}</p>
        </header>

        {phase === "brief" && <BriefForm onSubmit={startTrial} disabled={trialLoading} />}

        {phase === "trial" && brief && (
          <TrialView
            brief={brief}
            evidence={evidence}
            charges={charges}
            rebuttals={rebuttals}
            votes={votes}
            verdict={verdict}
            errorMessage={errorMessage}
            onReady={generateKit}
            readyDisabled={kitLoading}
          />
        )}

        {phase === "kit" && kit && <BrandKitView kit={kit} onRestart={restart} />}
      </div>
    </main>
  );
}
