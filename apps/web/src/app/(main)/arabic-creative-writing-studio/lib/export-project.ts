import { CreativeProject } from "@/app/(main)/arabic-creative-writing-studio/types";

export type ExportFormat = "txt" | "json" | "html" | "rtf";

export interface ExportResult {
  success: boolean;
  format: ExportFormat;
  filename: string;
  message: string;
}

const EXPORT_MIME_TYPES: Record<ExportFormat, string> = {
  txt: "text/plain;charset=utf-8",
  json: "application/json;charset=utf-8",
  html: "text/html;charset=utf-8",
  rtf: "application/rtf;charset=utf-8",
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sanitizeFilename(title: string): string {
  const trimmedTitle = title.trim();

  if (!trimmedTitle) {
    return "creative-writing-project";
  }

  return trimmedTitle
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 80);
}

function buildExportBody(
  project: CreativeProject,
  format: ExportFormat
): string {
  switch (format) {
    case "txt":
      return `${project.title}\n\n${project.content}`;
    case "json":
      return JSON.stringify(project, null, 2);
    case "html":
      return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(project.title)}</title>
  <style>
    body { font-family: 'Cairo', Arial, sans-serif; padding: 24px; background: #0f172a; color: #f8fafc; line-height: 1.9; }
    h1 { color: #f472b6; }
    .meta { color: #cbd5f5; margin-bottom: 20px; font-size: 14px; }
    .content { white-space: pre-wrap; }
  </style>
</head>
<body>
  <h1>${escapeHtml(project.title)}</h1>
  <div class="meta">الكلمات: ${project.wordCount} | الفقرات: ${project.paragraphCount}</div>
  <div class="content">${escapeHtml(project.content)}</div>
</body>
</html>`;
    case "rtf":
      return `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}\\f0\\fs24 ${project.title}\\par ${project.content.replace(/\n/g, "\\par ")}}`;
  }
}

export function exportProjectDocument(
  project: CreativeProject,
  format: ExportFormat
): ExportResult {
  const filename = `${sanitizeFilename(project.title)}.${format}`;

  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    typeof URL === "undefined" ||
    typeof Blob === "undefined"
  ) {
    return {
      success: false,
      format,
      filename,
      message: "فشل التصدير لأن واجهة المتصفح غير متاحة في هذه البيئة.",
    };
  }

  const content = buildExportBody(project, format);
  const blob = new Blob([content], { type: EXPORT_MIME_TYPES[format] });
  const url = URL.createObjectURL(blob);

  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.rel = "noopener";
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return {
      success: true,
      format,
      filename,
      message: `تم تجهيز الملف ${filename} للتنزيل بصيغة ${format.toUpperCase()}.`,
    };
  } catch {
    return {
      success: false,
      format,
      filename,
      message: `فشل تصدير الملف ${filename}. حاول مرة أخرى.`,
    };
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
