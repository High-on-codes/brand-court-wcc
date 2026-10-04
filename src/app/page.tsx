"use client";

import { useState } from "react";
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

export default function Home() {
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
    <main className="min-h-screen flex flex-col items-center gap-8 px-6 py-12">
      <header className="text-center flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Brand Court</h1>
        <p className="text-sm text-gray-500 max-w-md">
          Put your brand on trial. A Prosecutor files charges, Defense rebuts, a
          jury of target-customer personas votes, and a Judge proposes revisions —
          you approve every change before it ships.
        </p>
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
    </main>
  );
}
