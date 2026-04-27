import { definedProps } from "@/lib/defined-props";

import {
  computeDiff,
  computeTypeDist,
  toSnapshotLine,
} from "./helpers";

import type {
  PipelineEvent,
  PipelineEventListener,
  PipelineRunReport,
  RecordedAICorrection,
  RecordedApproval,
} from "./types";

export class PipelineRecorder {
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
        // Safety: UI listener errors must not stop the pipeline.
      }
    }
  }

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
      kind: "run-start",
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
    if (!this._currentRun) {
      return;
    }

    const snapshot = definedProps({
      stage,
      timestamp: performance.now(),
      lines: classified.map(toSnapshotLine),
      metadata,
    });

    const snapshots = this._currentRun.snapshots;
    snapshots.push(snapshot);

    let changes = 0;
    let latencyMs = 0;
    if (snapshots.length >= 2) {
      const prev = snapshots.at(-2);
      if (prev) {
        const diff = computeDiff(prev, snapshot);
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

  logAICorrection(correction: RecordedAICorrection): void {
    if (!this._currentRun) {
      return;
    }
    this._currentRun.aiCorrections.push(correction);
    this._emit({ kind: "ai-correction", correction });
  }

  logApproval(approval: RecordedApproval): void {
    const targetRun = this._currentRun ?? this._lastCompletedRun;
    if (!targetRun) {
      return;
    }
    targetRun.approvals.push(approval);
    this._emit({ kind: "approval", approval });
  }

  logRunFailure(stage: string, message: string, code?: string): void {
    if (!this._currentRun) {
      return;
    }
    this._currentRun.failure = definedProps({ stage, message, code });
    this._emit({
      kind: "run-failure",
      stage,
      message,
      ...definedProps({ code }),
    });
  }

  trackFile(fileName: string): void {
    this._trackedFiles.add(fileName);
  }

  logBridgeCall(source: string, elementCount: number, latencyMs: number): void {
    this._emit({ kind: "engine-bridge", source, elementCount, latencyMs });
  }

  logFileOpen(fileName: string, fileType: string, mode: string): void {
    this._emit({ kind: "file-open", fileName, fileType, mode });
  }

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

  finishRun(): void {
    if (!this._currentRun) {
      return;
    }

    this._currentRun.endTime = performance.now();
    this._currentRun.totalDurationMs = Math.round(
      this._currentRun.endTime - this._currentRun.startTime
    );

    const lastSnapshot = this._currentRun.snapshots[this._currentRun.snapshots.length - 1];
    if (lastSnapshot) {
      this._currentRun.finalTypeDist = computeTypeDist(lastSnapshot.lines);
    }

    this._emit({
      kind: "run-end",
      totalDurationMs: this._currentRun.totalDurationMs,
      totalVerdicts: this._currentRun.aiCorrections.filter((correction) => correction.applied)
        .length,
      finalTypeDist: this._currentRun.finalTypeDist,
      outcome: this._currentRun.failure ? "failed-after-visible" : "settled",
    });

    this._lastCompletedRun = this._currentRun;
    this._currentRun = null;
  }

  get isRunning(): boolean {
    return this._currentRun !== null;
  }

  get lastRun(): PipelineRunReport | null {
    return this._currentRun ?? this._lastCompletedRun;
  }
}
