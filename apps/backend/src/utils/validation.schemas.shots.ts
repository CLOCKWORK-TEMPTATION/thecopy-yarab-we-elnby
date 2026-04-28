/**
 * Shot & Scene Validation Schemas
 *
 * Extracted from validation.schemas.ts to comply with max-lines rule.
 */

import { z } from "zod";

import { uuidSchema } from "./validation.schemas";

// ============================================
// SCENE SCHEMAS
// ============================================

export const sceneStatusSchema = z.enum([
  "planned",
  "in_progress",
  "completed",
  "review",
  "approved",
]);

export const createSceneSchema = z.object({
  projectId: uuidSchema,
  sceneNumber: z
    .number()
    .int({ message: "رقم المشهد يجب أن يكون عدد صحيح" })
    .min(1, { message: "رقم المشهد يجب أن يكون موجباً" })
    .max(9999, { message: "رقم المشهد كبير جداً" }),
  title: z
    .string()
    .min(1, { message: "عنوان المشهد مطلوب" })
    .max(500, { message: "عنوان المشهد طويل جداً" })
    .trim(),
  location: z
    .string()
    .min(1, { message: "موقع المشهد مطلوب" })
    .max(500, { message: "موقع المشهد طويل جداً" })
    .trim(),
  timeOfDay: z
    .string()
    .min(1, { message: "وقت اليوم مطلوب" })
    .max(100, { message: "وقت اليوم طويل جداً" })
    .trim(),
  characters: z
    .array(z.string().min(1).max(200))
    .min(1, { message: "يجب إضافة شخصية واحدة على الأقل" })
    .max(100, { message: "عدد الشخصيات كبير جداً" }),
  description: z
    .string()
    .max(5000, { message: "وصف المشهد طويل جداً" })
    .optional(),
  status: sceneStatusSchema.default("planned"),
});

export const updateSceneSchema = z.object({
  sceneNumber: z.number().int().min(1).max(9999).optional(),
  title: z.string().min(1).max(500).trim().optional(),
  location: z.string().min(1).max(500).trim().optional(),
  timeOfDay: z.string().min(1).max(100).trim().optional(),
  characters: z.array(z.string().min(1).max(200)).min(1).max(100).optional(),
  description: z.string().max(5000).optional(),
  status: sceneStatusSchema.optional(),
});

export const sceneIdParamSchema = z.object({
  id: uuidSchema,
});

export const projectIdParamForScenesSchema = z.object({
  projectId: uuidSchema,
});

// ============================================
// SHOT SCHEMAS
// ============================================

export const shotTypeSchema = z.enum([
  "wide",
  "medium",
  "closeup",
  "extreme-closeup",
  "over-shoulder",
  "two-shot",
  "establishing",
  "insert",
  "cutaway",
]);

export const cameraAngleSchema = z.enum([
  "eye-level",
  "high-angle",
  "low-angle",
  "birds-eye",
  "dutch-angle",
]);

export const cameraMovementSchema = z.enum([
  "static",
  "pan",
  "tilt",
  "dolly",
  "tracking",
  "crane",
  "handheld",
  "steadicam",
]);

export const lightingSchema = z.enum([
  "natural",
  "high-key",
  "low-key",
  "soft",
  "hard",
  "dramatic",
  "flat",
]);

export const createShotSchema = z.object({
  sceneId: uuidSchema,
  shotNumber: z
    .number()
    .int({ message: "رقم اللقطة يجب أن يكون عدد صحيح" })
    .min(1, { message: "رقم اللقطة يجب أن يكون موجباً" })
    .max(9999, { message: "رقم اللقطة كبير جداً" }),
  shotType: shotTypeSchema,
  cameraAngle: cameraAngleSchema,
  cameraMovement: cameraMovementSchema,
  lighting: lightingSchema,
  aiSuggestion: z
    .string()
    .max(2000, { message: "اقتراح الذكاء الاصطناعي طويل جداً" })
    .optional(),
});

export const updateShotSchema = z.object({
  shotNumber: z.number().int().min(1).max(9999).optional(),
  shotType: shotTypeSchema.optional(),
  cameraAngle: cameraAngleSchema.optional(),
  cameraMovement: cameraMovementSchema.optional(),
  lighting: lightingSchema.optional(),
  aiSuggestion: z.string().max(2000).optional(),
});

export const shotIdParamSchema = z.object({
  id: uuidSchema,
});

export const sceneIdParamForShotsSchema = z.object({
  sceneId: uuidSchema,
});

// ============================================
// EXPORT TYPES
// ============================================

export type CreateSceneInput = z.infer<typeof createSceneSchema>;
export type UpdateSceneInput = z.infer<typeof updateSceneSchema>;
export type CreateShotInput = z.infer<typeof createShotSchema>;
export type UpdateShotInput = z.infer<typeof updateShotSchema>;
