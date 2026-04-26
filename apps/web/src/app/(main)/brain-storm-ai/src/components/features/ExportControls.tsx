"use client";

/**
 * @module ExportControls
 * @description أزرار تصدير نتائج الجلسة الحالية مع ردود فعل مرئية
 */

import { useCallback, useState } from "react";

import {
  exportToJSON,
  exportToMarkdown,
  copyToClipboard,
} from "../../lib/export";

import type { ExportResult } from "../../lib/export";
import type { Session, DebateMessage } from "../../types";

interface ExportControlsProps {
  session: Session;
  messages: DebateMessage[];
}

interface FeedbackState {
  type: "idle" | "success" | "error";
  message?: string;
}

const FEEDBACK_TIMEOUT = 2500;

function feedbackFromResult(
  result: ExportResult,
  successMsg: string
): FeedbackState {
  return result.ok
    ? { type: "success", message: successMsg }
    : { type: "error", message: result.error ?? "فشل التصدير" };
}

export function ExportControls({ session, messages }: ExportControlsProps) {
  const [copyFeedback, setCopyFeedback] = useState<FeedbackState>({
    type: "idle",
  });
  const [jsonFeedback, setJsonFeedback] = useState<FeedbackState>({
    type: "idle",
  });
  const [mdFeedback, setMdFeedback] = useState<FeedbackState>({
    type: "idle",
  });

  const handleExportJSON = useCallback((): void => {
    const result = exportToJSON(session, messages);
    setJsonFeedback(feedbackFromResult(result, "تم التصدير"));
    setTimeout(() => setJsonFeedback({ type: "idle" }), FEEDBACK_TIMEOUT);
  }, [session, messages]);

  const handleExportMD = useCallback((): void => {
    const result = exportToMarkdown(session, messages);
    setMdFeedback(feedbackFromResult(result, "تم التصدير"));
    setTimeout(() => setMdFeedback({ type: "idle" }), FEEDBACK_TIMEOUT);
  }, [session, messages]);

  const handleCopy = useCallback(async (): Promise<void> => {
    const result = await copyToClipboard(session, messages);
    setCopyFeedback(feedbackFromResult(result, "تم النسخ!"));
    setTimeout(() => setCopyFeedback({ type: "idle" }), FEEDBACK_TIMEOUT);
  }, [session, messages]);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-white/55 font-cairo">تصدير:</span>

      <button
        onClick={handleExportJSON}
        className={`px-3 py-1.5 text-xs border rounded-md transition font-cairo ${
          jsonFeedback.type === "success"
            ? "border-green-500 bg-green-500/10 text-green-300"
            : jsonFeedback.type === "error"
              ? "border-red-500 bg-red-500/10 text-red-300"
              : "border-border bg-background text-foreground hover:bg-white/6"
        }`}
        title="تصدير بصيغة JSON"
      >
        {jsonFeedback.type === "success"
          ? "تم ✓"
          : jsonFeedback.type === "error"
            ? jsonFeedback.message
            : "JSON"}
      </button>

      <button
        onClick={handleExportMD}
        className={`px-3 py-1.5 text-xs border rounded-md transition font-cairo ${
          mdFeedback.type === "success"
            ? "border-green-500 bg-green-500/10 text-green-300"
            : mdFeedback.type === "error"
              ? "border-red-500 bg-red-500/10 text-red-300"
              : "border-border bg-background text-foreground hover:bg-white/6"
        }`}
        title="تصدير بصيغة Markdown"
      >
        {mdFeedback.type === "success"
          ? "تم ✓"
          : mdFeedback.type === "error"
            ? mdFeedback.message
            : "Markdown"}
      </button>

      <button
        onClick={handleCopy}
        className={`px-3 py-1.5 text-xs border rounded-md transition font-cairo ${
          copyFeedback.type === "success"
            ? "border-green-500 bg-green-500/10 text-green-300"
            : copyFeedback.type === "error"
              ? "border-red-500 bg-red-500/10 text-red-300"
              : "border-border bg-background text-foreground hover:bg-white/6"
        }`}
        title="نسخ الملخص"
      >
        {copyFeedback.type === "success"
          ? "تم النسخ!"
          : copyFeedback.type === "error"
            ? copyFeedback.message
            : "نسخ"}
      </button>
    </div>
  );
}
