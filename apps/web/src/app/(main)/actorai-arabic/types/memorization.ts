/**
 * @fileoverview أنواع وضع اختبار الحفظ
 */

import { z } from "zod";

/**
 * واجهة إحصائيات الحفظ
 * @description تتبع أداء المستخدم في اختبار الحفظ
 * @reason تساعد على تحديد نقاط الضعف وقياس التقدم في الحفظ
 */
export interface MemorizationStats {
  /** إجمالي المحاولات */
  totalAttempts: number;
  /** عدد الكلمات الصحيحة */
  correctWords: number;
  /** عدد الكلمات الخاطئة */
  incorrectWords: number;
  /** عدد مرات التردد */
  hesitationCount: number;
  /** نقاط الضعف (كلمات يُخطئ فيها كثيراً) */
  weakPoints: string[];
  /** متوسط وقت الاستجابة (بالثواني) */
  averageResponseTime: number;
}

// مخطط Zod للتحقق من إحصائيات الحفظ
export const MemorizationStatsSchema = z.object({
  totalAttempts: z.number().min(0),
  correctWords: z.number().min(0),
  incorrectWords: z.number().min(0),
  hesitationCount: z.number().min(0),
  weakPoints: z.array(z.string()),
  averageResponseTime: z.number().min(0),
});
