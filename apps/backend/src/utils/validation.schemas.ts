/**
 * Comprehensive Zod Validation Schemas
 *
 * Centralized validation for all API endpoints
 * Includes UUID validation, input sanitization, and strict type checking
 */

import { z } from "zod";

// Re-export scene & shot schemas extracted to validation.schemas.shots.ts
export {
  sceneStatusSchema,
  createSceneSchema,
  updateSceneSchema,
  sceneIdParamSchema,
  projectIdParamForScenesSchema,
  shotTypeSchema,
  cameraAngleSchema,
  cameraMovementSchema,
  lightingSchema,
  createShotSchema,
  updateShotSchema,
  shotIdParamSchema,
  sceneIdParamForShotsSchema,
} from "./validation.schemas.shots";
export type {
  CreateSceneInput,
  UpdateSceneInput,
  CreateShotInput,
  UpdateShotInput,
} from "./validation.schemas.shots";

// ============================================
// COMMON SCHEMAS
// ============================================

/**
 * UUID validation with proper format checking
 */
export const uuidSchema = z.string().uuid({
  message: "معرّف UUID غير صالح",
});

/**
 * Pagination parameters
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Sort order
 */
export const sortOrderSchema = z
  .enum(["asc", "desc", "ASC", "DESC"])
  .default("desc");

// ============================================
// AUTH SCHEMAS
// ============================================

export const signupSchema = z.object({
  email: z
    .string()
    .email({ message: "البريد الإلكتروني غير صالح" })
    .min(5, { message: "البريد الإلكتروني قصير جداً" })
    .max(255, { message: "البريد الإلكتروني طويل جداً" })
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(8, { message: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" })
    .max(128, { message: "كلمة المرور طويلة جداً" })
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
      message: "كلمة المرور يجب أن تحتوي على حرف كبير وحرف صغير ورقم",
    }),
  firstName: z
    .string()
    .min(1, { message: "الاسم الأول مطلوب" })
    .max(100, { message: "الاسم الأول طويل جداً" })
    .trim()
    .optional(),
  lastName: z
    .string()
    .min(1, { message: "الاسم الأخير مطلوب" })
    .max(100, { message: "الاسم الأخير طويل جداً" })
    .trim()
    .optional(),
});

export const loginSchema = z.object({
  email: z
    .string()
    .email({ message: "البريد الإلكتروني غير صالح" })
    .toLowerCase()
    .trim(),
  password: z.string().min(1, { message: "كلمة المرور مطلوبة" }),
});

// ============================================
// PROJECT SCHEMAS
// ============================================

export const createProjectSchema = z.object({
  title: z
    .string()
    .min(1, { message: "عنوان المشروع مطلوب" })
    .max(500, { message: "عنوان المشروع طويل جداً" })
    .trim(),
  scriptContent: z
    .string()
    .max(1000000, { message: "محتوى السيناريو كبير جداً (الحد الأقصى 1MB)" })
    .optional(),
});

export const updateProjectSchema = z.object({
  title: z
    .string()
    .min(1, { message: "عنوان المشروع مطلوب" })
    .max(500, { message: "عنوان المشروع طويل جداً" })
    .trim()
    .optional(),
  scriptContent: z
    .string()
    .max(1000000, { message: "محتوى السيناريو كبير جداً (الحد الأقصى 1MB)" })
    .optional(),
});

export const projectIdParamSchema = z.object({
  id: uuidSchema,
});

export const analyzeProjectSchema = z.object({
  id: uuidSchema,
});

// ============================================
// CHARACTER SCHEMAS
// ============================================

export const characterConsistencyStatusSchema = z.enum([
  "good",
  "warning",
  "error",
]);

export const createCharacterSchema = z.object({
  projectId: uuidSchema,
  name: z
    .string()
    .min(1, { message: "اسم الشخصية مطلوب" })
    .max(200, { message: "اسم الشخصية طويل جداً" })
    .trim(),
  appearances: z
    .number()
    .int({ message: "عدد الظهورات يجب أن يكون عدد صحيح" })
    .min(0, { message: "عدد الظهورات يجب أن يكون صفر أو موجب" })
    .default(0),
  consistencyStatus: characterConsistencyStatusSchema.default("good"),
  lastSeen: z.string().max(500).optional(),
  notes: z.string().max(5000, { message: "الملاحظات طويلة جداً" }).optional(),
});

export const updateCharacterSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  appearances: z.number().int().min(0).optional(),
  consistencyStatus: characterConsistencyStatusSchema.optional(),
  lastSeen: z.string().max(500).optional(),
  notes: z.string().max(5000).optional(),
});

export const characterIdParamSchema = z.object({
  id: uuidSchema,
});

export const projectIdParamForCharactersSchema = z.object({
  projectId: uuidSchema,
});

// ============================================
// ANALYSIS SCHEMAS
// ============================================

export const analysisTypeSchema = z.enum([
  "characters",
  "themes",
  "structure",
  "screenplay",
]);

export const sevenStationsPipelineSchema = z.object({
  text: z
    .string()
    .min(10, { message: "النص قصير جداً للتحليل" })
    .max(100000, { message: "النص كبير جداً للتحليل (الحد الأقصى 100KB)" }),
  analysisType: analysisTypeSchema.optional(),
});

// ============================================
// QUEUE SCHEMAS
// ============================================

export const jobIdParamSchema = z.object({
  jobId: z.string().min(1, { message: "معرّف المهمة مطلوب" }),
});

export const queueNameParamSchema = z.object({
  queueName: z.enum([
    "ai-analysis",
    "document-processing",
    "notifications",
    "export",
    "cache-warming",
  ]),
});

// ============================================
// METRICS SCHEMAS
// ============================================

export const metricsRangeSchema = z.object({
  start: z.coerce
    .number()
    .int()
    .min(0, { message: "وقت البداية يجب أن يكون موجباً" }),
  end: z.coerce
    .number()
    .int()
    .min(0, { message: "وقت النهاية يجب أن يكون موجباً" }),
});

// ============================================
// EXPORT TYPES
// ============================================

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateCharacterInput = z.infer<typeof createCharacterSchema>;
export type UpdateCharacterInput = z.infer<typeof updateCharacterSchema>;
export type SevenStationsPipelineInput = z.infer<
  typeof sevenStationsPipelineSchema
>;
