export type RGB = { r: number; g: number; b: number };

export function normalizeHex(hex: string): string {
  const h = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return `#${h.toLowerCase()}`;
}

export function hexToRgb(hex: string): RGB {
  const h = normalizeHex(hex).slice(1);
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function channelToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function relativeLuminance({ r, g, b }: RGB): number {
  const [rl, gl, bl] = [channelToLinear(r), channelToLinear(g), channelToLinear(b)];
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

export function contrastRatio(hexA: string, hexB: string): number {
  const lA = relativeLuminance(hexToRgb(hexA));
  const lB = relativeLuminance(hexToRgb(hexB));
  const lighter = Math.max(lA, lB);
  const darker = Math.min(lA, lB);
  return (lighter + 0.05) / (darker + 0.05);
}

export type WcagLevel = "AAA" | "AA" | "AA-large" | "fail";

export function wcagLevel(ratio: number): WcagLevel {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA-large";
  return "fail";
}

export type ContrastFinding = {
  colorA: string;
  colorB: string;
  ratio: number;
  level: WcagLevel;
  pair: string;
};

export type PaletteReport = {
  findings: ContrastFinding[];
  failures: ContrastFinding[];
};

/**
 * Deterministic evidence: checks every palette color against pure white and
 * pure black (common text/background pairings) plus every pairwise
 * combination within the palette itself. This output is fed to the
 * Prosecutor agent as admissible evidence — the LLM never computes ratios.
 */
export function evaluatePalette(hexes: string[]): PaletteReport {
  const colors = hexes.map(normalizeHex);
  const findings: ContrastFinding[] = [];

  const anchors: Array<[string, string]> = [
    ["#ffffff", "white background"],
    ["#000000", "black background"],
  ];

  for (const color of colors) {
    for (const [anchorHex, label] of anchors) {
      const ratio = contrastRatio(color, anchorHex);
      findings.push({
        colorA: color,
        colorB: anchorHex,
        ratio: Math.round(ratio * 100) / 100,
        level: wcagLevel(ratio),
        pair: `${color} on ${label}`,
      });
    }
  }

  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      const ratio = contrastRatio(colors[i], colors[j]);
      findings.push({
        colorA: colors[i],
        colorB: colors[j],
        ratio: Math.round(ratio * 100) / 100,
        level: wcagLevel(ratio),
        pair: `${colors[i]} on ${colors[j]}`,
      });
    }
  }

  return {
    findings,
    failures: findings.filter((f) => f.level === "fail"),
  };
}
