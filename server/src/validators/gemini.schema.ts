import { z } from "zod";

/**
 * Zod schema for validating Gemini AI responses.
 * We NEVER trust `as AnalysisResult` — the AI could return malformed JSON,
 * missing fields, or wrong types. Zod catches all of that at runtime.
 */

const ScoreSchema = z
  .number()
  .superRefine((val, ctx) => {
    // Valid values are either 0 <= val <= 1, or 2 <= val <= 100 (percentage)
    if (val < 0 || (val > 1 && val < 2) || val > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Score must be within 0-1 range or 2-100 percentage range",
      });
    }
  })
  .transform((val) => (val > 1 ? Number((val / 100).toFixed(3)) : Number(val.toFixed(3))));

const PrioritizedTaskSchema = z.object({
  id: z.string(),
  originalItemId: z.string(),
  title: z.string(),
  summary: z.string().default(""),
  urgencyScore: ScoreSchema,
  importanceScore: ScoreSchema,
  reason: z.string().default("High business priority requiring prompt triage"),
  suggestedAction: z.string().default("Review item and resolve with team"),
  category: z
    .enum([
      "Email Action",
      "Meeting",
      "Blocker",
      "Bug",
      "Client",
      "Internal",
      "Project",
      "Admin",
    ])
    .catch("Email Action"),
});

const ItemClassificationSchema = z.object({
  itemId: z.string(),
  category: z.enum(["Urgent", "Important", "Routine", "Noise"]),
});

export const AnalysisResultSchema = z.object({
  topPriorities: z.array(PrioritizedTaskSchema).min(0).max(10),
  productivityScore: z.number().min(0).max(100),
  distribution: z.object({
    urgent: z.number().min(0),
    important: z.number().min(0),
    routine: z.number().min(0),
    noise: z.number().min(0),
  }),
  itemClassifications: z.array(ItemClassificationSchema),
  lowConfidence: z.boolean().default(false),
});

export type ValidatedAnalysisResult = z.infer<typeof AnalysisResultSchema>;
