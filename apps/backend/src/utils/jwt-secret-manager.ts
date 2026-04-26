/**
 * مدير أسرار JWT مع دعم دوران السر
 *
 * @description
 * يوفّر API مركزي لتوقيع والتحقق من رموز JWT مع نافذة انتقال مزدوجة:
 * - التوقيع يتم دائمًا بالسر النشط الحالي (env.JWT_SECRET).
 * - التحقق يُجرى أولًا بالسر النشط، وفي حال الفشل يتم تجريب الأسرار السابقة
 *   المذكورة في env.JWT_SECRET_PREVIOUS (قائمة مفصولة بفواصل).
 *
 * هذا يسمح بتدوير JWT_SECRET بدون إبطال الجلسات الحالية قبل انتهاء صلاحيتها.
 *
 * ملاحظة: لا نُعرّض الأسرار من خلال هذه الوحدة — فقط عمليات sign/verify.
 */

import jwt, { type Secret, type SignOptions, type VerifyOptions } from 'jsonwebtoken';

import { env } from '@/config/env';

/**
 * السر النشط المستخدم للتوقيع
 */
function getActiveSecret(): Secret {
  return env.JWT_SECRET;
}

/**
 * قائمة الأسرار السابقة المعتمدة للتحقق فقط (لا للتوقيع)
 */
function getPreviousSecrets(): string[] {
  const raw = env.JWT_SECRET_PREVIOUS;
  if (!raw) {
    return [];
  }
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

/**
 * توقيع payload باستخدام السر النشط
 */
export function signJwt(payload: string | object | Buffer, options?: SignOptions): string {
  return jwt.sign(payload, getActiveSecret(), options);
}

/**
 * التحقق من الرمز عبر السر النشط ثم الأسرار السابقة كاحتياطي
 *
 * ترمي الدالة بنفس أخطاء jsonwebtoken إذا فشلت جميع المحاولات،
 * مع الحفاظ على نوع الخطأ الذي صدر من السر النشط.
 */
export function verifyJwt<T = unknown>(token: string, options?: VerifyOptions): T {
  let primaryError: unknown;

  try {
    return jwt.verify(token, getActiveSecret(), options) as T;
  } catch (error) {
    primaryError = error;
  }

  for (const previousSecret of getPreviousSecrets()) {
    try {
      return jwt.verify(token, previousSecret, options) as T;
    } catch {
      // نواصل التجريب على باقي الأسرار السابقة دون كشف التفاصيل
    }
  }

  throw primaryError;
}
