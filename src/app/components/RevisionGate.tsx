"use client";

import { useState } from "react";
import type { Revision } from "@/lib/schemas/trial";

export type GateStatus = "pending" | "accepted" | "rejected" | "locked";

type Props = {
  revision: Revision;
  status: GateStatus;
  retryUsed: boolean;
  onAccept: () => void;
  onLock: () => void;
  onReject: (feedback: string) => void;
};

const STATUS_LABEL: Record<GateStatus, string> = {
  pending: "Pending",
  accepted: "Approved",
  locked: "Sealed",
  rejected: "Returned",
};

const STATUS_COLOR: Record<GateStatus, string> = {
  pending: "var(--ink-muted)",
  accepted: "var(--stamp-accept)",
  locked: "var(--stamp-lock)",
  rejected: "var(--stamp-reject)",
};

export function RevisionGate({ revision, status, retryUsed, onAccept, onLock, onReject }: Props) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState("");

  const decided = status === "accepted" || status === "locked";

  return (
    <div className="case-card p-4 flex flex-col gap-2.5">
      <div className="flex items-start justify-between gap-3">
        <h4 className="font-display text-base leading-snug">{revision.title}</h4>
        <span
          className="label-caps !text-[0.6rem] whitespace-nowrap border px-2 py-0.5"
          style={{ color: STATUS_COLOR[status], borderColor: STATUS_COLOR[status] }}
        >
          {STATUS_LABEL[status]}
        </span>
      </div>
      <p className="text-sm text-ink-muted leading-relaxed">{revision.description}</p>
      {revision.before && (
        <p className="text-xs text-ink-muted">
          <span className="label-caps !text-[0.6rem]">Before </span>
          {revision.before}
        </p>
      )}
      <p className="text-xs">
        <span className="label-caps !text-[0.6rem]">Ordered </span>
        {revision.after}
      </p>

      {!decided && (
        <div className="flex flex-col gap-2 mt-1 pt-2 border-t rule-hairline">
          <div className="flex gap-2 flex-wrap">
            <button onClick={onAccept} className="stamp-button stamp-accept px-3 py-1.5">
              Accept
            </button>
            <button onClick={onLock} className="stamp-button stamp-lock px-3 py-1.5">
              Lock
            </button>
            {!retryUsed && (
              <button
                onClick={() => setShowFeedback((s) => !s)}
                className="stamp-button stamp-reject px-3 py-1.5"
              >
                Reject
              </button>
            )}
          </div>
          {showFeedback && (
            <div className="flex gap-2">
              <input
                className="field-input text-xs flex-1"
                placeholder="What should change?"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
              <button
                className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50"
                disabled={!feedback.trim()}
                onClick={() => {
                  onReject(feedback.trim());
                  setShowFeedback(false);
                  setFeedback("");
                }}
              >
                Send for one retry
              </button>
            </div>
          )}
        </div>
      )}
      {retryUsed && status === "pending" && (
        <p className="text-xs text-ink-muted italic pt-1">
          Retry already used for this revision — accept or lock to continue.
        </p>
      )}
    </div>
  );
}
