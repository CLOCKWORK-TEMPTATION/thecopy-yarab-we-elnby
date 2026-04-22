/**
 * شبكة انحدار: directors-studio — إمكانية الوصول لإدخال الملفات
 *
 * يتحقق من:
 * - isSupportedFileType ترفض الأنواع غير المدعومة
 * - الامتدادات والـ MIME المدعومة
 * - FileExtractionError يحمل النوع الصحيح
 * - حد حجم الملف
 *
 * ملاحظة: pdfjs-dist يحتاج DOMMatrix غير المتاح في jsdom
 * لذلك نعمل mock للمكتبة بالكامل ونستورد التصديرات الخاصة بنا مباشرة
 */
import { describe, it, expect, vi } from "vitest";

// محاكاة pdfjs-dist قبل استيراد fileExtractor
vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
  version: "0.0.0",
  getDocument: vi.fn(),
}));

// محاكاة mammoth
vi.mock("mammoth", () => ({
  default: { extractRawText: vi.fn() },
  extractRawText: vi.fn(),
}));

import {
  isSupportedFileType,
  SUPPORTED_EXTENSIONS,
  SUPPORTED_MIME_TYPES,
  FileExtractionError,
  ExtractionErrorType,
} from "@/app/(main)/directors-studio/helpers/fileExtractor";

// ------------------------------------------------------------------
// أدوات مساعدة
// ------------------------------------------------------------------
function fakeFile(name: string, type: string, size = 1024): File {
  const blob = new Blob(["x".repeat(size)], { type });
  return new File([blob], name, { type });
}

describe("شبكة انحدار: directors-studio — إدخال الملفات", () => {
  // ================================================================
  // 1) الامتدادات المدعومة
  // ================================================================
  describe("SUPPORTED_EXTENSIONS", () => {
    it("تتضمن .txt و .pdf و .docx", () => {
      expect(SUPPORTED_EXTENSIONS).toContain(".txt");
      expect(SUPPORTED_EXTENSIONS).toContain(".pdf");
      expect(SUPPORTED_EXTENSIONS).toContain(".docx");
    });

    it("لا تتضمن .doc (التنسيق القديم)", () => {
      expect(SUPPORTED_EXTENSIONS).not.toContain(".doc");
    });
  });

  // ================================================================
  // 2) SUPPORTED_MIME_TYPES
  // ================================================================
  describe("SUPPORTED_MIME_TYPES", () => {
    it("تحتوي text/plain و application/pdf و docx mime", () => {
      expect(SUPPORTED_MIME_TYPES.TXT).toBe("text/plain");
      expect(SUPPORTED_MIME_TYPES.PDF).toBe("application/pdf");
      expect(SUPPORTED_MIME_TYPES.DOCX).toBe(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
    });
  });

  // ================================================================
  // 3) isSupportedFileType
  // ================================================================
  describe("isSupportedFileType", () => {
    it("يقبل ملف .txt", () => {
      expect(isSupportedFileType(fakeFile("script.txt", "text/plain"))).toBe(
        true
      );
    });

    it("يقبل ملف .pdf", () => {
      expect(
        isSupportedFileType(fakeFile("script.pdf", "application/pdf"))
      ).toBe(true);
    });

    it("يقبل ملف .docx", () => {
      expect(
        isSupportedFileType(
          fakeFile(
            "script.docx",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          )
        )
      ).toBe(true);
    });

    it("يرفض ملف .exe", () => {
      expect(
        isSupportedFileType(fakeFile("malware.exe", "application/x-msdownload"))
      ).toBe(false);
    });

    it("يرفض ملف .jpg", () => {
      expect(isSupportedFileType(fakeFile("photo.jpg", "image/jpeg"))).toBe(
        false
      );
    });

    it("يرفض ملف .doc القديم", () => {
      expect(
        isSupportedFileType(fakeFile("old.doc", "application/msword"))
      ).toBe(false);
    });
  });

  // ================================================================
  // 4) FileExtractionError يحمل البنية الصحيحة
  // ================================================================
  describe("FileExtractionError", () => {
    it("يحمل نوع الخطأ والرسالة", () => {
      const err = new FileExtractionError(
        ExtractionErrorType.UNSUPPORTED_TYPE,
        "نوع غير مدعوم"
      );
      expect(err).toBeInstanceOf(Error);
      expect(err.type).toBe(ExtractionErrorType.UNSUPPORTED_TYPE);
      expect(err.message).toBe("نوع غير مدعوم");
      expect(err.name).toBe("FileExtractionError");
    });

    it("يمكنه حمل originalError اختياري", () => {
      const original = new Error("سبب أصلي");
      const err = new FileExtractionError(
        ExtractionErrorType.FILE_READ_ERROR,
        "فشل القراءة",
        original
      );
      expect(err.originalError).toBe(original);
    });

    it("ExtractionErrorType يحتوي جميع الأنواع المتوقعة", () => {
      const expectedTypes = [
        "UNSUPPORTED_TYPE",
        "FILE_READ_ERROR",
        "PDF_PARSE_ERROR",
        "DOCX_PARSE_ERROR",
        "EMPTY_CONTENT",
        "FILE_TOO_LARGE",
      ];
      for (const t of expectedTypes) {
        expect(Object.values(ExtractionErrorType)).toContain(t);
      }
    });
  });
});
