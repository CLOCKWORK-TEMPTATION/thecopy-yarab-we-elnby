/**
 * @fileoverview أنواع النص/السيناريو
 */

import { z } from "zod";

/**
 * حالة النص في النظام
 * @description تحدد المرحلة الحالية لمعالجة النص
 */
export type ScriptStatus = "analyzed" | "processing" | "pending";

/**
 * واجهة النص/السيناريو
 * @description تمثل نصاً مرفوعاً في النظام مع بياناته الوصفية
 * @reason تُستخدم لإدارة مكتبة النصوص وعرض حالة كل نص
 */
export interface Script {
  /** المعرف الفريد للنص */
  id: string;
  /** عنوان النص */
  title: string;
  /** اسم المؤلف */
  author: string;
  /** محتوى النص الكامل */
  content: string;
  /** تاريخ رفع النص */
  uploadDate: string;
  /** حالة معالجة النص */
  status: ScriptStatus;
}

// مخطط Zod للتحقق من بيانات النص
export const ScriptSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1, "عنوان النص مطلوب"),
  author: z.string().min(1, "اسم المؤلف مطلوب"),
  content: z.string().min(10, "محتوى النص قصير جداً"),
  uploadDate: z.string(),
  status: z.enum(["analyzed", "processing", "pending"]),
});
