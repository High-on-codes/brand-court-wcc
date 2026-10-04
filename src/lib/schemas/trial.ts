import { z } from "zod";

export const ChargeCategory = z.enum([
  "positioning",
  "differentiation",
  "accessibility",
  "voice",
]);

export const ChargeSchema = z.object({
  id: z.string(),
  category: ChargeCategory,
  title: z.string(),
  description: z.string(),
  severity: z.enum(["minor", "moderate", "major"]),
  evidence: z.array(z.string()).default([]),
});
export type Charge = z.infer<typeof ChargeSchema>;

export const ProsecutorOutputSchema = z.object({
  charges: z.array(ChargeSchema).min(1).max(6),
});
export type ProsecutorOutput = z.infer<typeof ProsecutorOutputSchema>;

export const RebuttalSchema = z.object({
  chargeId: z.string(),
  response: z.string(),
  concession: z.boolean(),
});
export type Rebuttal = z.infer<typeof RebuttalSchema>;

export const DefenseOutputSchema = z.object({
  rebuttals: z.array(RebuttalSchema).min(1),
});
export type DefenseOutput = z.infer<typeof DefenseOutputSchema>;

export const ChargeVoteSchema = z.object({
  chargeId: z.string(),
  sustain: z.boolean(),
});
export type ChargeVote = z.infer<typeof ChargeVoteSchema>;

export const PersonaVoteSchema = z.object({
  persona: z.string(),
  verdict: z.enum(["guilty", "not_guilty", "mixed"]),
  justification: z.string(),
  // One sustain/dismiss call per charge, from this juror — the deterministic
  // basis for the tally in lib/checks/tally.ts. `verdict` above stays a free
  // overall impression for narrative color; this is the structured ballot.
  chargeVotes: z.array(ChargeVoteSchema).min(1),
});
export type PersonaVote = z.infer<typeof PersonaVoteSchema>;

export const JuryOutputSchema = z.object({
  votes: z.array(PersonaVoteSchema).min(2).max(3),
});
export type JuryOutput = z.infer<typeof JuryOutputSchema>;

export const RevisionSchema = z.object({
  id: z.string(),
  chargeId: z.string(),
  title: z.string(),
  description: z.string(),
  before: z.string().optional(),
  after: z.string(),
});
export type Revision = z.infer<typeof RevisionSchema>;

export const JudgeOutputSchema = z.object({
  verdictSummary: z.string(),
  revisions: z.array(RevisionSchema).min(1),
});
export type JudgeOutput = z.infer<typeof JudgeOutputSchema>;

export const RevisionRetrySchema = z.object({
  revision: RevisionSchema,
});
export type RevisionRetry = z.infer<typeof RevisionRetrySchema>;

export const GateStatus = z.enum(["pending", "accepted", "rejected", "locked"]);
export type GateStatusType = z.infer<typeof GateStatus>;

export const BrandKitSchema = z.object({
  palette: z.array(
    z.object({
      hex: z.string(),
      role: z.string(),
      contrastNote: z.string(),
    })
  ),
  typePairing: z.object({
    heading: z.string(),
    body: z.string(),
    rationale: z.string(),
  }),
  voiceRules: z.array(z.string()),
  tagline: z.string(),
});
export type BrandKit = z.infer<typeof BrandKitSchema>;
