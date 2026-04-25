/**
 * Reducer-based state machine for the analysis surface.
 *
 * The reducer is the single source of truth for the UI: it ingests the
 * snapshot returned by the backend on resume, the typed SSE events emitted
 * during a live run, and a small handful of UI intents (start, reset,
 * retry-acknowledged). It never persists results to sessionStorage.
 */

import {
  STATION_IDS,
  STATION_NAMES,
  type AnalysisSnapshot,
  type PipelineStatus,
  type PipelineWarning,
  type StationId,
  type StationState,
  type StreamEvent,
} from "./types";

export interface MachineState {
  analysisId: string | null;
  projectId: string | null;
  projectName: string;
  status: PipelineStatus;
  startedAt: string | null;
  completedAt: string | null;
  textLength: number;
  stations: StationState[];
  warnings: PipelineWarning[];
  finalReport: string | null;
  capabilities: { exports: string[] };
  lastEventAt: number | null;
  fatalError: string | null;
}

export const initialState: MachineState = {
  analysisId: null,
  projectId: null,
  projectName: "",
  status: "idle",
  startedAt: null,
  completedAt: null,
  textLength: 0,
  stations: STATION_IDS.map((id) => ({
    id,
    name: STATION_NAMES[id],
    status: "idle",
    progress: 0,
    startedAt: null,
    completedAt: null,
    output: null,
    error: null,
    confidence: null,
  })),
  warnings: [],
  finalReport: null,
  capabilities: { exports: ["json", "docx", "pdf"] },
  lastEventAt: null,
  fatalError: null,
};

export type MachineAction =
  | { type: "RESET" }
  | {
      type: "START_REQUESTED";
      projectName: string;
      projectId: string | null;
      textLength: number;
    }
  | {
      type: "SESSION_CREATED";
      analysisId: string;
    }
  | { type: "SESSION_FAILED"; message: string }
  | { type: "SNAPSHOT_LOADED"; snapshot: AnalysisSnapshot }
  | { type: "STREAM_EVENT"; event: StreamEvent }
  | { type: "RETRY_REQUESTED"; stationId: StationId };

function withStation(
  state: MachineState,
  stationId: StationId,
  updater: (s: StationState) => StationState
): MachineState {
  return {
    ...state,
    stations: state.stations.map((s) => (s.id === stationId ? updater(s) : s)),
  };
}

export function reducer(
  state: MachineState,
  action: MachineAction
): MachineState {
  switch (action.type) {
    case "RESET":
      return { ...initialState };

    case "START_REQUESTED":
      return {
        ...initialState,
        projectId: action.projectId,
        projectName: action.projectName,
        textLength: action.textLength,
        status: "running",
        startedAt: new Date().toISOString(),
      };

    case "SESSION_CREATED":
      return { ...state, analysisId: action.analysisId };

    case "SESSION_FAILED":
      return { ...state, status: "failed", fatalError: action.message };

    case "SNAPSHOT_LOADED": {
      const snap = action.snapshot;
      return {
        ...state,
        analysisId: snap.analysisId,
        projectId: snap.projectId,
        projectName: snap.projectName,
        status: snap.status,
        startedAt: snap.startedAt,
        completedAt: snap.completedAt,
        textLength: snap.textLength,
        stations: snap.stations.map((s) => ({ ...s })),
        warnings: snap.warnings.map((w) => ({ ...w })),
        finalReport: snap.finalReport,
        lastEventAt: Date.now(),
      };
    }

    case "RETRY_REQUESTED":
      return withStation(state, action.stationId, (s) => ({
        ...s,
        status: "queued",
        error: null,
        progress: 0,
      }));

    case "STREAM_EVENT": {
      const ev = action.event;
      const next: MachineState = { ...state, lastEventAt: Date.now() };
      switch (ev.type) {
        case "pipeline.started":
          return {
            ...next,
            status: "running",
            capabilities: ev.capabilities,
            projectName: ev.projectName || state.projectName,
          };
        case "pipeline.warning":
          return { ...next, warnings: [...state.warnings, ev.warning] };
        case "pipeline.completed":
          return {
            ...next,
            status: ev.status,
            completedAt: new Date().toISOString(),
          };
        case "station.started":
          return withStation(next, ev.stationId, (s) => ({
            ...s,
            status: "running",
            startedAt: ev.at,
            progress: 0,
            error: null,
          }));
        case "station.progress":
          return withStation(next, ev.stationId, (s) => ({
            ...s,
            progress: Math.max(0, Math.min(1, ev.progress)),
          }));
        case "station.completed":
          return withStation(next, ev.stationId, (s) => ({
            ...s,
            status: "completed",
            progress: 1,
            output: ev.output,
            confidence: ev.confidence,
            completedAt: new Date().toISOString(),
          }));
        case "station.error":
          return withStation(next, ev.stationId, (s) => ({
            ...s,
            status: "failed",
            error: ev.message,
            completedAt: new Date().toISOString(),
          }));
        case "station.token":
          // tokens are a future capability — currently not rendered
          return next;
      }
    }
  }
}

export function selectProgress(state: MachineState): number {
  const completed = state.stations.filter(
    (s) => s.status === "completed"
  ).length;
  return Math.round((completed / state.stations.length) * 100);
}

export function selectAllCompleted(state: MachineState): boolean {
  return state.stations.every((s) => s.status === "completed");
}

export function selectIsRunning(state: MachineState): boolean {
  return state.status === "running";
}
