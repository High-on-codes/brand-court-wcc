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

export function RevisionGate({ revision, status, retryUsed, onAccept, onLock, onReject }: Props) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState("");

  const decided = status === "accepted" || status === "locked";

  return (
    <div className="border rounded-md p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-medium text-sm">{revision.title}</h4>
        <span
          className={`text-xs rounded-full px-2 py-0.5 ${
            status === "accepted"
              ? "bg-green-100 text-green-800"
              : status === "locked"
              ? "bg-blue-100 text-blue-800"
              : status === "rejected"
              ? "bg-red-100 text-red-800"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          {status}
        </span>
      </div>
      <p className="text-sm text-gray-700">{revision.description}</p>
      {revision.before && (
        <p className="text-xs text-gray-500">
          <span className="font-medium">Before:</span> {revision.before}
        </p>
      )}
      <p className="text-xs text-gray-800">
        <span className="font-medium">Proposed:</span> {revision.after}
      </p>

      {!decided && (
        <div className="flex flex-col gap-2 mt-1">
          <div className="flex gap-2">
            <button
              onClick={onAccept}
              className="text-xs bg-green-600 text-white rounded px-3 py-1.5"
            >
              Accept
            </button>
            <button
              onClick={onLock}
              className="text-xs bg-blue-600 text-white rounded px-3 py-1.5"
            >
              Lock
            </button>
            {!retryUsed && (
              <button
                onClick={() => setShowFeedback((s) => !s)}
                className="text-xs bg-red-600 text-white rounded px-3 py-1.5"
              >
                Reject
              </button>
            )}
          </div>
          {showFeedback && (
            <div className="flex gap-2">
              <input
                className="border rounded text-xs px-2 py-1.5 flex-1"
                placeholder="What should change?"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
              <button
                className="text-xs bg-black text-white rounded px-3 py-1.5 disabled:opacity-50"
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
        <p className="text-xs text-gray-500 italic">
          Retry already used for this revision — accept or lock to continue.
        </p>
      )}
    </div>
  );
}
