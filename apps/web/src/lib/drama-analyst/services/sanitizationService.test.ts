import { describe, it, expect } from "vitest";

import { sanitization } from "./sanitizationService";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

describe("SanitizationService", () => {
  describe("sanitizeHTML", () => {
    // يجب إزالة علامات script الضارة
    it("validate-pipeline: should remove script tags", () => {
      const malicious = '<script>alert("xss")</script><p>Safe content</p>';
      const result = sanitization.html(malicious);
      expect(result).toBe("<p>Safe content</p>");
    });

    // يجب إزالة علامات iframe الضارة
    it("validate-pipeline: should remove iframe tags", () => {
      const malicious =
        '<iframe src="javascript:alert(1)"></iframe><p>Safe</p>';
      const result = sanitization.html(malicious);
      expect(result).toBe("<p>Safe</p>");
    });

    // يجب إزالة معالجات الأحداث الضارة
    it("validate-pipeline: should remove event handlers", () => {
      const malicious = '<div onclick="alert(1)">Click me</div>';
      const result = sanitization.html(malicious);
      expect(result).toBe("<div>Click me</div>");
    });

    // يجب إزالة بروتوكول javascript الضار
    it("validate-pipeline: should remove javascript: protocol", () => {
      const malicious = '<a href="javascript:alert(1)">Link</a>';
      const result = sanitization.html(malicious);
      expect(result).toBe("<a>Link</a>");
    });
  });

  describe("sanitizeText", () => {
    // يجب الهروب من كيانات HTML
    it("validate-pipeline: should escape HTML entities", () => {
      const text = '<script>alert("xss")</script>';
      const result = sanitization.text(text);
      expect(result).toBe(
        "&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;"
      );
    });

    // يجب التعامل مع الإدخال الفارغ
    it("validate-pipeline: should handle empty input", () => {
      const nullInput = null as unknown as string;
      const undefinedInput = undefined as unknown as string;
      expect(sanitization.text("")).toBe("");
      expect(sanitization.text(nullInput)).toBe("");
      expect(sanitization.text(undefinedInput)).toBe("");
    });
  });

  describe("sanitizeFileName", () => {
    // يجب إزالة الأحرف الخطرة من أسماء الملفات
    it("validate-pipeline: should remove dangerous characters", () => {
      const dangerous = "../../../etc/passwd<script>";
      const result = sanitization.fileName(dangerous);
      expect(result).toBe("______etc_passwd_script_");
    });

    // يجب منع الحركة عبر الدلائل
    it("validate-pipeline: should prevent directory traversal", () => {
      const traversal = "../../../../secret.txt";
      const result = sanitization.fileName(traversal);
      expect(result).toBe("________secret.txt");
    });

    // يجب التعامل مع الإدخال الفارغ
    it("validate-pipeline: should handle empty input", () => {
      const nullInput = null as unknown as string;
      expect(sanitization.fileName("")).toBe("unknown.txt");
      expect(sanitization.fileName(nullInput)).toBe("unknown.txt");
    });
  });

  describe("sanitizeURL", () => {
    // يجب السماح بـ URLs صحيحة
    it("validate-pipeline: should allow valid URLs", () => {
      const valid = "https://example.com";
      const result = sanitization.url(valid);
      expect(result).toBe("https://example.com/");
    });

    // يجب رفض javascript: URLs
    it("validate-pipeline: should reject javascript: URLs", () => {
      const malicious = "javascript:alert(1)";
      const result = sanitization.url(malicious);
      expect(result).toBe("");
    });

    // يجب رفض data: URLs
    it("validate-pipeline: should reject data: URLs", () => {
      const malicious = "data:text/html,<script>alert(1)</script>";
      const result = sanitization.url(malicious);
      expect(result).toBe("");
    });
  });

  describe("sanitizeObject", () => {
    // يجب تنظيف الكائنات المتداخلة
    it("validate-pipeline: should sanitize nested objects", () => {
      const obj = {
        name: "<script>alert(1)</script>",
        data: {
          content: '<iframe src="javascript:alert(1)"></iframe>',
          safe: "normal text",
        },
      };
      const result = sanitization.object(obj);

      expect(result.name).toBe("&lt;script&gt;alert(1)&lt;&#x2F;script&gt;");
      expect(result.data.content).toBe(
        "&lt;iframe src=&quot;javascript:alert(1)&quot;&gt;&lt;&#x2F;iframe&gt;"
      );
      expect(result.data.safe).toBe("normal text");
    });

    // يجب تنظيف المصفوفات
    it("validate-pipeline: should sanitize arrays", () => {
      const arr = ["<script>alert(1)</script>", "safe text"];
      const result = sanitization.object(arr);

      expect(result[0]).toBe("&lt;script&gt;alert(1)&lt;&#x2F;script&gt;");
      expect(result[1]).toBe("safe text");
    });
  });

  describe("sanitizeAIRequest", () => {
    // يجب تنظيف بيانات الطلب
    it("validate-pipeline: should sanitize request data", () => {
      const request = {
        agent: "<script>alert(1)</script>",
        files: [
          {
            name: "../../../malicious.txt",
            content: "<script>alert(1)</script>",
            type: "text",
          },
        ],
        parameters: {
          content: '<iframe src="javascript:alert(1)"></iframe>',
        },
      };

      const result = sanitization.aiRequest(request);
      const files = result["files"];
      const parameters = result["parameters"];

      expect(result["agent"]).toBe(
        "&lt;script&gt;alert(1)&lt;&#x2F;script&gt;"
      );
      expect(Array.isArray(files)).toBe(true);
      if (!Array.isArray(files) || !isRecord(files[0])) {
        throw new Error("Sanitized files payload is invalid");
      }
      expect(files[0]["name"]).toBe("______malicious.txt");
      expect(files[0]["content"]).toBe(
        "&lt;script&gt;alert(1)&lt;&#x2F;script&gt;"
      );
      expect(isRecord(parameters)).toBe(true);
      if (!isRecord(parameters)) {
        throw new Error("Sanitized parameters payload is invalid");
      }
      expect(parameters["content"]).toBe(
        "&lt;iframe src=&quot;javascript:alert(1)&quot;&gt;&lt;&#x2F;iframe&gt;"
      );
    });
  });

  describe("validation", () => {
    // يجب التحقق من صحة إدخال النص
    it("validate-pipeline: should validate text input", () => {
      expect(sanitization.validation.isValidTextInput("valid text")).toBe(true);
      expect(sanitization.validation.isValidTextInput("")).toBe(false);
      expect(sanitization.validation.isValidTextInput(null)).toBe(false);
      expect(sanitization.validation.isValidTextInput("x".repeat(10001))).toBe(
        false
      );
    });

    // يجب التحقق من صحة أسماء الملفات
    it("validate-pipeline: should validate file names", () => {
      expect(sanitization.validation.isValidFileName("valid.txt")).toBe(true);
      expect(sanitization.validation.isValidFileName("")).toBe(false);
      expect(sanitization.validation.isValidFileName(null)).toBe(false);
    });

    // يجب التحقق من صحة حجم الملف
    it("validate-pipeline: should validate file sizes", () => {
      expect(sanitization.validation.isValidFileSize(1024)).toBe(true);
      expect(sanitization.validation.isValidFileSize(0)).toBe(false);
      expect(sanitization.validation.isValidFileSize(21 * 1024 * 1024)).toBe(
        false
      );
    });
  });
});
