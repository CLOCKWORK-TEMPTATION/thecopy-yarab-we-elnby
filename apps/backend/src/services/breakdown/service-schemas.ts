import { z } from "zod";

export const impactMetricsSchema = z.object({
  budget: z.number().default(0),
  schedule: z.number().default(0),
  risk: z.number().default(0),
  creative: z.number().default(0),
});

export const scenarioAnalysisSchema = z.object({
  scenarios: z
    .array(
      z.object({
        id: z.string().default("scenario"),
        name: z.string().default("خيار إنتاجي"),
        description: z.string().default(""),
        metrics: impactMetricsSchema,
        agentInsights: z.object({
          logistics: z.string().default(""),
          budget: z.string().default(""),
          schedule: z.string().default(""),
          creative: z.string().default(""),
          risk: z.string().default(""),
        }),
        recommended: z.boolean().default(false),
      }),
    )
    .default([]),
});

const aiCastSchema = z.object({
  name: z.string().default("شخصية غير مسماة"),
  role: z.string().default("Bit Part"),
  age: z.string().default("Unknown"),
  gender: z.string().default("Unknown"),
  description: z.string().default(""),
  motivation: z.string().default(""),
});

const extrasGroupSchema = z.object({
  description: z.string().default(""),
  count: z.number().int().default(0),
});

export const aiBreakdownSchema = z.object({
  summary: z.string().default(""),
  warnings: z.array(z.string()).default([]),
  cast: z.array(aiCastSchema).default([]),
  costumes: z.array(z.string()).default([]),
  makeup: z.array(z.string()).default([]),
  setDressing: z.array(z.string()).default([]),
  graphics: z.array(z.string()).default([]),
  sound: z.array(z.string()).default([]),
  soundRequirements: z.array(z.string()).default([]),
  equipment: z.array(z.string()).default([]),
  specialEquipment: z.array(z.string()).default([]),
  vehicles: z.array(z.string()).default([]),
  locations: z.array(z.string()).default([]),
  extras: z.array(z.string()).default([]),
  extrasGroups: z.array(extrasGroupSchema).default([]),
  props: z.array(z.string()).default([]),
  handProps: z.array(z.string()).default([]),
  silentBits: z.array(z.string()).default([]),
  stunts: z.array(z.string()).default([]),
  animals: z.array(z.string()).default([]),
  spfx: z.array(z.string()).default([]),
  vfx: z.array(z.string()).default([]),
  continuity: z.array(z.string()).default([]),
  continuityNotes: z.array(z.string()).default([]),
  scenarios: scenarioAnalysisSchema.default({ scenarios: [] }),
});

export type AiBreakdownData = z.infer<typeof aiBreakdownSchema>;
