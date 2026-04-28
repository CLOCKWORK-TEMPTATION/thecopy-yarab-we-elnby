"use client";

import { useRef } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { SELF_TAPE_STORAGE_KEY } from "../../lib/self-tape";

import { ComparisonPanel } from "./ComparisonPanel";
import { ExportPanel } from "./ExportPanel";
import { NotesPanel } from "./NotesPanel";
import { RecorderPanel } from "./RecorderPanel";
import { TeleprompterPanel } from "./TeleprompterPanel";
import { useMediaRecording } from "./useMediaRecording";
import { useSelfTapeSuite } from "./useSelfTapeSuite";

import type { ActiveTool } from "./types";

export const SelfTapeSuite: React.FC = () => {
  const blobRegistryRef = useRef<Map<string, Blob>>(new Map());
  const sessionUrlRegistryRef = useRef<Map<string, string>>(new Map());

  const suite = useSelfTapeSuite({
    blobRegistryRef,
    sessionUrlRegistryRef,
  });

  const media = useMediaRecording({
    showNotification: suite.showNotification,
    scriptText: suite.scriptText,
    takes: suite.takes,
    teleprompterSettings: suite.teleprompterSettings,
    startTeleprompter: suite.startTeleprompter,
    stopTeleprompter: suite.stopTeleprompter,
    markTakeExportable: suite.markTakeExportable,
    setTakes: suite.setTakes,
    setNotesTakeId: suite.setNotesTakeId,
    setComparisonView: suite.setComparisonView,
    activeTool: suite.activeTool,
    blobRegistryRef,
    sessionUrlRegistryRef,
  });

  const tools: { id: ActiveTool; label: string }[] = [
    { id: "teleprompter", label: "📜 Teleprompter" },
    { id: "recorder", label: "🎬 التسجيل" },
    { id: "comparison", label: "⚖️ المقارنة" },
    { id: "notes", label: "📝 الملاحظات" },
    { id: "export", label: "📤 التصدير" },
  ];

  return (
    <div
      className="min-h-screen bg-gradient-to-bl from-black/14 via-purple-900 to-black/14"
      dir="rtl"
    >
      <header className="border-b border-purple-500/30 bg-black/30 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-pink-600">
                <span className="text-2xl">🎥</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Self-Tape Suite
                </h1>
                <p className="text-sm text-purple-300">
                  استوديو التسجيل الذاتي الاحترافي
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className="border-green-500 text-green-400"
              >
                تشغيل محلي
              </Badge>
              <Badge
                variant="outline"
                className="border-purple-500/60 text-purple-300"
              >
                {SELF_TAPE_STORAGE_KEY}
              </Badge>
              <Button
                variant="outline"
                className="border-purple-500 text-purple-300 hover:bg-purple-500/20"
                onClick={() => {
                  window.location.href = "/actorai-arabic";
                }}
              >
                العودة للرئيسية
              </Button>
            </div>
          </div>
        </div>
      </header>

      {suite.notification && (
        <div className="fixed left-1/2 top-20 z-50 -translate-x-1/2">
          <div
            className={`rounded-lg border px-4 py-3 ${suite.notification.type === "success" ? "border-green-500 bg-green-500/20 text-green-300" : suite.notification.type === "error" ? "border-red-500 bg-red-500/20 text-red-300" : "border-blue-500 bg-blue-500/20 text-blue-300"}`}
          >
            <p>{suite.notification.message}</p>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-6">
        <div className="mb-6 flex flex-wrap gap-2">
          {tools.map((tool) => (
            <Button
              key={tool.id}
              variant={suite.activeTool === tool.id ? "default" : "outline"}
              className={
                suite.activeTool === tool.id
                  ? "bg-purple-600 text-white hover:bg-purple-700"
                  : "border-purple-500/50 text-purple-300 hover:bg-purple-500/20"
              }
              onClick={() => suite.setActiveTool(tool.id)}
            >
              {tool.label}
            </Button>
          ))}
        </div>

        {suite.activeTool === "teleprompter" && (
          <TeleprompterPanel
            scriptText={suite.scriptText}
            setScriptText={suite.setScriptText}
            teleprompterSettings={suite.teleprompterSettings}
            setTeleprompterSettings={suite.setTeleprompterSettings}
            teleprompterRunning={suite.teleprompterRunning}
            teleprompterPosition={suite.teleprompterPosition}
            countdown={suite.countdown}
            startTeleprompter={suite.startTeleprompter}
            stopTeleprompter={suite.stopTeleprompter}
            resetTeleprompter={suite.resetTeleprompter}
          />
        )}

        {suite.activeTool === "recorder" && (
          <RecorderPanel
            cameraState={media.cameraState}
            cameraError={media.cameraError}
            isRecording={media.isRecording}
            isFinalizingTake={media.isFinalizingTake}
            recordingTime={media.recordingTime}
            previewVideoRef={media.previewVideoRef}
            mediaCaptureSupported={media.mediaCaptureSupported}
            availableTakes={suite.availableTakes}
            bestScore={suite.bestScore}
            totalDuration={suite.totalDuration}
            exportableTakeIds={suite.exportableTakeIds}
            currentPromptLine={suite.currentPromptLine}
            requestCameraAccess={media.requestCameraAccess}
            startRecording={media.startRecording}
            stopRecording={media.stopRecording}
            resetTeleprompter={suite.resetTeleprompter}
            deleteTake={suite.deleteTake}
            exportTake={suite.exportTake}
            setActiveTool={suite.setActiveTool}
            setNotesTakeId={suite.setNotesTakeId}
          />
        )}

        {suite.activeTool === "comparison" && (
          <ComparisonPanel
            availableTakes={suite.availableTakes}
            comparisonView={suite.comparisonView}
            setComparisonView={suite.setComparisonView}
          />
        )}

        {suite.activeTool === "notes" && (
          <NotesPanel
            availableTakes={suite.availableTakes}
            notesTakeId={suite.notesTakeId}
            setNotesTakeId={suite.setNotesTakeId}
            manualNoteDrafts={suite.manualNoteDrafts}
            setManualNoteDrafts={suite.setManualNoteDrafts}
            manualNoteTypes={suite.manualNoteTypes}
            setManualNoteTypes={suite.setManualNoteTypes}
            addManualNote={suite.addManualNote}
          />
        )}

        {suite.activeTool === "export" && (
          <ExportPanel
            exportSettings={suite.exportSettings}
            setExportSettings={suite.setExportSettings}
            exportingTakeId={suite.exportingTakeId}
            exportProgress={suite.exportProgress}
            availableTakes={suite.availableTakes}
            exportableTakeIds={suite.exportableTakeIds}
            bestExportableTake={suite.bestExportableTake}
            exportTake={suite.exportTake}
          />
        )}
      </main>

      <footer className="mt-8 border-t border-purple-500/30 bg-black/30">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-6 md:flex-row">
          <p className="text-sm text-white/55">
            Self-Tape Suite © 2025 - جزء من منصة ActorAI العربية
          </p>
          <div className="flex items-center gap-4">
            <Badge
              variant="outline"
              className="border-purple-500/50 text-purple-300"
            >
              تخزين محلي + مزامنة خلفية
            </Badge>
            <Badge
              variant="outline"
              className="border-green-500/50 text-green-300"
            >
              v2
            </Badge>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SelfTapeSuite;
