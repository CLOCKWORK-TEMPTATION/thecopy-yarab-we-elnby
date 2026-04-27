/**
 * @module extensions/pipeline-recorder
 * @description
 * رادار شامل — يسجّل كل مراحل الـ pipeline من لحظة اللصق حتى آخر تصحيح AI.
 *
 * يأخذ snapshot في كل مرحلة ويحسب الـ diffs بين كل مرحلتين متتاليتين.
 * يسجّل تصحيحات AI بشكل فردي (applied/skipped).
 *
 * الاستخدام من الـ console:
 *   window.__showPipelineRun()        // تقرير مُنسّق بالجداول
 *   window.__showLineJourney(15)      // رحلة سطر واحد عبر كل المراحل
 *   window.__lastPipelineRun          // الـ raw data
 *
 * يُصدّر:
 * - {@link pipelineRecorder} — الـ singleton
 * - {@link registerPipelineRecorderUI} — ربط بالـ window
 */

import { definedProps } from "@/lib/defined-props";
import { logger } from "@/lib/logger";

type PipelineRecorderDebugWindow = Window & {
  __lastPipelineRun?: PipelineRunReport | null;
  __showPipelineRun?: () => void;
  __showLineJourney?: (lineIndex: number) => void;
  __pipelineRecorderUiRegistered?: boolean;
};

const isPipelineConsoleDebugEnabled = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem("filmlane.pipeline.debug") === "true";
  } catch {
    return false;
  }
};

const logRecorderTable = (label: string, data: unknown): void => {
  logger.warn(label, data);
};

// ─── الأنواع ──────────────────────────────────────────────────────

/** سطر واحد في snapshot (خفيف — بدون النص الكامل) */
export interface SnapshotLine {
  readonly type: string;
  readonly confidence: number;
  readonly method: string;
  readonly text: string; // أول 50 حرف
}

/** snapshot لمرحلة واحدة */
export interface PipelineSnapshot {
  readonly stage: string;
  readonly timestamp: number; // performance.now()
  readonly lines: readonly SnapshotLine[];
  readonly metadata?: Record<string, unknown>;
}

/** تغيير سطر بين مرحلتين */
export interface LineChange {
  readonly lineIndex: number;
  readonly text: string;
  readonly fromType: string;
  readonly toType: string;
  readonly confidenceDelta: number;
}

/** diff بين مرحلتين متتاليتين */
export interface StageDiff {
  readonly fromStage: string;
  readonly toStage: string;
  readonly latencyMs: number;
  readonly changes: readonly LineChange[];
}

/** تصحيح AI مسجّل */
export interface RecordedAICorrection {
  readonly lineIndex: number;
  readonly text: string;
  readonly previousType: string;
  readonly correctedType: string;
  readonly confidence: number;
  readonly source: string;
  readonly applied: boolean;
  readonly reason?: string;
}

export interface RecordedApproval {
  readonly runId: string;
  readonly approvedVersionId: string;
  readonly replacesVersionId: string | null;
  readonly elementCount: number;
  readonly approvedAt: string;
}

/** تقرير run كامل */
export interface PipelineRunReport {
  readonly runId: string;
  readonly source: string;
  readonly sourceType?: string;
  readonly intakeKind?: "paste" | "file-open";
  readonly fileName?: string | null;
  readonly startTime: number;
  endTime: number;
  totalDurationMs: number;
  readonly input: { textLength: number; lineCount: number };
  readonly snapshots: PipelineSnapshot[];
  readonly diffs: StageDiff[];
  readonly aiCorrections: RecordedAICorrection[];
  readonly approvals: RecordedApproval[];
  finalTypeDist: Record<string, number>;
  failure?: {
    stage: string;
    message: string;
    code?: string;
  };
}

// ─── Snapshot Line Builder ────────────────────────────────────────

const toSnapshotLine = (item: {
  type: string;
  text: string;
  confidence: number;
  classificationMethod?: string;
}): SnapshotLine => ({
  type: item.type,
  confidence: item.confidence,
  method: item.classificationMethod ?? "unknown",
  text: item.text.slice(0, 50),
});

// ─── Diff Engine ──────────────────────────────────────────────────

const computeDiff = (
  from: PipelineSnapshot,
  to: PipelineSnapshot
): StageDiff => {
  const changes: LineChange[] = [];
  const len = Math.max(from.lines.length, to.lines.length);

  for (let i = 0; i < len; i++) {
    const f = from.lines[i];
    const t = to.lines[i];
    if (!f || !t) {
      // سطر مضاف أو محذوف
      changes.push({
        lineIndex: i,
        text: (f?.text ?? t?.text ?? "").slice(0, 50),
        fromType: f?.type ?? "—",
        toType: t?.type ?? "—",
        confidenceDelta: (t?.confidence ?? 0) - (f?.confidence ?? 0),
      });
      continue;
    }
    if (f.type !== t.type) {
      changes.push({
        lineIndex: i,
        text: f.text,
        fromType: f.type,
        toType: t.type,
        confidenceDelta: t.confidence - f.confidence,
      });
    }
  }

  return {
    fromStage: from.stage,
    toStage: to.stage,
    latencyMs: Math.round(to.timestamp - from.timestamp),
    changes,
  };
};

// ─── Type Distribution ────────────────────────────────────────────

const computeTypeDist = (
  lines: readonly SnapshotLine[]
): Record<string, number> => {
  const dist: Record<string, number> = {};
  for (const line of lines) {
    dist[line.type] = (dist[line.type] ?? 0) + 1;
  }
  return dist;
};

// ─── Event Bus ────────────────────────────────────────────────────

export type PipelineEvent =
  | {
      kind: "run-start";
      runId: string;
      source: string;
      sourceType?: string;
      intakeKind?: "paste" | "file-open";
      fileName?: string | null;
      input: { textLength: number; lineCount: number };
    }
  | {
      kind: "snapshot";
      stage: string;
      lineCount: number;
      changes: number;
      latencyMs: number;
      metadata?: Record<string, unknown>;
      activeFiles: string[];
    }
  | { kind: "ai-correction"; correction: RecordedAICorrection }
  | { kind: "approval"; approval: RecordedApproval }
  | {
      kind: "run-failure";
      stage: string;
      message: string;
      code?: string;
    }
  | {
      kind: "run-end";
      totalDurationMs: number;
      totalVerdicts: number;
      finalTypeDist: Record<string, number>;
      outcome: "settled" | "failed-after-visible";
    }
  | {
      kind: "engine-bridge";
      source: string;
      elementCount: number;
      latencyMs: number;
    }
  | { kind: "file-open"; fileName: string; fileType: string; mode: string }
  | {
      kind: "file-extract-done";
      fileName: string;
      method: string;
      usedOcr: boolean;
      textLength: number;
      schemaElementCount: number;
      latencyMs: number;
    };

type PipelineEventListener = (event: PipelineEvent) => void;

// ─── الفئة الرئيسية ──────────────────────────────────────────────

class PipelineRecorder {
  private _currentRun: PipelineRunReport | null = null;
  private _lastCompletedRun: PipelineRunReport | null = null;
  private readonly _listeners = new Set<PipelineEventListener>();
  private readonly _trackedFiles = new Set<string>();

  subscribe(listener: PipelineEventListener): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  private _emit(event: PipelineEvent): void {
    for (const listener of this._listeners) {
      try {
        listener(event);
      } catch {
        /* سلامة — لا نوقف الـ pipeline بسبب خطأ UI */
      }
    }
  }

  /**
   * بداية run جديد — يُستدعى عند أول مرحلة في الـ pipeline.
   */
  startRun(
    source: string,
    input: { textLength: number; lineCount: number },
    metadata?: {
      sourceType?: string;
      intakeKind?: "paste" | "file-open";
      fileName?: string | null;
    }
  ): void {
    const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    this._currentRun = {
      runId,
      source,
      fileName: metadata?.fileName ?? null,
      startTime: performance.now(),
      endTime: 0,
      totalDurationMs: 0,
      input,
      snapshots: [],
      diffs: [],
      aiCorrections: [],
      approvals: [],
      finalTypeDist: {},
      ...definedProps({
        sourceType: metadata?.sourceType,
        intakeKind: metadata?.intakeKind,
      }),
    };
    this._emit({
      kind: "run-start" as const,
      runId,
      source,
      fileName: metadata?.fileName ?? null,
      input,
      ...definedProps({
        sourceType: metadata?.sourceType,
        intakeKind: metadata?.intakeKind,
      }),
    });
  }

  /**
   * تسجيل snapshot لمرحلة.
   *
   * @param stage - اسم المرحلة (مثل "forward-pass", "retroactive")
   * @param classified - مصفوفة العناصر المصنفة
   * @param metadata - بيانات إضافية (مثل عدد التصحيحات لكل pattern)
   */
  snapshot(
    stage: string,
    classified: readonly {
      type: string;
      text: string;
      confidence: number;
      classificationMethod?: string;
    }[],
    metadata?: Record<string, unknown>
  ): void {
    if (!this._currentRun) return;

    const snap: PipelineSnapshot = definedProps({
      stage,
      timestamp: performance.now(),
      lines: classified.map(toSnapshotLine),
      metadata,
    });

    const snaps = this._currentRun.snapshots;
    snaps.push(snap);

    let changes = 0;
    let latencyMs = 0;
    // حساب diff مع المرحلة السابقة
    if (snaps.length >= 2) {
      const prev = snaps.at(-2);
      if (prev) {
        const diff = computeDiff(prev, snap);
        this._currentRun.diffs.push(diff);
        changes = diff.changes.length;
        latencyMs = diff.latencyMs;
      }
    }

    const activeFiles = [...this._trackedFiles];
    this._trackedFiles.clear();
    this._emit({
      kind: "snapshot",
      stage,
      lineCount: classified.length,
      changes,
      latencyMs,
      activeFiles,
      ...definedProps({ metadata }),
    });
  }

  /**
   * تسجيل تصحيح AI (من progressive updater).
   */
  logAICorrection(correction: RecordedAICorrection): void {
    if (!this._currentRun) return;
    this._currentRun.aiCorrections.push(correction);
    this._emit({ kind: "ai-correction", correction });
  }

  logApproval(approval: RecordedApproval): void {
    const targetRun = this._currentRun ?? this._lastCompletedRun;
    if (!targetRun) return;
    targetRun.approvals.push(approval);
    this._emit({ kind: "approval", approval });
  }

  logRunFailure(stage: string, message: string, code?: string): void {
    if (!this._currentRun) return;
    this._currentRun.failure = definedProps({ stage, message, code });
    this._emit({
      kind: "run-failure" as const,
      stage,
      message,
      ...definedProps({ code }),
    });
  }

  /**
   * رصد ملف كود اشتغل — يُستدعى من الملفات نفسها عند تنفيذ دوالها.
   */
  trackFile(fileName: string): void {
    this._trackedFiles.add(fileName);
  }

  /**
   * رصد استدعاء البريدج — observation only بدون لمس حالة الـ run.
   */
  logBridgeCall(source: string, elementCount: number, latencyMs: number): void {
    this._emit({ kind: "engine-bridge", source, elementCount, latencyMs });
  }

  /**
   * رصد فتح ملف — بداية رحلة الملف.
   */
  logFileOpen(fileName: string, fileType: string, mode: string): void {
    this._emit({ kind: "file-open", fileName, fileType, mode });
  }

  /**
   * رصد انتهاء استخراج الملف — الباك إند خلص.
   */
  logFileExtractDone(info: {
    fileName: string;
    method: string;
    usedOcr: boolean;
    textLength: number;
    schemaElementCount: number;
    latencyMs: number;
  }): void {
    this._emit({ kind: "file-extract-done", ...info });
  }

  /**
   * إنهاء الـ run الحالي.
   */
  finishRun(): void {
    if (!this._currentRun) return;

    this._currentRun.endTime = performance.now();
    this._currentRun.totalDurationMs = Math.round(
      this._currentRun.endTime - this._currentRun.startTime
    );

    // حساب الـ type distribution النهائي
    const lastSnap =
      this._currentRun.snapshots[this._currentRun.snapshots.length - 1];
    if (lastSnap) {
      this._currentRun.finalTypeDist = computeTypeDist(lastSnap.lines);
    }

    this._emit({
      kind: "run-end",
      totalDurationMs: this._currentRun.totalDurationMs,
      totalVerdicts: this._currentRun.aiCorrections.filter((c) => c.applied)
        .length,
      finalTypeDist: this._currentRun.finalTypeDist,
      outcome: this._currentRun.failure ? "failed-after-visible" : "settled",
    });

    this._lastCompletedRun = this._currentRun;
    this._currentRun = null;
  }

  /**
   * هل فيه run شغّال دلوقتي؟
   */
  get isRunning(): boolean {
    return this._currentRun !== null;
  }

  /**
   * آخر run اتسجّل (أو الشغّال حالياً).
   */
  get lastRun(): PipelineRunReport | null {
    return this._currentRun ?? this._lastCompletedRun;
  }
}

// ─── Singleton ────────────────────────────────────────────────────

export const pipelineRecorder = new PipelineRecorder();

// ─── Console UI ───────────────────────────────────────────────────

const printRunReport = (report: PipelineRunReport): void => {
  logger.warn(
    "%c╔══════════════════════════════════════════════════════╗",
    "color: #00ccff; font-weight: bold"
  );
  logger.warn(
    "%c║      📡 Pipeline Run Report                          ║",
    "color: #00ccff; font-weight: bold"
  );
  logger.warn(
    "%c╚══════════════════════════════════════════════════════╝",
    "color: #00ccff; font-weight: bold"
  );

  // ── ملخص عام ──
  const frontendMs =
    report.snapshots.length >= 2
      ? Math.round(
          (report.snapshots.find((s) => s.stage === "render-first")
            ?.timestamp ??
            report.snapshots[report.snapshots.length - 1]?.timestamp ??
            0) - (report.snapshots[0]?.timestamp ?? 0)
        )
      : 0;
  const aiMs = report.totalDurationMs - frontendMs;

  logger.warn(
    `\n📋 Source: ${report.source} | ${report.input.lineCount} lines | ${report.input.textLength} chars`
  );
  logger.warn(
    `⏱️ Total: ${(report.totalDurationMs / 1000).toFixed(1)}s (frontend: ${frontendMs}ms, AI: ${(aiMs / 1000).toFixed(1)}s)`
  );
  logger.warn(`🆔 Run ID: ${report.runId}`);

  // ── جدول المراحل ──
  logger.warn(
    "\n%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "color: #888"
  );
  logger.warn(
    "%c📊 Stage-by-Stage Progression:",
    "color: #ffcc00; font-weight: bold"
  );

  const stageTable = report.snapshots.map((snap, idx) => {
    const diff = idx > 0 ? report.diffs[idx - 1] : null;
    const prevSnap = idx > 0 ? report.snapshots[idx - 1] : null;
    const latency = prevSnap
      ? Math.round(snap.timestamp - prevSnap.timestamp)
      : 0;

    return {
      "#": idx + 1,
      Stage: snap.stage,
      Lines: snap.lines.length,
      Changes: diff ? diff.changes.length : "—",
      Duration: idx === 0 ? "—" : `${latency}ms`,
      Notes: snap.metadata
        ? Object.entries(snap.metadata)
            .map(([k, v]) => `${k}=${v}`)
            .join(", ")
            .slice(0, 60)
        : "",
    };
  });

  logRecorderTable("Stage-by-stage progression", stageTable);

  // ── Type Distribution النهائي ──
  logger.warn(
    "\n%c📦 Final Type Distribution:",
    "color: #00ff88; font-weight: bold"
  );

  logRecorderTable("Final type distribution", report.finalTypeDist);

  // ── Diffs بين المراحل ──
  for (const diff of report.diffs) {
    if (diff.changes.length === 0) continue;

    logger.warn(
      `\n%c🔄 ${diff.fromStage} → ${diff.toStage}: ${diff.changes.length} changes (${diff.latencyMs}ms)`,
      "color: #ff6b6b; font-weight: bold"
    );

    const sample = diff.changes.slice(0, 15);

    logRecorderTable(
      "Stage diff sample",
      sample.map((c) => ({
        "Line#": c.lineIndex,
        Text: c.text.slice(0, 40),
        Before: c.fromType,
        "→ After": c.toType,
        "Δ Conf":
          c.confidenceDelta > 0
            ? `+${c.confidenceDelta}`
            : `${c.confidenceDelta}`,
      }))
    );
    if (diff.changes.length > 15) {
      logger.warn(`   ... و ${diff.changes.length - 15} تغيير تاني`);
    }
  }

  // ── تصحيحات AI ──
  const applied = report.aiCorrections.filter((c) => c.applied);
  const skipped = report.aiCorrections.filter((c) => !c.applied);

  if (report.aiCorrections.length > 0) {
    logger.warn(
      "\n%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "color: #888"
    );
    logger.warn(
      `%c🤖 AI Corrections: ${applied.length} applied, ${skipped.length} skipped`,
      "color: #ff00ff; font-weight: bold"
    );

    // تجميع حسب المصدر
    const bySource = new Map<string, { applied: number; skipped: number }>();
    for (const c of report.aiCorrections) {
      const entry = bySource.get(c.source) ?? { applied: 0, skipped: 0 };
      if (c.applied) entry.applied++;
      else entry.skipped++;
      bySource.set(c.source, entry);
    }

    logRecorderTable(
      "AI corrections by source",
      Object.fromEntries(
        Array.from(bySource.entries()).map(([source, stats]) => [source, stats])
      )
    );

    if (applied.length > 0) {
      logger.warn(
        "\n%c✅ Applied AI Corrections:",
        "color: #00ff88; font-weight: bold"
      );

      logRecorderTable(
        "Applied AI corrections",
        applied.slice(0, 20).map((c) => ({
          "Line#": c.lineIndex,
          Text: c.text.slice(0, 35),
          From: c.previousType,
          "→ To": c.correctedType,
          Conf: c.confidence.toFixed(2),
          Source: c.source,
        }))
      );
    }
  }

  logger.warn("\n%c─── Full report object: ───", "color: #888");
  logger.warn({ report }, "pipeline run report");
};

const printLineJourney = (
  report: PipelineRunReport,
  lineIndex: number
): void => {
  logger.warn(
    `%c📍 Line Journey: #${lineIndex}`,
    "color: #00ccff; font-weight: bold; font-size: 14px"
  );

  // بحث عن النص من أول snapshot
  const firstSnap = report.snapshots[0];
  const lineText = firstSnap?.lines[lineIndex]?.text ?? "???";
  logger.warn(`   "${lineText}"\n`);

  // رحلة عبر الـ snapshots
  const journey: {
    Stage: string;
    Type: string;
    Confidence: number;
    Method: string;
    Changed: string;
  }[] = [];

  let prevType: string | null = null;
  for (const snap of report.snapshots) {
    const line = snap.lines[lineIndex];
    if (!line) continue;

    const changed =
      prevType !== null && line.type !== prevType
        ? `⚠️ ${prevType} → ${line.type}`
        : prevType === null
          ? "—"
          : "✅ unchanged";

    journey.push({
      Stage: snap.stage,
      Type: line.type,
      Confidence: line.confidence,
      Method: line.method,
      Changed: changed,
    });

    prevType = line.type;
  }

  logRecorderTable("Line journey", journey);

  // تصحيحات AI لهذا السطر
  const aiForLine = report.aiCorrections.filter(
    (c) => c.lineIndex === lineIndex
  );
  if (aiForLine.length > 0) {
    logger.warn(
      `\n%c🤖 AI corrections for this line:`,
      "color: #ff00ff; font-weight: bold"
    );

    logRecorderTable(
      "AI corrections for line",
      aiForLine.map((c) => ({
        Source: c.source,
        From: c.previousType,
        "→ To": c.correctedType,
        Conf: c.confidence.toFixed(2),
        Applied: c.applied ? "✅" : "❌",
      }))
    );
  }

  // الحالة النهائية
  const lastSnap = report.snapshots[report.snapshots.length - 1];
  const finalLine = lastSnap?.lines[lineIndex];
  const lastAIApplied = aiForLine.filter((c) => c.applied).pop();

  const finalType = lastAIApplied?.correctedType ?? finalLine?.type ?? "???";
  logger.warn(
    `\n   Final type: %c${finalType}`,
    "color: #00ff88; font-weight: bold; font-size: 14px"
  );
};

// ─── ربط بالـ window ──────────────────────────────────────────────

/**
 * يسجّل `__showPipelineRun` و `__showLineJourney` و `__lastPipelineRun` على الـ window.
 */
export const registerPipelineRecorderUI = (): void => {
  if (typeof window === "undefined") return;

  const win = window as PipelineRecorderDebugWindow;
  const shouldLogReady =
    !win.__pipelineRecorderUiRegistered && isPipelineConsoleDebugEnabled();

  Object.defineProperty(win, "__lastPipelineRun", {
    get: () => pipelineRecorder.lastRun,
    configurable: true,
  });

  win.__showPipelineRun = (): void => {
    const report = pipelineRecorder.lastRun;
    if (!report) {
      logger.warn("⚠️ مفيش pipeline run مسجّل — الصق نص أو افتح ملف الأول");
      return;
    }
    printRunReport(report);
  };

  win.__showLineJourney = (lineIndex: number): void => {
    const report = pipelineRecorder.lastRun;
    if (!report) {
      logger.warn("⚠️ مفيش pipeline run مسجّل — الصق نص أو افتح ملف الأول");
      return;
    }
    if (typeof lineIndex !== "number" || lineIndex < 0) {
      logger.warn("⚠️ ادخل رقم السطر: __showLineJourney(15)");
      return;
    }
    printLineJourney(report, lineIndex);
  };

  win.__pipelineRecorderUiRegistered = true;

  if (shouldLogReady) {
    logger.warn(
      "%c📡 Pipeline recorder ready! After paste/import, run: __showPipelineRun() or __showLineJourney(lineIndex)",
      "color: #00ccff; font-weight: bold; font-size: 13px"
    );
  }
};
