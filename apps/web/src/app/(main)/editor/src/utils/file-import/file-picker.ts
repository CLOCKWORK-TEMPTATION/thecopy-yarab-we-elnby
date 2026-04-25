/**
 * @module utils/file-import/file-picker
 * @description فتح نافذة اختيار ملف عبر عنصر `<input type="file">` مخفي.
 * يُعيد Promise يحمل الملف المحدد أو `null` عند الإلغاء.
 */
import { ACCEPTED_FILE_EXTENSIONS } from "../../types/file-import";

/**
 * يفتح مربع حوار اختيار ملف ويعيد الملف المحدد.
 *
 * @param accept - أنواع الملفات المقبولة (الافتراضي: {@link ACCEPTED_FILE_EXTENSIONS})
 * @returns الملف المحدد أو `null` إذا ألغى المستخدم
 *
 * @example
 * ```ts
 * const file = await pickImportFile()
 * if (file) { /* معالجة الملف *\/ }
 * ```
 */
export const pickImportFile = (
  accept: string = ACCEPTED_FILE_EXTENSIONS
): Promise<File | null> =>
  new Promise((resolve) => {
    const input = document.createElement("input");
    let settled = false;

    const cleanup = (): void => {
      input.removeEventListener("change", handleChange);
      input.removeEventListener("cancel", handleCancel);
      window.removeEventListener("focus", handleFocus);
      input.remove();
    };

    const finish = (file: File | null): void => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(file);
    };

    const handleChange = (): void => {
      finish(input.files?.[0] ?? null);
    };

    const handleCancel = (): void => {
      finish(null);
    };

    const handleFocus = (): void => {
      window.setTimeout(() => {
        if (!input.files?.length) finish(null);
      }, 250);
    };

    input.type = "file";
    input.name = "file-import";
    input.accept = accept ? `${accept},*/*` : "*/*";
    input.tabIndex = -1;
    input.setAttribute("aria-hidden", "true");
    Object.assign(input.style, {
      height: "1px",
      opacity: "0",
      pointerEvents: "none",
      position: "fixed",
      width: "1px",
    });

    input.addEventListener("change", handleChange);
    input.addEventListener("cancel", handleCancel);
    window.addEventListener("focus", handleFocus);
    document.body.appendChild(input);

    input.click();
  });
