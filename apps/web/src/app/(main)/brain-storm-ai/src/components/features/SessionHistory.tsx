"use client";

/**
 * الصفحة: brain-storm-ai / SessionHistory
 * الهوية: سجل جلسات داخلي بطابع داكن متسق مع القشرة الشبكية الجديدة
 */

import { useCallback, useState } from "react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";

import { exportToJSON, exportToMarkdown } from "../../lib/export";

import type { SavedSession } from "../../hooks/useSessionPersistence";

interface SessionHistoryProps {
  sessions: SavedSession[];
  onLoad: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
  onClearAll: () => void;
}

interface ExportFeedback {
  sessionId: string;
  type: "success" | "error";
  message: string;
}

const FEEDBACK_TIMEOUT = 2500;

export function SessionHistory({
  sessions,
  onLoad,
  onDelete,
  onClearAll,
}: SessionHistoryProps) {
  const [feedback, setFeedback] = useState<ExportFeedback | null>(null);

  const showFeedback = useCallback((fb: ExportFeedback) => {
    setFeedback(fb);
    setTimeout(() => setFeedback(null), FEEDBACK_TIMEOUT);
  }, []);

  const handleExportJSON = useCallback(
    (saved: SavedSession): void => {
      const result = exportToJSON(saved.session, saved.messages);
      showFeedback({
        sessionId: saved.session.id,
        type: result.ok ? "success" : "error",
        message: result.ok ? "تم تصدير JSON" : result.error ?? "فشل التصدير",
      });
    },
    [showFeedback]
  );

  const handleExportMD = useCallback(
    (saved: SavedSession): void => {
      const result = exportToMarkdown(saved.session, saved.messages);
      showFeedback({
        sessionId: saved.session.id,
        type: result.ok ? "success" : "error",
        message: result.ok
          ? "تم تصدير Markdown"
          : result.error ?? "فشل التصدير",
      });
    },
    [showFeedback]
  );

  if (sessions.length === 0) {
    return (
      <CardSpotlight className="overflow-hidden rounded-[24px] border border-white/8 bg-black/18 p-6 text-center backdrop-blur-xl">
        <p className="text-sm text-white/52 font-cairo">
          لا توجد جلسات محفوظة بعد
        </p>
      </CardSpotlight>
    );
  }

  return (
    <CardSpotlight className="overflow-hidden rounded-[28px] border border-white/8 bg-black/24 p-4 backdrop-blur-xl">
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-semibold text-white font-cairo">
            الجلسات المحفوظة ({sessions.length})
          </h3>
          <button
            onClick={onClearAll}
            className="text-xs text-destructive hover:text-destructive/80 transition font-cairo"
          >
            مسح الكل
          </button>
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto">
          {sessions.map((saved) => {
            const activeFeedback =
              feedback?.sessionId === saved.session.id
                ? feedback
                : null;

            return (
              <CardSpotlight
                key={saved.session.id}
                className="overflow-hidden rounded-[22px] border border-white/8 bg-white/[0.04] p-3 backdrop-blur-xl"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0 text-right">
                      <p className="text-sm font-medium text-white truncate font-cairo">
                        {saved.session.brief}
                      </p>
                      <p className="text-xs text-white/50 mt-0.5 font-cairo">
                        المرحلة {saved.session.phase}/5 —{" "}
                        {saved.messages.length} رسالة
                      </p>
                    </div>
                    <span
                      className={`shrink-0 px-2 py-0.5 text-xs rounded-full ${
                        saved.session.status === "completed"
                          ? "bg-green-500/15 text-green-300"
                          : saved.session.status === "active"
                            ? "bg-blue-500/15 text-blue-300"
                            : "bg-white/8 text-white/70"
                      }`}
                    >
                      {saved.session.status === "completed"
                        ? "مكتمل"
                        : saved.session.status === "active"
                          ? "نشط"
                          : "متوقف"}
                    </span>
                  </div>

                  <p className="text-xs text-white/45 font-cairo text-right">
                    {new Date(saved.savedAt).toLocaleString("ar-SA")}
                  </p>

                  {activeFeedback ? (
                    <p
                      className={`text-xs font-cairo text-right ${
                        activeFeedback.type === "success"
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {activeFeedback.message}
                    </p>
                  ) : null}

                  <div className="flex gap-1.5 flex-wrap justify-end">
                    <button
                      onClick={() => onLoad(saved.session.id)}
                      className="px-2.5 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition font-cairo"
                    >
                      تحميل
                    </button>
                    <button
                      onClick={() => handleExportJSON(saved)}
                      className="px-2.5 py-1 text-xs border border-white/10 bg-black/18 text-white rounded hover:bg-white/8 transition font-cairo"
                    >
                      JSON
                    </button>
                    <button
                      onClick={() => handleExportMD(saved)}
                      className="px-2.5 py-1 text-xs border border-white/10 bg-black/18 text-white rounded hover:bg-white/8 transition font-cairo"
                    >
                      Markdown
                    </button>
                    <button
                      onClick={() => onDelete(saved.session.id)}
                      className="px-2.5 py-1 text-xs text-destructive border border-destructive/30 rounded hover:bg-destructive/10 transition font-cairo"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              </CardSpotlight>
            );
          })}
        </div>
      </div>
    </CardSpotlight>
  );
}
