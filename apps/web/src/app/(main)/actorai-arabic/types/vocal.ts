/**
 * @fileoverview أنواع تمارين الصوت
 */

import { z } from "zod";

/**
 * فئة التمرين الصوتي
 */
export type ExerciseCategory =
  | "breathing"
  | "articulation"
  | "projection"
  | "resonance";

/**
 * واجهة التمرين الصوتي
 * @description تمثل تمريناً صوتياً واحداً مع تفاصيله
 * @reason توفر هيكلاً موحداً لعرض وإدارة التمارين الصوتية
 */
export interface VocalExercise {
  /** المعرف الفريد للتمرين */
  id: string;
  /** اسم التمرين */
  name: string;
  /** وصف تفصيلي للتمرين وكيفية تنفيذه */
  description: string;
  /** المدة المقترحة للتمرين */
  duration: string;
  /** فئة التمرين */
  category: ExerciseCategory;
}

// مخطط Zod للتحقق من بيانات التمرين
export const VocalExerciseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(10),
  duration: z.string(),
  category: z.enum(["breathing", "articulation", "projection", "resonance"]),
});
