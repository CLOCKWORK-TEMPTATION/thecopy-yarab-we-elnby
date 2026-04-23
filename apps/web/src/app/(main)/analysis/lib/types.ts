/**
 * Shared types for the analysis surface. The shapes mirror the backend's
 * `analysisStream.registry.ts` so events and snapshots can flow end-to-end
 * without translation.
 */

export type StationId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type StationStatus =
  | "idle"
  | "queued"
  | "running"
  | "completed"
  | "failed";

export type PipelineStatus =
  | "idle"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface StationState {
  id: StationId;
  name: string;
  status: StationStatus;
  progress: number;
  startedAt: string | null;
  completedAt: string | null;
  output: unknown | null;
  error: string | null;
  confidence: number | null;
}

export interface PipelineWarning {
  id: string;
  stationId: StationId | null;
  message: string;
  severity: "info" | "warn" | "error";
  at: string;
}

export interface AnalysisSnapshot {
  analysisId: string;
  projectId: string | null;
  projectName: string;
  status: PipelineStatus;
  startedAt: string;
  completedAt: string | null;
  textLength: number;
  stations: StationState[];
  warnings: PipelineWarning[];
  finalReport: string | null;
  metadata: Record<string, unknown>;
}

export type StreamEvent =
  | {
      type: "pipeline.started";
      analysisId: string;
      projectName: string;
      capabilities: { exports: string[] };
    }
  | { type: "pipeline.warning"; warning: PipelineWarning }
  | {
      type: "pipeline.completed";
      status: "completed" | "failed";
      durationMs: number;
    }
  | {
      type: "station.started";
      stationId: StationId;
      name: string;
      at: string;
    }
  | { type: "station.progress"; stationId: StationId; progress: number }
  | { type: "station.token"; stationId: StationId; token: string }
  | {
      type: "station.completed";
      stationId: StationId;
      output: unknown;
      confidence: number | null;
      durationMs: number;
    }
  | { type: "station.error"; stationId: StationId; message: string };

export const STATION_IDS: readonly StationId[] = [1, 2, 3, 4, 5, 6, 7] as const;

export const STATION_NAMES: Record<StationId, string> = {
  1: "التحليل العميق للشخصيات",
  2: "التحليل المتقدم للحوار",
  3: "التحليل البصري والسينمائي",
  4: "تحليل الموضوعات والرسائل",
  5: "التحليل الثقافي والتاريخي",
  6: "تحليل قابلية الإنتاج",
  7: "تحليل الجمهور والتقرير النهائي",
};

export interface AnalysisRelationship {
  source: string;
  target: string;
  kind: string;
  weight: number;
}
