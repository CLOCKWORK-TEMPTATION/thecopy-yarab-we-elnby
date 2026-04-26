/**
 * @module utils/file-import/extract/unified-text-extract
 * @description يُرسل النص المُستخرج من ملف DOC/DOCX إلى نقطة `/api/text-extract`
 * للحصول على `UnifiedReceptionResponse`.
 *
 * يُستخدم في مسار استيراد DOC بعد نجاح استخراج النص عبر Backend.
 * يُنفّذ FR-005 (إرسال النص دائماً للخدمة المشتركة) و FR-006 (فشل صريح).
 */
import { resolveTextExtractEndpoint } from "../../backend-endpoints";

import type { SchemaElement } from "../../../types/file-import";
import type {
  KarankTextExtractResponse,
  ReceptionSourceType,
} from "../../../types/unified-reception";

/**
 * نقطة نهاية `/api/text-extract` المُحلّلة من متغيرات البيئة.
 * يُعاد بناؤها من `NEXT_PUBLIC_FILE_IMPORT_BACKEND_URL` بنفس منطق
 * `paste-classifier-config.ts`.
 */
const TEXT_EXTRACT_ENDPOINT = resolveTextExtractEndpoint();

const DEFAULT_TIMEOUT_MS = 30_000;

export interface UnifiedTextExtractResult {
  /** النص الخام المُعاد بناؤه */
  rawText: string;
  /** عناصر المحرك المحوّلة لصيغة SchemaElement */
  schemaElements: SchemaElement[];
  /** مدة المعالجة بالمللي ثانية */
  processingTimeMs: number;
}

/**
 * يُرسل النص المُستخرج إلى `/api/text-extract` ويُعيد عناصر المحرك
 * محوّلة لصيغة `SchemaElement` المتوافقة مع خط أنابيب التصنيف.
 *
 * FR-006: يرمي خطأ صريح عند فشل الاتصال أو الاستجابة — لا يوجد
 * سلوك احتياطي صامت.
 *
 * @param text - النص المُستخرج من الملف
 * @param sourceType - نوع المصدر (`doc` أو `docx`)
 * @param timeoutMs - مهلة الطلب بالمللي ثانية
 * @throws {Error} عند فشل الاتصال أو استجابة غير صالحة
 */
export const fetchUnifiedTextExtract = async (
  text: string,
  sourceType: ReceptionSourceType,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<UnifiedTextExtractResult> => {
  if (!TEXT_EXTRACT_ENDPOINT) {
    throw new Error(
      "تعذر إرسال النص للخدمة المشتركة: نقطة /api/text-extract غير مُضبطة."
    );
  }

  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(TEXT_EXTRACT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text, sourceType }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(
        `فشل الخدمة المشتركة: HTTP ${String(response.status)} — ${errorBody || response.statusText}`
      );
    }

    const body = (await response.json()) as KarankTextExtractResponse;
    const schemaElementsPayload = body.guidance?.schemaElements;

    if (
      !Array.isArray(schemaElementsPayload) ||
      schemaElementsPayload.length === 0
    ) {
      throw new Error("استجابة الخدمة المشتركة لا تحتوي على عناصر صالحة.");
    }

    if (body.guidance.visibleTextValidity !== "valid") {
      throw new Error("استجابة الكرنك أعادت نصًا غير صالح للاستبدال المباشر.");
    }

    const schemaElements: SchemaElement[] = schemaElementsPayload.map((el) => ({
      element: el.elementType ?? "",
      value: el.text,
    }));

    return {
      rawText: body.guidance.rawText,
      schemaElements,
      processingTimeMs: body.visibleVersion?.processingTimeMs ?? 0,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        "انتهت مهلة الاتصال بالخدمة المشتركة (/api/text-extract).",
        { cause: error }
      );
    }
    throw error;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
};
