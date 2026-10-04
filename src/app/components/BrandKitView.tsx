"use client";

import type { BrandKit } from "@/lib/schemas/trial";
import { brandKitToMarkdown } from "@/lib/export/markdown";

type Props = {
  kit: BrandKit;
  onRestart: () => void;
};

export function BrandKitView({ kit, onRestart }: Props) {
  function handleDownload() {
    const markdown = brandKitToMarkdown(kit);
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "brand-kit.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-5 w-full max-w-xl">
      <h2 className="text-lg font-semibold">Approved brand kit</h2>

      <div>
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">
          Tagline
        </h3>
        <p className="text-sm">{kit.tagline}</p>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
          Palette
        </h3>
        <div className="flex flex-col gap-2">
          {kit.palette.map((p, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <span
                className="w-6 h-6 rounded border inline-block shrink-0"
                style={{ backgroundColor: p.hex }}
              />
              <span className="font-mono">{p.hex}</span>
              <span className="text-gray-600">{p.role}</span>
              <span className="text-gray-400 text-xs">{p.contrastNote}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">
          Type pairing
        </h3>
        <p className="text-sm">
          Heading: <span className="font-medium">{kit.typePairing.heading}</span> · Body:{" "}
          <span className="font-medium">{kit.typePairing.body}</span>
        </p>
        <p className="text-xs text-gray-500 mt-1">{kit.typePairing.rationale}</p>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">
          Voice rules
        </h3>
        <ul className="list-disc pl-5 text-sm">
          {kit.voiceRules.map((rule, i) => (
            <li key={i}>{rule}</li>
          ))}
        </ul>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleDownload}
          className="bg-black text-white rounded-md py-2 px-4 text-sm font-medium"
        >
          Download Markdown
        </button>
        <button
          onClick={onRestart}
          className="border rounded-md py-2 px-4 text-sm font-medium"
        >
          New trial
        </button>
      </div>
    </div>
  );
}
