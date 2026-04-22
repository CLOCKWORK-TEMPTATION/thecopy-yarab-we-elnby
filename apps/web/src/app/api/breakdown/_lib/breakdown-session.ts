/**
 * مخزن جلسات مؤقت لمشاريع تحليل السيناريو
 *
 * يُستخدم هذا المخزن لحفظ بيانات السيناريو المُجزَّأة بين خطوتَي:
 * 1. bootstrap (تجزئة النص)
 * 2. analyze (التحليل بالذكاء الاصطناعي)
 *
 * لا يحتاج إلى قاعدة بيانات — يعتمد على الذاكرة المؤقتة (Map) مع مهلة انتهاء صلاحية.
 */

import type { ScriptSegmentResponse } from "@/app/(main)/breakdown/domain/models";

/** مدة صلاحية الجلسة: 30 دقيقة */
const SESSION_TTL_MS = 30 * 60 * 1000;

/** بنية جلسة مشروع البريك دون */
export interface BreakdownProjectSession {
  /** المعرف الفريد للمشروع */
  projectId: string;
  /** عنوان المشروع */
  title: string;
  /** نص السيناريو الأصلي */
  scriptContent: string;
  /** نتيجة التجزئة المحلية للسيناريو */
  parsed: ScriptSegmentResponse;
  /** وقت إنشاء الجلسة بالميلي ثانية */
  createdAt: number;
}

/** المخزن الداخلي — Map في ذاكرة السيرفر */
const sessionStore = new Map<string, BreakdownProjectSession>();

/**
 * حفظ جلسة مشروع جديدة
 * يُنظِّف الجلسات المنتهية الصلاحية تلقائيًا قبل الحفظ
 */
export function storeProjectSession(session: BreakdownProjectSession): void {
  cleanExpiredSessions();
  sessionStore.set(session.projectId, session);
}

/**
 * استرداد جلسة مشروع بالمعرف
 * يُعيد null إذا لم توجد الجلسة أو انتهت صلاحيتها
 */
export function getProjectSession(
  projectId: string
): BreakdownProjectSession | null {
  const session = sessionStore.get(projectId);
  if (!session) {
    return null;
  }

  // التحقق من انتهاء الصلاحية
  if (Date.now() - session.createdAt > SESSION_TTL_MS) {
    sessionStore.delete(projectId);
    return null;
  }

  return session;
}

/**
 * حذف جلسة مشروع (اختياري — للتنظيف الصريح بعد التحليل)
 */
export function deleteProjectSession(projectId: string): void {
  sessionStore.delete(projectId);
}

/**
 * تنظيف الجلسات المنتهية الصلاحية من المخزن
 */
function cleanExpiredSessions(): void {
  const now = Date.now();
  for (const [id, session] of sessionStore.entries()) {
    if (now - session.createdAt > SESSION_TTL_MS) {
      sessionStore.delete(id);
    }
  }
}
