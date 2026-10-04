"use client";

import { useState } from "react";
import type { BriefInput } from "@/lib/schemas/brief";

type Props = {
  onSubmit: (brief: BriefInput) => void;
  disabled?: boolean;
};

export function BriefForm({ onSubmit, disabled }: Props) {
  const [brief, setBrief] = useState("");
  const [tagline, setTagline] = useState("");
  const [paletteText, setPaletteText] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (brief.trim().length < 20) {
      setError("Brand brief needs at least 20 characters.");
      return;
    }

    const paletteHex = paletteText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    for (const hex of paletteHex) {
      if (!/^#?[0-9a-fA-F]{6}$/.test(hex)) {
        setError(`"${hex}" isn't a 6-digit hex color.`);
        return;
      }
    }

    onSubmit({
      brief: brief.trim(),
      tagline: tagline.trim() || undefined,
      paletteHex,
      siteUrl: siteUrl.trim() || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full max-w-xl">
      <div className="flex flex-col gap-1">
        <label htmlFor="brief" className="font-medium text-sm">
          Brand brief <span className="text-red-600">*</span>
        </label>
        <textarea
          id="brief"
          required
          minLength={20}
          rows={5}
          className="border rounded-md p-3 text-sm"
          placeholder="What does your brand do, who is it for, and what makes it different?"
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="tagline" className="font-medium text-sm">
          Tagline (optional)
        </label>
        <input
          id="tagline"
          className="border rounded-md p-2 text-sm"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="palette" className="font-medium text-sm">
          Palette hex codes, comma separated (optional)
        </label>
        <input
          id="palette"
          className="border rounded-md p-2 text-sm font-mono"
          placeholder="#1a1a1a, #f5a623, #ffffff"
          value={paletteText}
          onChange={(e) => setPaletteText(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="siteUrl" className="font-medium text-sm">
          Site URL (optional)
        </label>
        <input
          id="siteUrl"
          type="url"
          className="border rounded-md p-2 text-sm"
          placeholder="https://"
          value={siteUrl}
          onChange={(e) => setSiteUrl(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={disabled}
        className="bg-black text-white rounded-md py-2.5 font-medium disabled:opacity-50"
      >
        {disabled ? "Trial in session..." : "Put it on trial"}
      </button>
    </form>
  );
}
