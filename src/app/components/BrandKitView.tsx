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
    <div className="flex flex-col gap-7 w-full">
      <div className="text-center flex flex-col items-center gap-2">
        <p className="label-caps" style={{ color: "var(--verdict)" }}>
          Entered into the Record
        </p>
        <h2 className="font-display text-2xl">Certificate of Brand Kit</h2>
        <div className="rule-double w-16 my-1" />
      </div>

      <div>
        <p className="label-caps mb-1.5">Tagline</p>
        <p className="font-display text-xl italic">&ldquo;{kit.tagline}&rdquo;</p>
      </div>

      <div>
        <p className="label-caps mb-2">Palette</p>
        <div className="flex flex-col gap-2.5">
          {kit.palette.map((p, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <span
                className="w-7 h-7 border shrink-0 rule-hairline"
                style={{ backgroundColor: p.hex }}
              />
              <span className="font-mono text-[13px]">{p.hex}</span>
              <span className="text-ink-muted">{p.role}</span>
              <span className="text-ink-muted text-xs italic hidden sm:inline">
                {p.contrastNote}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="label-caps mb-1">Type Pairing</p>
        <p className="text-sm">
          Heading: <span className="font-display">{kit.typePairing.heading}</span> · Body:{" "}
          <span className="italic">{kit.typePairing.body}</span>
        </p>
        <p className="text-xs text-ink-muted mt-1 leading-relaxed">
          {kit.typePairing.rationale}
        </p>
      </div>

      <div>
        <p className="label-caps mb-1.5">Voice Rules</p>
        <ol className="flex flex-col gap-1.5">
          {kit.voiceRules.map((rule, i) => (
            <li key={i} className="text-sm pl-4" style={{ borderLeft: "2px solid var(--verdict)" }}>
              {rule}
            </li>
          ))}
        </ol>
      </div>

      <div className="flex gap-3 pt-2 border-t rule-hairline">
        <button onClick={handleDownload} className="btn-primary py-2.5 px-4 flex-1">
          Download Markdown
        </button>
        <button onClick={onRestart} className="stamp-button stamp-lock py-2.5 px-4">
          New Trial
        </button>
      </div>
    </div>
  );
}
