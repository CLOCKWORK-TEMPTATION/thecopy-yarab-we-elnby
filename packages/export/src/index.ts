// واجهة عامة لحزمة @the-copy/export

export {
  applyExportSafeColors,
  toExportSafeColor,
  type SafeRgbColor,
} from "./color.js";

export {
  prepareExportDom,
  type ExportDomHandle,
  type PrepareExportDomOptions,
} from "./pdf-safe-dom.js";

export { sanitizeForExcel, sanitizeRowForExcel, escapeHtml } from "@the-copy/validation";

/**
 * يحوّل blob إلى تنزيل بالاسم المحدد.
 * يعمل فقط في المتصفح.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

/**
 * تصدير JSON عام — كل تطبيق يستخدمه كحد أدنى.
 */
export function exportJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  downloadBlob(blob, filename.endsWith(".json") ? filename : `${filename}.json`);
}

/**
 * تصدير Markdown.
 */
export function exportMarkdown(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  downloadBlob(blob, filename.endsWith(".md") ? filename : `${filename}.md`);
}

/**
 * تصدير TXT.
 */
export function exportText(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  downloadBlob(blob, filename.endsWith(".txt") ? filename : `${filename}.txt`);
}
