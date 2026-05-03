// ============================================================================
// طبقة التحقق الموحدة
// ============================================================================
// تستخدم Zod لبناء schemas مشتركة، وتوفر سانتيزر للتصدير لمنع
// XSS من الانتقال عبر PDF/Excel/HTML، وتمنع Excel formula injection.

import { z, type ZodType } from "zod";

import { ApiError, defaultArabicMessage } from "@the-copy/api-client";

/**
 * بادئات Excel formula injection الخطرة.
 */
const EXCEL_DANGEROUS_PREFIX = /^[=+\-@\t\r]/;

/**
 * يعقّم نص قبل كتابته في خلية Excel/CSV.
 * يضع علامة اقتباس مفردة قبل البادئة الخطرة لمنع التنفيذ.
 */
export function sanitizeForExcel(value: string): string {
  if (typeof value !== "string") {
    return "";
  }
  if (EXCEL_DANGEROUS_PREFIX.test(value)) {
    return `'${value}`;
  }
  return value;
}

/**
 * يحول كل القيم النصية في object إلى صيغة آمنة لـ Excel.
 */
export function sanitizeRowForExcel(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = typeof v === "string" ? sanitizeForExcel(v) : v;
  }
  return out;
}

/**
 * يعقّم HTML بسيطاً عبر escaping للأحرف الخمسة الخطرة.
 * ليس بديلاً عن DOMPurify لكن يكفي لـ PDF/Markdown export.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * أنواع schemas جاهزة لإعادة الاستخدام.
 */
export const NonEmptyString = z
  .string()
  .trim()
  .min(1, "هذا الحقل مطلوب");

export const ProjectTitle = z
  .string()
  .trim()
  .min(2, "العنوان يجب أن يكون حرفين على الأقل")
  .max(200, "العنوان طويل جداً");

export const ScriptText = z
  .string()
  .min(1, "النص مطلوب")
  .max(500_000, "النص يتجاوز الحد المسموح (500,000 حرف)");

export const Currency = z.enum(["EGP", "USD", "EUR", "SAR", "AED"]);

export const PositiveNumber = z
  .number()
  .finite()
  .nonnegative("الرقم يجب أن يكون موجباً");

export const Language = z.enum(["ar", "en"]);

/**
 * يحوّل ZodError إلى ApiError validation_error مع رسالة مدمجة.
 */
export function zodToApiError(error: z.ZodError): ApiError {
  const firstIssue = error.issues[0];
  const message =
    firstIssue !== undefined && typeof firstIssue.message === "string" && firstIssue.message.length > 0
      ? firstIssue.message
      : defaultArabicMessage("validation_error");
  return new ApiError({
    code: "validation_error",
    message,
    details: error.issues,
  });
}

/**
 * يحلل مدخلاً ويرفع ApiError validation_error عند الفشل.
 */
export function parseOrThrow<TSchema extends ZodType<unknown>>(
  schema: TSchema,
  input: unknown,
): z.infer<TSchema> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw zodToApiError(result.error);
  }
  return result.data as z.infer<TSchema>;
}

/**
 * يقصّ النص إلى حد محدد دون كسر محارف unicode متعددة البايت.
 */
export function clampText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  // استخدام Array.from لاحتساب grapheme clusters بدل code units.
  const chars = Array.from(value);
  if (chars.length <= maxLength) {
    return value;
  }
  return chars.slice(0, maxLength).join("");
}

export { z };
