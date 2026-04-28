/**
 * شبكة انحدار: directors-studio — استيراد الملفات معطّل صراحةً
 *
 * fileExtractor.ts في directors-studio أُلغيت وظائفه التشغيلية (انظر الملف نفسه:
 * "معطّل بالكامل" — الاستيراد متاح حصراً من /editor). هذه الاختبارات تصون عقد
 * الإلغاء النهائي حتى لا تُعاد إعادة تفعيل المسار صدفة دون تحقق صريح:
 *   - واجهة الأنواع تكشف EXTRACTION_DISABLED + 3 نتائج رفض دلالية أخرى.
 *   - FileExtractionError يحمل type و details ورسالة موحَّدة تشير إلى /editor.
 *   - extractTextFromFile / getSupportedFileTypes / validateFile كلها ترمي
 *     FileExtractionError بالنوع EXTRACTION_DISABLED بصرف النظر عن المدخل.
 *
 * النسخة السابقة من الاختبار كانت تتحقق من API قديمة (SUPPORTED_EXTENSIONS،
 * isSupportedFileType، originalError، UNSUPPORTED_TYPE…) — كلها موارد لم تعد
 * موجودة في الكود. كان يفشل 12/12 لأن الـ imports نفسها كانت undefined.
 */

import { describe, it, expect } from "vitest";

import {
  FileExtractionError,
  ExtractionErrorType,
  extractTextFromFile,
  getSupportedFileTypes,
  validateFile,
} from "@/app/(main)/directors-studio/helpers/fileExtractor";

describe("شبكة انحدار: directors-studio — استيراد الملفات معطّل", () => {
  describe("ExtractionErrorType — عقد الـ enum", () => {
    it("يحتوي EXTRACTION_DISABLED كقيمة معتمدة", () => {
      expect(ExtractionErrorType.EXTRACTION_DISABLED).toBe(
        "EXTRACTION_DISABLED"
      );
    });

    it("يحتفظ بنواتج الرفض الدلالية للأنواع غير المدعومة", () => {
      expect(ExtractionErrorType.UNSUPPORTED_FORMAT).toBe("UNSUPPORTED_FORMAT");
      expect(ExtractionErrorType.CORRUPTED_FILE).toBe("CORRUPTED_FILE");
      expect(ExtractionErrorType.INVALID_CONTENT).toBe("INVALID_CONTENT");
    });

    it("لا يكشف أي وظيفة استخراج كقيمة من الـ enum (مثل OK)", () => {
      const values = new Set(Object.values(ExtractionErrorType));
      expect(values.has("OK" as never)).toBe(false);
      expect(values.has("SUCCESS" as never)).toBe(false);
    });
  });

  describe("FileExtractionError — عقد الـ class", () => {
    it("instance من Error مع name = 'FileExtractionError'", () => {
      const err = new FileExtractionError(
        ExtractionErrorType.EXTRACTION_DISABLED
      );
      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe("FileExtractionError");
    });

    it("يحفظ type المُمرَّر", () => {
      const err = new FileExtractionError(
        ExtractionErrorType.UNSUPPORTED_FORMAT
      );
      expect(err.type).toBe(ExtractionErrorType.UNSUPPORTED_FORMAT);
    });

    it("يحفظ details الاختياري عند تمريره", () => {
      const err = new FileExtractionError(
        ExtractionErrorType.CORRUPTED_FILE,
        "ملف pdf تالف"
      );
      expect(err.details).toBe("ملف pdf تالف");
    });

    it("details يبقى undefined إذا لم يُمَرَّر", () => {
      const err = new FileExtractionError(ExtractionErrorType.INVALID_CONTENT);
      expect(err.details).toBeUndefined();
    });

    it("الرسالة تُحيل المستخدم إلى /editor كمالك وحيد للاستيراد", () => {
      const err = new FileExtractionError(
        ExtractionErrorType.EXTRACTION_DISABLED
      );
      expect(err.message).toContain("/editor");
      expect(err.message).toContain("معطّل");
    });
  });

  describe("extractTextFromFile — يجب أن يرفض دائماً", () => {
    it("يرمي FileExtractionError(EXTRACTION_DISABLED) لأي ملف نصي", async () => {
      const file = new File(["hello"], "x.txt", { type: "text/plain" });
      await expect(extractTextFromFile(file)).rejects.toBeInstanceOf(
        FileExtractionError
      );
      await expect(extractTextFromFile(file)).rejects.toMatchObject({
        type: ExtractionErrorType.EXTRACTION_DISABLED,
      });
    });

    it("يرمي FileExtractionError(EXTRACTION_DISABLED) لـ pdf أيضاً", async () => {
      const file = new File(["%PDF"], "x.pdf", { type: "application/pdf" });
      await expect(extractTextFromFile(file)).rejects.toMatchObject({
        type: ExtractionErrorType.EXTRACTION_DISABLED,
      });
    });
  });

  describe("getSupportedFileTypes — يرفض الاستفسار لأن الاستيراد معطّل", () => {
    it("يرمي FileExtractionError(EXTRACTION_DISABLED)", () => {
      expect(() => getSupportedFileTypes()).toThrow(FileExtractionError);
      let thrownError: unknown;
      try {
        getSupportedFileTypes();
      } catch (e) {
        thrownError = e;
      }
      expect((thrownError as FileExtractionError).type).toBe(
        ExtractionErrorType.EXTRACTION_DISABLED
      );
    });
  });

  describe("validateFile — لا يقبل أي ملف لأن الاستيراد معطّل", () => {
    it("يرمي FileExtractionError(EXTRACTION_DISABLED) لأي ملف", () => {
      const file = new File([""], "any.txt", { type: "text/plain" });
      expect(() => validateFile(file)).toThrow(FileExtractionError);
      let thrownError: unknown;
      try {
        validateFile(file);
      } catch (e) {
        thrownError = e;
      }
      expect((thrownError as FileExtractionError).type).toBe(
        ExtractionErrorType.EXTRACTION_DISABLED
      );
    });
  });
});
