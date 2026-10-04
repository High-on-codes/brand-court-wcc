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
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full">
      <p className="label-caps text-center">Filing for Review</p>

      <Field label="Brand brief" required htmlFor="brief">
        <textarea
          id="brief"
          required
          minLength={20}
          rows={5}
          className="field-input resize-none"
          placeholder="What does your brand do, who is it for, and what makes it different?"
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
        />
      </Field>

      <Field label="Tagline" htmlFor="tagline">
        <input
          id="tagline"
          className="field-input"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
        />
      </Field>

      <Field label="Palette (hex, comma separated)" htmlFor="palette">
        <input
          id="palette"
          className="field-input font-mono text-[13px]"
          placeholder="#1a1a1a, #f5a623, #ffffff"
          value={paletteText}
          onChange={(e) => setPaletteText(e.target.value)}
        />
      </Field>

      <Field label="Site URL" htmlFor="siteUrl">
        <input
          id="siteUrl"
          type="url"
          className="field-input"
          placeholder="https://"
          value={siteUrl}
          onChange={(e) => setSiteUrl(e.target.value)}
        />
      </Field>

      {error && (
        <p className="text-sm" style={{ color: "var(--prosecution)" }}>
          {error}
        </p>
      )}

      <button type="submit" disabled={disabled} className="btn-primary py-3 mt-2">
        {disabled ? "Court is in session…" : "File for Trial"}
      </button>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="label-caps">
        {label} {required && <span style={{ color: "var(--prosecution)" }}>*</span>}
      </label>
      {children}
    </div>
  );
}
