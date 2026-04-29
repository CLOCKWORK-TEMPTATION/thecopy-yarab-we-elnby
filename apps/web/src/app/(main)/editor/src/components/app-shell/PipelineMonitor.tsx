"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

import { definedProps } from "@/lib/defined-props";
import {
  pipelineRecorder,
  type PipelineEvent,
  type RecordedAICorrection,
} from "@editor/extensions/pipeline-recorder";

import {
  getStageMeta,
  KNOWN_STAGES,
  ProgressBar,
  RunStagesPanel,
  TypeDistBar,
  type StageEntry,
} from "./PipelineMonitorParts";

import type { ProgressiveSurfaceState } from "../editor/editor-area.types";

interface RunState {
  runId: string;
  source: string;
  inputLines: number;
  inputChars: number;
  startedAt: number;
  stages: StageEntry[];
  aiCorrections: RecordedAICorrection[];
  finished: boolean;
  totalDurationMs: number;
  finalTypeDist: Record<string, number>;
}

// ─── مكون لوحة استعادة الفشل ─────────────────────────────────────

const FailureRecoveryBanner: React.FC<{
  message: string | null;
  onDismiss: () => void;
}> = ({ message, onDismiss }) => (
  <div className="border-b border-white/8 bg-black/22 px-4 py-3 text-[11px] text-white/85">
    <div className="font-bold">آخر نسخة صالحة ما زالت ظاهرة</div>
    <div className="mt-1 text-white/68">
      {message ?? "فشل تشغيل لاحق بعد الظهور."}
    </div>
    <button
      type="button"
      onClick={onDismiss}
      className="mt-3 rounded-md bg-amber-500 px-3 py-1.5 text-[11px] font-bold text-black transition-colors hover:bg-amber-400"
    >
      إغلاق الفشل وفتح السطح
    </button>
  </div>
);

// ─── المكون الرئيسي ──────────────────────────────────────────────

function applyRunStartEvent(
  event: Extract<PipelineEvent, { kind: "run-start" }>,
  setRun: React.Dispatch<React.SetStateAction<RunState | null>>,
  setElapsed: React.Dispatch<React.SetStateAction<number>>,
  addLog: (msg: string) => void
): void {
  setRun({
    runId: event.runId,
    source: event.source,
    inputLines: event.input.lineCount,
    inputChars: event.input.textLength,
    startedAt: performance.now(),
    stages: [],
    aiCorrections: [],
    finished: false,
    totalDurationMs: 0,
    finalTypeDist: {},
  });
  setElapsed(0);
  addLog(
    `▶ بداية run — المصدر: ${event.source} | ${event.input.lineCount} سطر`
  );
}

function applySnapshotEvent(
  event: Extract<PipelineEvent, { kind: "snapshot" }>,
  setRun: React.Dispatch<React.SetStateAction<RunState | null>>,
  addLog: (msg: string) => void
): void {
  setRun((prev) => {
    if (!prev) return prev;
    return {
      ...prev,
      stages: [
        ...prev.stages,
        definedProps({
          stage: event.stage,
          lineCount: event.lineCount,
          changes: event.changes,
          latencyMs: event.latencyMs,
          timestamp: performance.now(),
          metadata: event.metadata,
          activeFiles: event.activeFiles,
        }),
      ],
    };
  });
  addLog(
    `${getStageMeta(event.stage).icon} ${getStageMeta(event.stage).label} — ${event.lineCount} سطر${event.changes > 0 ? ` | ${event.changes} تغيير` : ""}${event.latencyMs > 0 ? ` | ${event.latencyMs}ms` : ""}${event.activeFiles.length > 0 ? `\n    📁 ${event.activeFiles.join(" · ")}` : ""}`
  );
}

function applyRunEndEvent(
  event: Extract<PipelineEvent, { kind: "run-end" }>,
  setRun: React.Dispatch<React.SetStateAction<RunState | null>>,
  addLog: (msg: string) => void
): void {
  setRun((prev) => {
    if (!prev) return prev;
    return {
      ...prev,
      finished: true,
      totalDurationMs: event.totalDurationMs,
      finalTypeDist: event.finalTypeDist,
    };
  });
  addLog(
    `${event.outcome === "failed-after-visible" ? "⚠️ انتهى مع فشل بعد الظهور" : "✅ اكتمل"} في ${(event.totalDurationMs / 1000).toFixed(1)}s — ${event.totalVerdicts} تصحيح AI`
  );
}

function buildPipelineEventHandler(
  setRun: React.Dispatch<React.SetStateAction<RunState | null>>,
  setElapsed: React.Dispatch<React.SetStateAction<number>>,
  addLog: (msg: string) => void
): (event: PipelineEvent) => void {
  return (event: PipelineEvent) => {
    switch (event.kind) {
      case "run-start":
        applyRunStartEvent(event, setRun, setElapsed, addLog);
        break;

      case "snapshot":
        applySnapshotEvent(event, setRun, addLog);
        break;

      case "ai-correction":
        setRun((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            aiCorrections: [...prev.aiCorrections, event.correction],
          };
        });
        addLog(
          `🤖 تصحيح AI [${event.correction.lineIndex}]: ${event.correction.previousType} → ${event.correction.correctedType} (${event.correction.applied ? "✅" : "❌"})`
        );
        break;

      case "approval":
        addLog(
          `✅ اعتماد النسخة ${event.approval.approvedVersionId} مع ${event.approval.elementCount} عنصر`
        );
        break;

      case "run-end":
        applyRunEndEvent(event, setRun, addLog);
        break;

      case "run-failure":
        addLog(
          `⛔ فشل المرحلة ${event.stage}: ${event.message}${event.code ? ` [${event.code}]` : ""}`
        );
        break;

      case "engine-bridge":
        addLog(
          `🌉 البريدج — المصدر: ${event.source} | ${event.elementCount} عنصر | ${event.latencyMs}ms`
        );
        break;

      case "file-open":
        addLog(
          `📂 فتح ملف: ${event.fileName} (نوع: ${event.fileType} | وضع: ${event.mode})`
        );
        break;

      case "file-extract-done":
        addLog(
          `📦 استخراج: ${event.fileName} — طريقة: ${event.method}${event.usedOcr ? " (OCR)" : ""} | ${event.textLength} حرف | ${event.schemaElementCount} عنصر schema | ${event.latencyMs}ms`
        );
        break;
    }
  };
}

function PipelineHeader({
  run,
  elapsed,
  logEntries,
  onDownload,
  onClose,
}: {
  run: RunState | null;
  elapsed: number;
  logEntries: string[];
  onDownload: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/8 px-4 py-2.5">
      <div className="flex items-center gap-2">
        <span className="text-base">📡</span>
        <span className="text-sm font-semibold text-white">
          مراقب الـ Pipeline
        </span>
        {run && !run.finished && (
          <span className="animate-pulse text-[10px] text-cyan-400 tabular-nums">
            LIVE
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {run && (
          <span className="text-[10px] text-white/45 tabular-nums">
            {run.finished
              ? `${(run.totalDurationMs / 1000).toFixed(1)}s`
              : `${(elapsed / 1000).toFixed(1)}s`}
          </span>
        )}
        <button
          onClick={onDownload}
          disabled={logEntries.length === 0}
          className="px-1 text-sm leading-none text-white/45 transition-colors hover:text-white/68 disabled:cursor-not-allowed disabled:opacity-30"
          title="تحميل السجل"
        >
          ⬇
        </button>
        <button
          onClick={onClose}
          className="px-1 text-lg leading-none text-white/45 transition-colors hover:text-white/68"
          title="إغلاق (Ctrl+Shift+M)"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function RunInfoPanel({
  run,
  completedStages,
}: {
  run: RunState | null;
  completedStages: string[];
}) {
  if (!run) {
    return (
      <div className="px-4 py-6 text-center text-xs text-white/55">
        في انتظار عملية لصق أو استيراد ملف...
      </div>
    );
  }

  return (
    <div className="space-y-1 border-b border-white/8 px-4 py-2 text-[11px] text-white/45">
      <div className="flex justify-between">
        <span>
          المصدر: <span className="text-white/68">{run.source}</span>
        </span>
        <span>
          {run.inputLines} سطر · {run.inputChars} حرف
        </span>
      </div>
      <ProgressBar
        current={completedStages.length}
        total={KNOWN_STAGES.length}
      />
    </div>
  );
}

function FailureRecoverySlot({
  progressiveSurfaceState,
  onDismissFailure,
}: {
  progressiveSurfaceState: ProgressiveSurfaceState | null;
  onDismissFailure: () => void;
}) {
  const activeRun = progressiveSurfaceState?.activeRun;
  if (
    activeRun?.status !== "failed-after-visible" ||
    !activeRun.failureRecoveryRequired
  ) {
    return null;
  }

  return (
    <FailureRecoveryBanner
      message={activeRun.latestFailureMessage ?? null}
      onDismiss={onDismissFailure}
    />
  );
}

function CorrectionsSummary({
  run,
  appliedCorrections,
}: {
  run: RunState | null;
  appliedCorrections: number;
}) {
  if (!run || run.aiCorrections.length === 0) return null;

  return (
    <div className="border-b border-white/8 px-4 py-2 text-[11px]">
      <span className="text-white/45">
        تصحيحات AI:{" "}
        <span className="text-emerald-400">{appliedCorrections} مطبّق</span>
        {" · "}
        <span className="text-white/55">
          {run.aiCorrections.length - appliedCorrections} مرفوض
        </span>
      </span>
    </div>
  );
}

function TypeDistributionSection({ run }: { run: RunState | null }) {
  if (!run?.finished || Object.keys(run.finalTypeDist).length === 0) {
    return null;
  }

  return (
    <div className="border-b border-white/8 px-4 py-2">
      <TypeDistBar dist={run.finalTypeDist} />
    </div>
  );
}

function LiveLog({
  logRef,
  logEntries,
}: {
  logRef: React.RefObject<HTMLDivElement | null>;
  logEntries: string[];
}) {
  return (
    <div
      ref={logRef}
      className="max-h-[180px] min-h-[100px] flex-1 space-y-0.5 overflow-y-auto px-3 py-2 font-mono text-[10px] leading-relaxed text-white/45"
    >
      {logEntries.length === 0 ? (
        <div className="py-4 text-center text-white/55">
          السجل فارغ — الصق نص أو افتح ملف
        </div>
      ) : (
        logEntries.map((entry, i) => (
          <div key={i} className="break-all whitespace-pre-wrap">
            {entry}
          </div>
        ))
      )}
    </div>
  );
}

export const PipelineMonitor: React.FC<{
  visible: boolean;
  progressiveSurfaceState: ProgressiveSurfaceState | null;
  onDismissFailure: () => void;
  onClose: () => void;
}> = ({ visible, progressiveSurfaceState, onDismissFailure, onClose }) => {
  const [run, setRun] = useState<RunState | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const [logEntries, setLogEntries] = useState<string[]>([]);

  const addLog = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString("ar-EG", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    setLogEntries((prev) => [...prev.slice(-60), `[${ts}] ${msg}`]);
  }, []);

  useEffect(() => {
    const handler = buildPipelineEventHandler(setRun, setElapsed, addLog);
    const unsub = pipelineRecorder.subscribe(handler);
    return unsub;
  }, [addLog]);

  // مؤقت الوقت المنقضي
  useEffect(() => {
    if (run && !run.finished) {
      timerRef.current = setInterval(() => {
        setElapsed(Math.round(performance.now() - run.startedAt));
      }, 100);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [run?.finished, run?.startedAt, run]);

  // Auto-scroll log
  useEffect(() => {
    logRef.current?.scrollTo({
      top: logRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [logEntries]);

  if (!visible) return null;

  const completedStages = run?.stages.map((s) => s.stage) ?? [];
  const activeStageIndex = run && !run.finished ? completedStages.length : -1;
  const appliedCorrections =
    run?.aiCorrections.filter((c) => c.applied).length ?? 0;

  const downloadLog = () => {
    if (logEntries.length === 0) return;
    const header = run
      ? `Pipeline Run: ${run.runId}\nSource: ${run.source}\nLines: ${run.inputLines} | Chars: ${run.inputChars}\nDuration: ${run.finished ? `${(run.totalDurationMs / 1000).toFixed(1)}s` : "in-progress"}\n${"─".repeat(50)}\n\n`
      : "";
    const blob = new Blob([header + logEntries.join("\n")], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pipeline-log-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      ref={panelRef}
      dir="rtl"
      className="fixed bottom-4 left-4 z-[9999] flex max-h-[85vh] w-[420px] flex-col overflow-hidden rounded-[22px] border border-white/8 bg-black/14 shadow-2xl shadow-black/40 backdrop-blur-xl select-none"
    >
      <PipelineHeader
        run={run}
        elapsed={elapsed}
        logEntries={logEntries}
        onDownload={downloadLog}
        onClose={onClose}
      />
      <RunInfoPanel run={run} completedStages={completedStages} />
      <FailureRecoverySlot
        progressiveSurfaceState={progressiveSurfaceState}
        onDismissFailure={onDismissFailure}
      />

      {/* ── Stages ── */}
      {run && (
        <RunStagesPanel
          stages={run.stages}
          finished={run.finished}
          activeStageIndex={activeStageIndex}
          completedStages={completedStages}
        />
      )}

      <CorrectionsSummary run={run} appliedCorrections={appliedCorrections} />
      <TypeDistributionSection run={run} />
      <LiveLog logRef={logRef} logEntries={logEntries} />
    </div>
  );
};
