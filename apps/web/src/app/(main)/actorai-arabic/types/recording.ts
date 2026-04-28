/**
 * @fileoverview أنواع التسجيلات الصوتية والمرئية
 */

import { z } from "zod";

/**
 * واجهة التسجيل الصوتي/المرئي
 * @description تمثل تسجيلاً واحداً للممثل مع تقييمه
 * @reason تُستخدم لحفظ وعرض تاريخ تسجيلات الممثل مع نتائجها
 */
export interface Recording {
  /** المعرف الفريد للتسجيل */
  id: string;
  /** عنوان التسجيل */
  title: string;
  /** مدة التسجيل بصيغة "دقائق:ثواني" */
  duration: string;
  /** تاريخ التسجيل */
  date: string;
  /** نتيجة تقييم الأداء (0-100) */
  score: number;
}

// مخطط Zod للتحقق من بيانات التسجيل
export const RecordingSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  duration: z.string().regex(/^\d+:\d{2}$/, "صيغة المدة غير صالحة"),
  date: z.string(),
  score: z.number().min(0).max(100),
});
