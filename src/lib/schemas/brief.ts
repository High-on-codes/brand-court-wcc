import { z } from "zod";

export const BriefInputSchema = z.object({
  brief: z.string().min(20, "Describe the brand in at least 20 characters."),
  tagline: z.string().max(140).optional(),
  paletteHex: z
    .array(z.string().regex(/^#?[0-9a-fA-F]{6}$/, "Use 6-digit hex codes"))
    .max(8)
    .default([]),
  siteUrl: z.string().url().optional().or(z.literal("")),
});

export type BriefInput = z.infer<typeof BriefInputSchema>;
