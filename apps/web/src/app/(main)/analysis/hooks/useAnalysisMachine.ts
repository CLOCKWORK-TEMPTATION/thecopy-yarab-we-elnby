"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import {
  AuthRequiredError,
  exportAnalysis,
  fetchAnalysisSnapshot,
  retryStation as retryStationApi,
  startAnalysisStream,
  downloadBlob,
} from "../lib/api";
import { openSse, type SseHandle } from "../lib/sse-client";
import {
  initialState,
  reducer,
  selectAllCompleted,
  selectIsRunning,
  selectProgress,
  type MachineState,
} from "../lib/state-machine";
import { reportTelemetry } from "../lib/telemetry";

import type { StationId, StreamEvent } from "../lib/types";

interface UseAnalysisMachineOptions {
  resumeAnalysisId?: string | null;
  onAuthRequired?: (status: number) => void;
}

interface UseAnalysisMachineReturn {
  state: MachineState;
  progress: number;
  isRunning: boolean;
  allCompleted: boolean;
  start: (input: { text: string; projectId?: string; projectName?: string }) => Promise<void>;
  reset: () => void;
  retryStation: (stationId: StationId, text: string) => Promise<void>;
  exportAs: (format: "json" | "docx" | "pdf") => Promise<void>;
}

export function useAnalysisMachine(
  opts: UseAnalysisMachineOptions = {}
): UseAnalysisMachineReturn {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const sseRef = useRef<SseHandle | null>(null);
  const lastTextRef = useRef<string>("");

  // --- subscribe to the SSE channel whenever the URL changes ---
  useEffect(() => {
    if (!streamUrl) return;
    const handle = openSse({
      url: streamUrl,
      onEvent: (e: StreamEvent) => dispatch({ type: "STREAM_EVENT", event: e }),
      onError: () => {
        reportTelemetry("analysis.sse.error", { url: streamUrl });
      },
    });
    sseRef.current = handle;
    return () => {
      handle.close();
      sseRef.current = null;
    };
  }, [streamUrl]);

  // --- restore a previous analysis from the server (no local storage) ---
  useEffect(() => {
    let cancelled = false;
    if (!opts.resumeAnalysisId) return;
    void (async () => {
      try {
        const snap = await fetchAnalysisSnapshot(opts.resumeAnalysisId!);
        if (cancelled) return;
        dispatch({ type: "SNAPSHOT_LOADED", snapshot: snap });
        if (snap.status === "running") {
          setStreamUrl(
            `/api/analysis/seven-stations/stream/${encodeURIComponent(snap.analysisId)}`
          );
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof AuthRequiredError) {
          opts.onAuthRequired?.(err.status);
          return;
        }
        reportTelemetry("analysis.snapshot.failed", {
          analysisId: opts.resumeAnalysisId,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.resumeAnalysisId]);

  const start = useCallback(
    async (input: { text: string; projectId?: string; projectName?: string }) => {
      try {
        lastTextRef.current = input.text;
        dispatch({
          type: "START_REQUESTED",
          projectId: input.projectId ?? null,
          projectName: input.projectName ?? "تحليل درامي شامل",
          textLength: input.text.length,
        });
        reportTelemetry("analysis.start", { textLength: input.text.length });
        const { analysisId } = await startAnalysisStream(input);
        dispatch({ type: "SESSION_CREATED", analysisId });
        setStreamUrl(
          `/api/analysis/seven-stations/stream/${encodeURIComponent(analysisId)}`
        );
      } catch (err) {
        if (err instanceof AuthRequiredError) {
          opts.onAuthRequired?.(err.status);
          dispatch({ type: "SESSION_FAILED", message: "يلزم تسجيل الدخول" });
          return;
        }
        const message = err instanceof Error ? err.message : "تعذر بدء التحليل";
        dispatch({ type: "SESSION_FAILED", message });
        reportTelemetry("analysis.start.failed", { message });
      }
    },
    [opts]
  );

  const reset = useCallback(() => {
    sseRef.current?.close();
    sseRef.current = null;
    setStreamUrl(null);
    lastTextRef.current = "";
    dispatch({ type: "RESET" });
  }, []);

  const retryStation = useCallback(
    async (stationId: StationId, text: string) => {
      if (!state.analysisId) return;
      dispatch({ type: "RETRY_REQUESTED", stationId });
      reportTelemetry("analysis.retry", { stationId });
      try {
        await retryStationApi(state.analysisId, stationId, text || lastTextRef.current);
      } catch (err) {
        if (err instanceof AuthRequiredError) {
          opts.onAuthRequired?.(err.status);
          return;
        }
        // The error event will be emitted on the SSE channel by the server.
        reportTelemetry("analysis.retry.failed", {
          stationId,
          message: err instanceof Error ? err.message : "unknown",
        });
      }
    },
    [opts, state.analysisId]
  );

  const exportAs = useCallback(
    async (format: "json" | "docx" | "pdf") => {
      if (!state.analysisId) return;
      reportTelemetry("analysis.export", { format });
      try {
        const blob = await exportAnalysis(state.analysisId, format);
        const ext = format;
        downloadBlob(blob, `analysis-${state.analysisId}.${ext}`);
      } catch (err) {
        if (err instanceof AuthRequiredError) {
          opts.onAuthRequired?.(err.status);
          return;
        }
        reportTelemetry("analysis.export.failed", {
          format,
          message: err instanceof Error ? err.message : "unknown",
        });
      }
    },
    [opts, state.analysisId]
  );

  return {
    state,
    progress: selectProgress(state),
    isRunning: selectIsRunning(state),
    allCompleted: selectAllCompleted(state),
    start,
    reset,
    retryStation,
    exportAs,
  };
}
