export interface SnapshotLine {
  readonly type: string;
  readonly confidence: number;
  readonly method: string;
  readonly text: string;
}

export interface PipelineSnapshot {
  readonly stage: string;
  readonly timestamp: number;
  readonly lines: readonly SnapshotLine[];
  readonly metadata?: Record<string, unknown>;
}

export interface LineChange {
  readonly lineIndex: number;
  readonly text: string;
  readonly fromType: string;
  readonly toType: string;
  readonly confidenceDelta: number;
}

export interface StageDiff {
  readonly fromStage: string;
  readonly toStage: string;
  readonly latencyMs: number;
  readonly changes: readonly LineChange[];
}

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

export type PipelineEventListener = (event: PipelineEvent) => void;

export type PipelineRecorderDebugWindow = Window & {
  __lastPipelineRun?: PipelineRunReport | null;
  __showPipelineRun?: () => void;
  __showLineJourney?: (lineIndex: number) => void;
  __pipelineRecorderUiRegistered?: boolean;
};
