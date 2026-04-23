"use client";

/**
 * Refactored Seven Stations surface.
 *
 * - SSE-only streaming (no WebSocket).
 * - Server snapshot is the only source of truth for restored state — no
 *   sessionStorage of analysis results.
 * - Per-station retry, quality badges, warnings, exports (PDF/DOCX/JSON),
 *   relationship graph, full Arabic / RTL.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useAnalysisMachine } from "./hooks/useAnalysisMachine";
import { ExportBar } from "./components/ExportBar";
import { FinalReport } from "./components/FinalReport";
import { InputPanel } from "./components/InputPanel";
import { PipelineProgress } from "./components/PipelineProgress";
import { RelationshipGraph } from "./components/RelationshipGraph";
import { StationsBoard } from "./components/StationsBoard";
import { WarningsPanel } from "./components/WarningsPanel";

const RESUME_QUERY_PARAM = "analysis";

export default function SevenStationsComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resumeId = searchParams?.get(RESUME_QUERY_PARAM) ?? null;

  const [text, setText] = useState<string>("");

  const handleAuthRequired = useCallback(
    (status: number) => {
      const dest = `/login?reason=${status === 401 ? "unauthenticated" : "forbidden"}`;
      router.push(dest);
    },
    [router]
  );

  const machine = useAnalysisMachine({
    resumeAnalysisId: resumeId,
    onAuthRequired: handleAuthRequired,
  });

  // Reflect the live analysisId in the URL so deep-linking & refresh work.
  useEffect(() => {
    if (!machine.state.analysisId) return;
    if (resumeId === machine.state.analysisId) return;
    const url = new URL(window.location.href);
    url.searchParams.set(RESUME_QUERY_PARAM, machine.state.analysisId);
    router.replace(`${url.pathname}?${url.searchParams.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machine.state.analysisId]);

  const handleStart = useCallback(() => {
    if (!text.trim()) return;
    void machine.start({ text: text.trim() });
  }, [machine, text]);

  const handleReset = useCallback(() => {
    machine.reset();
    setText("");
    const url = new URL(window.location.href);
    url.searchParams.delete(RESUME_QUERY_PARAM);
    router.replace(url.pathname, { scroll: false });
  }, [machine, router]);

  const handleRetry = useCallback(
    (stationId: 1 | 2 | 3 | 4 | 5 | 6 | 7) => {
      void machine.retryStation(stationId, text);
    },
    [machine, text]
  );

  return (
    <div className="container mx-auto max-w-7xl space-y-8 p-4 md:p-6" dir="rtl">
      <header className="space-y-2 text-right">
        <h2 className="text-2xl font-bold text-white">المحطات السبع للتحليل الدرامي</h2>
        <p className="text-sm text-white/60">
          تحليل عميق للنص الدرامي عبر سبع محطات متخصصة، مع بثّ مباشر للتقدم
          ودعم لإعادة تشغيل أي محطة على حدة.
        </p>
      </header>

      <InputPanel
        text={text}
        onTextChange={setText}
        onStart={handleStart}
        onReset={handleReset}
        isRunning={machine.isRunning}
      />

      {(machine.state.status !== "idle" || machine.state.analysisId) && (
        <>
          <PipelineProgress
            progress={machine.progress}
            status={machine.state.status}
          />

          {machine.state.fatalError && (
            <div
              className="rounded-2xl border border-rose-500/25 bg-rose-500/5 p-4 text-right text-sm text-rose-200"
              role="alert"
            >
              {machine.state.fatalError}
            </div>
          )}

          <WarningsPanel warnings={machine.state.warnings} />

          <StationsBoard
            stations={machine.state.stations}
            canRetry={Boolean(machine.state.analysisId) && !!text.trim()}
            onRetry={handleRetry}
          />

          <RelationshipGraph stations={machine.state.stations} />

          <ExportBar
            disabled={!machine.allCompleted}
            formats={machine.state.capabilities.exports}
            onExport={(f) => void machine.exportAs(f)}
          />

          <FinalReport report={machine.state.finalReport} />
        </>
      )}
    </div>
  );
}
