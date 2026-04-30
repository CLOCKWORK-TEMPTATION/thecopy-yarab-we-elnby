"use client";

/**
 * @fileoverview مكوّن رفع الملفات الموحّد
 *
 * القواعد:
 * - الأنواع المقبولة: image/* | video/mp4 | application/pdf
 * - الأنواع المرفوضة صراحةً: .exe | .zip (وكل ملف تنفيذي أو مضغوط)
 * - حد ناعم:  10 MB → تحذير مرئي
 * - حد صلب:  50 MB → رفض فوري
 */

import {
  AlertCircle,
  CheckCircle,
  File,
  FileImage,
  FileText,
  Film,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useId, useState } from "react";

import { createModuleLogger } from "@/lib/logger";

const logger = createModuleLogger("components.shared.unified-file-upload");

// ============================================================
// الثوابت
// ============================================================

const SOFT_LIMIT_BYTES = 10 * 1024 * 1024;  // 10 MB — تحذير
const HARD_LIMIT_BYTES = 50 * 1024 * 1024;  // 50 MB — رفض

const ACCEPTED_MIME_PREFIXES = ["image/", "video/mp4", "application/pdf"] as const;

// امتدادات ترفضها الواجهة حتى لو تجاوز المتصفح
const REJECTED_EXTENSIONS = new Set([".exe", ".zip", ".msi", ".bat", ".sh", ".cmd", ".scr"]);

// ============================================================
// الأنواع
// ============================================================

type FileStatus = "pending" | "uploading" | "success" | "error" | "warning";

export interface UploadedFileEntry {
  id: string;
  file: File;
  name: string;
  sizeBytes: number;
  mimeType: string;
  status: FileStatus;
  /** رسالة الخطأ أو التحذير — فارغة عند النجاح */
  message: string;
  /** نسبة التحميل (0–100) */
  progress: number;
  /** Base64 data URL للصور فقط — لعرض المعاينة */
  preview?: string;
}

export interface UnifiedFileUploadProps {
  /** يُستدعى بعد اكتمال الرفع لكل ملف ناجح */
  onUploadSuccess: (entry: UploadedFileEntry) => void;
  /** يُستدعى عند رفض ملف أو وقوع خطأ */
  onUploadError?: (name: string, reason: string) => void;
  /** يسمح بتعدد الملفات في نفس الوقت */
  multiple?: boolean;
  className?: string;
}

// ============================================================
// مساعدات
// ============================================================

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return FileImage;
  if (mimeType.startsWith("video/")) return Film;
  if (mimeType === "application/pdf") return FileText;
  return File;
}

function isAccepted(file: File): boolean {
  const ext = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
  if (REJECTED_EXTENSIONS.has(ext)) return false;
  return ACCEPTED_MIME_PREFIXES.some((prefix) =>
    file.type === prefix || file.type.startsWith(prefix)
  );
}

function buildInitialEntry(file: File): UploadedFileEntry {
  return {
    id: `${file.name}-${file.lastModified}-${Math.random()}`,
    file,
    name: file.name,
    sizeBytes: file.size,
    mimeType: file.type,
    status: "pending",
    message: "",
    progress: 0,
  };
}

/** قراءة الصور كـ data URL لعرض المعاينة المصغرة */
function readImagePreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error("فشل قراءة معاينة الصورة"));
    reader.readAsDataURL(file);
  });
}

// ============================================================
// المكوّن
// ============================================================

export function UnifiedFileUpload({
  onUploadSuccess,
  onUploadError,
  multiple = true,
  className = "",
}: UnifiedFileUploadProps) {
  const inputId = useId();
  const [entries, setEntries] = useState<UploadedFileEntry[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // ---- تحديث حالة ملف واحد ----
  const patchEntry = useCallback(
    (id: string, patch: Partial<UploadedFileEntry>) => {
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...patch } : e))
      );
    },
    []
  );

  // ---- معالجة ملف واحد ----
  const processFile = useCallback(
    async (file: File) => {
      // 1. رفض الأنواع غير المسموحة
      if (!isAccepted(file)) {
        const reason = `نوع الملف غير مدعوم: ${file.type || file.name.split(".").pop()}`;
        onUploadError?.(file.name, reason);
        logger.warn({ fileName: file.name, type: file.type }, reason);
        return;
      }

      // 2. الحد الصلب — 50 MB
      if (file.size > HARD_LIMIT_BYTES) {
        const reason = `الملف تجاوز الحد الأقصى (50 MB): ${formatBytes(file.size)}`;
        onUploadError?.(file.name, reason);
        logger.warn({ fileName: file.name, size: file.size }, reason);
        setEntries((prev) => [
          ...prev,
          {
            ...buildInitialEntry(file),
            status: "error",
            message: reason,
          },
        ]);
        return;
      }

      const entry = buildInitialEntry(file);

      // تحذير ناعم — 10 MB
      const softWarning =
        file.size > SOFT_LIMIT_BYTES
          ? `حجم الملف كبير (${formatBytes(file.size)}) — قد يستغرق الرفع وقتاً أطول`
          : "";

      setEntries((prev) => [
        ...prev,
        { ...entry, status: "uploading", message: softWarning, progress: 0 },
      ]);

      try {
        // معاينة للصور
        let preview: string | undefined;
        if (file.type.startsWith("image/")) {
          preview = await readImagePreview(file);
          patchEntry(entry.id, { preview });
        }

        // محاكاة التقدم (يُستبدل بـ XHR أو fetch upload في الإنتاج)
        for (let p = 10; p <= 90; p += 20) {
          await new Promise((r) => setTimeout(r, 80));
          patchEntry(entry.id, { progress: p });
        }

        const previewPatch = preview ? { preview } : {};
        const completed: UploadedFileEntry = {
          ...entry,
          status: softWarning ? "warning" : "success",
          message: softWarning,
          progress: 100,
          ...previewPatch,
        };

        patchEntry(entry.id, {
          status: completed.status,
          progress: 100,
          message: softWarning,
          ...previewPatch,
        });

        onUploadSuccess(completed);
        logger.info({ fileName: file.name, size: file.size }, "رُفع الملف بنجاح");
      } catch (err) {
        const reason = err instanceof Error ? err.message : "خطأ غير معروف";
        patchEntry(entry.id, { status: "error", message: reason, progress: 0 });
        onUploadError?.(file.name, reason);
        logger.error({ err, fileName: file.name }, "فشل رفع الملف");
      }
    },
    [onUploadError, onUploadSuccess, patchEntry]
  );

  // ---- معالجة قائمة ملفات ----
  const handleFiles = useCallback(
    (list: FileList | null) => {
      if (!list) return;
      Array.from(list).forEach((f) => {
        processFile(f).catch((err: unknown) => {
          logger.error({ err, fileName: f.name }, "خطأ غير متوقع");
        });
      });
    },
    [processFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const removeEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  // ============================================================
  // العرض
  // ============================================================

  return (
    <div className={`space-y-4 ${className}`} dir="rtl">
      {/* منطقة السحب والإفلات */}
      <div
        role="region"
        aria-label="منطقة رفع الملفات"
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
        className={[
          "flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors",
          isDragging
            ? "border-blue-500 bg-blue-500/10"
            : "border-white/15 bg-white/4 hover:border-white/25 hover:bg-white/6",
        ].join(" ")}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/8">
          <Upload className="h-6 w-6 text-white/55" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-white/80">
            اسحب الملفات هنا أو{" "}
            <label
              htmlFor={inputId}
              className="cursor-pointer text-blue-400 underline-offset-2 hover:underline"
            >
              انقر للاختيار
            </label>
          </p>
          <p className="text-xs text-white/40">
            صور · PDF · فيديو MP4 — حد أقصى 50 MB (تحذير عند 10 MB)
          </p>
        </div>
        <input
          id={inputId}
          type="file"
          multiple={multiple}
          accept="image/*,video/mp4,application/pdf"
          className="sr-only"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* قائمة الملفات */}
      {entries.length > 0 && (
        <ul className="space-y-2" aria-label="الملفات المرفوعة">
          {entries.map((entry) => {
            const Icon = getFileIcon(entry.mimeType);
            return (
              <li
                key={entry.id}
                className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/4 px-4 py-3"
              >
                {/* معاينة أو أيقونة */}
                {entry.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={entry.preview}
                    alt={entry.name}
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/8">
                    <Icon className="h-5 w-5 text-white/55" />
                  </div>
                )}

                {/* المعلومات */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white/85">
                    {entry.name}
                  </p>
                  <p className="text-xs text-white/40">
                    {formatBytes(entry.sizeBytes)}
                  </p>
                  {entry.message && (
                    <p
                      className={`mt-0.5 text-xs ${
                        entry.status === "error"
                          ? "text-red-400"
                          : "text-amber-400"
                      }`}
                    >
                      {entry.message}
                    </p>
                  )}
                  {entry.status === "uploading" && (
                    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all"
                        style={{ width: `${entry.progress}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* الحالة */}
                <div className="shrink-0">
                  {entry.status === "success" && (
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  )}
                  {entry.status === "warning" && (
                    <AlertCircle className="h-5 w-5 text-amber-400" />
                  )}
                  {entry.status === "error" && (
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  )}
                </div>

                {/* حذف */}
                <button
                  type="button"
                  aria-label={`إزالة ${entry.name}`}
                  onClick={() => removeEntry(entry.id)}
                  className="shrink-0 rounded-full p-1 text-white/35 transition-colors hover:bg-white/8 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default UnifiedFileUpload;
