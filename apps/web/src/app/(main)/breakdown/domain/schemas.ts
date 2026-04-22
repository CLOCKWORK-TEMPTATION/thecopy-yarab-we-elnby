import { z } from "zod";

const TimeOfDaySchema = z.enum([
  "DAY",
  "NIGHT",
  "DAWN",
  "DUSK",
  "MORNING",
  "EVENING",
  "UNKNOWN",
]);

const SceneTypeSchema = z.enum(["INT", "EXT"]);

export const SceneHeaderDataSchema = z.object({
  sceneNumber: z.number().int().min(1),
  sceneType: SceneTypeSchema,
  location: z.string().min(1, "الموقع مطلوب"),
  timeOfDay: TimeOfDaySchema.default("UNKNOWN"),
  pageCount: z.number().min(0),
  storyDay: z.number().int().min(1).default(1),
  rawHeader: z.string().optional(),
});

export const BreakdownElementSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  category: z.string().min(1),
  description: z.string().min(1),
  color: z.string().min(1),
  notes: z.string().optional(),
});

export const SceneStatsSchema = z.object({
  cast: z.number().int().min(0).default(0),
  extras: z.number().int().min(0).default(0),
  extrasGroups: z.number().int().min(0).default(0),
  silentBits: z.number().int().min(0).default(0),
  props: z.number().int().min(0).default(0),
  handProps: z.number().int().min(0).default(0),
  setDressing: z.number().int().min(0).default(0),
  costumes: z.number().int().min(0).default(0),
  makeup: z.number().int().min(0).default(0),
  sound: z.number().int().min(0).default(0),
  soundRequirements: z.number().int().min(0).default(0),
  equipment: z.number().int().min(0).default(0),
  specialEquipment: z.number().int().min(0).default(0),
  vehicles: z.number().int().min(0).default(0),
  stunts: z.number().int().min(0).default(0),
  animals: z.number().int().min(0).default(0),
  spfx: z.number().int().min(0).default(0),
  vfx: z.number().int().min(0).default(0),
  graphics: z.number().int().min(0).default(0),
  continuity: z.number().int().min(0).default(0),
});

export const CastMemberSchema = z.object({
  name: z.string().min(1, "اسم الشخصية مطلوب"),
  role: z.string().default("Bit Part"),
  age: z.string().default("Unknown"),
  gender: z.string().default("Unknown"),
  description: z.string().default(""),
  motivation: z.string().default(""),
});

export const ExtrasGroupSchema = z.object({
  description: z.string().min(1),
  count: z.number().int().min(0).default(0),
});

export const SceneBreakdownSchema = z.object({
  headerData: SceneHeaderDataSchema.optional(),
  cast: z.array(CastMemberSchema).default([]),
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
  extrasGroups: z.array(ExtrasGroupSchema).default([]),
  props: z.array(z.string()).default([]),
  handProps: z.array(z.string()).default([]),
  silentBits: z.array(z.string()).default([]),
  stunts: z.array(z.string()).default([]),
  animals: z.array(z.string()).default([]),
  spfx: z.array(z.string()).default([]),
  vfx: z.array(z.string()).default([]),
  continuity: z.array(z.string()).default([]),
  continuityNotes: z.array(z.string()).default([]),
  elements: z.array(BreakdownElementSchema).default([]),
  stats: SceneStatsSchema.default({}),
  warnings: z.array(z.string()).default([]),
  summary: z.string().default(""),
  source: z.enum(["ai", "fallback"]).optional(),
});

export const ImpactMetricsSchema = z.object({
  budget: z.number().min(0).max(100),
  schedule: z.number().min(0).max(100),
  risk: z.number().min(0).max(100),
  creative: z.number().min(0).max(100),
});

export const ScenarioOptionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  metrics: ImpactMetricsSchema,
  agentInsights: z.object({
    logistics: z.string().default(""),
    budget: z.string().default(""),
    schedule: z.string().default(""),
    creative: z.string().default(""),
    risk: z.string().default(""),
  }),
  recommended: z.boolean().default(false),
});

export const ScenarioAnalysisSchema = z.object({
  scenarios: z.array(ScenarioOptionSchema).default([]),
});

export const VersionSchema = z.object({
  id: z.string().min(1),
  timestamp: z.number(),
  label: z.string().min(1),
  analysis: SceneBreakdownSchema.optional(),
  scenarios: ScenarioAnalysisSchema.optional(),
  headerData: SceneHeaderDataSchema.optional(),
  stats: SceneStatsSchema.optional(),
  warnings: z.array(z.string()).optional(),
});

export const SceneSchema = z.object({
  id: z.number().int().min(1),
  remoteId: z.string().optional(),
  projectId: z.string().optional(),
  reportId: z.string().optional(),
  header: z.string().min(1, "عنوان المشهد مطلوب"),
  content: z.string().min(1, "محتوى المشهد مطلوب"),
  headerData: SceneHeaderDataSchema.optional(),
  stats: SceneStatsSchema.optional(),
  elements: z.array(BreakdownElementSchema).optional(),
  warnings: z.array(z.string()).optional(),
  source: z.enum(["ai", "fallback"]).optional(),
  isAnalyzed: z.boolean().default(false),
  analysis: SceneBreakdownSchema.optional(),
  scenarios: ScenarioAnalysisSchema.optional(),
  versions: z.array(VersionSchema).optional(),
});

export const ScriptSegmentSceneSchema = z.object({
  header: z.string().min(1),
  content: z.string().min(1),
  headerData: SceneHeaderDataSchema.optional(),
  sceneId: z.string().optional(),
});

export const ScriptSegmentResponseSchema = z.object({
  scenes: z.array(ScriptSegmentSceneSchema).default([]),
});

export const ShootingScheduleItemSchema = z.object({
  sceneId: z.string().min(1),
  sceneNumber: z.number().int().min(1),
  header: z.string().min(1),
  location: z.string().min(1),
  timeOfDay: TimeOfDaySchema,
  estimatedHours: z.number().min(0),
  pageCount: z.number().min(0),
});

export const ShootingScheduleDaySchema = z.object({
  dayNumber: z.number().int().min(1),
  location: z.string().min(1),
  timeOfDay: TimeOfDaySchema,
  scenes: z.array(ShootingScheduleItemSchema).default([]),
  estimatedHours: z.number().min(0),
  totalPages: z.number().min(0),
});

export const BreakdownReportSceneSchema = z.object({
  reportSceneId: z.string().min(1),
  sceneId: z.string().min(1),
  header: z.string().min(1),
  content: z.string().min(1),
  headerData: SceneHeaderDataSchema,
  analysis: SceneBreakdownSchema,
  scenarios: ScenarioAnalysisSchema,
});

export const BreakdownReportSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  title: z.string().min(1),
  generatedAt: z.string().min(1),
  updatedAt: z.string().min(1),
  source: z.literal("backend-breakdown"),
  summary: z.string().default(""),
  warnings: z.array(z.string()).default([]),
  sceneCount: z.number().int().min(0),
  totalPages: z.number().min(0),
  totalEstimatedShootDays: z.number().int().min(0),
  elementsByCategory: z.record(z.number()).default({}),
  schedule: z.array(ShootingScheduleDaySchema).default([]),
  scenes: z.array(BreakdownReportSceneSchema).default([]),
});

export const BreakdownBootstrapResponseSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1),
  parsed: ScriptSegmentResponseSchema,
});

export const AnalysisReportSchema = BreakdownReportSchema;

export type CastMemberInput = z.input<typeof CastMemberSchema>;
export type CastMemberOutput = z.output<typeof CastMemberSchema>;
export type SceneBreakdownInput = z.input<typeof SceneBreakdownSchema>;
export type SceneBreakdownOutput = z.output<typeof SceneBreakdownSchema>;
export type SceneInput = z.input<typeof SceneSchema>;
export type SceneOutput = z.output<typeof SceneSchema>;
export type ScenarioAnalysisInput = z.input<typeof ScenarioAnalysisSchema>;
export type ScenarioAnalysisOutput = z.output<typeof ScenarioAnalysisSchema>;
export type BreakdownReportInput = z.input<typeof BreakdownReportSchema>;
export type BreakdownReportOutput = z.output<typeof BreakdownReportSchema>;
export type AnalysisReportInput = BreakdownReportInput;
export type AnalysisReportOutput = BreakdownReportOutput;

function normalizeError(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join(", ");
}

export function validateScene(
  data: unknown
): { success: true; data: SceneOutput } | { success: false; error: string } {
  const result = SceneSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, error: normalizeError(result.error) };
}

export function validateSceneBreakdown(
  data: unknown
):
  | { success: true; data: SceneBreakdownOutput }
  | { success: false; error: string } {
  const result = SceneBreakdownSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, error: normalizeError(result.error) };
}

export function validateScriptSegmentResponse(
  data: unknown
):
  | { success: true; data: z.output<typeof ScriptSegmentResponseSchema> }
  | { success: false; error: string } {
  const result = ScriptSegmentResponseSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, error: normalizeError(result.error) };
}

export function validateBreakdownReport(
  data: unknown
):
  | { success: true; data: BreakdownReportOutput }
  | { success: false; error: string } {
  const result = BreakdownReportSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, error: normalizeError(result.error) };
}

export const validateAnalysisReport = validateBreakdownReport;
