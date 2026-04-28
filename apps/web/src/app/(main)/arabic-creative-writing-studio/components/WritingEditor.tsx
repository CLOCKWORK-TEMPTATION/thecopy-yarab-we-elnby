"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import { EditorInsightsSidebar } from "@/app/(main)/arabic-creative-writing-studio/components/writing-editor/EditorInsightsSidebar";
import { EditorWorkspace } from "@/app/(main)/arabic-creative-writing-studio/components/writing-editor/EditorWorkspace";
import { PromptContextPanels } from "@/app/(main)/arabic-creative-writing-studio/components/writing-editor/PromptContextPanels";
import { WorkspaceHeader } from "@/app/(main)/arabic-creative-writing-studio/components/writing-editor/WorkspaceHeader";
import { useWritingEditorController } from "@/app/(main)/arabic-creative-writing-studio/hooks/useWritingEditorController";

import type { WritingEditorProps } from "@/app/(main)/arabic-creative-writing-studio/components/writing-editor/types";

export type { WritingEditorProps } from "@/app/(main)/arabic-creative-writing-studio/components/writing-editor/types";

export function WritingEditor(props: WritingEditorProps) {
  const controller = useWritingEditorController(props);

  if (!props.project) {
    return (
      <div className="py-12 text-center">
        <div className="mb-4 text-6xl">✍️</div>
        <h3 className="mb-2 text-xl font-semibold text-white/55">
          لا يوجد مشروع مفتوح
        </h3>
        <p className="text-white/45">
          اختر محفزاً من المكتبة أو أنشئ مشروعاً جديداً
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <WorkspaceHeader
        title={controller.title}
        autoSaveEnabled={props.settings.autoSave}
        canAnalyze={
          Boolean(controller.content.trim()) && props.analysisAvailable
        }
        isAnalyzing={controller.isAnalyzing}
        onAnalyze={controller.handleAnalyze}
        onExport={controller.handleExport}
        onSave={controller.handleSave}
        onTitleChange={controller.handleTitleChange}
      />

      {!props.analysisAvailable ? (
        <Alert className="mb-6 border-amber-400/30 bg-amber-500/10 text-amber-100">
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm leading-6">
              {props.analysisBlockedReason ??
                "تحليل النص غير متاح الآن لأن إعدادات الذكاء لم تكتمل بعد."}
            </span>
            <Button variant="outline" onClick={props.onOpenSettings}>
              افتح الإعدادات
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <PromptContextPanels
            activeChallenge={props.activeChallenge}
            selectedPrompt={props.selectedPrompt}
          />
          <EditorWorkspace
            content={controller.content}
            editorRef={controller.editorRef}
            onContentChange={controller.handleContentChange}
            settings={props.settings}
          />
        </div>

        <EditorInsightsSidebar
          analysis={controller.analysis}
          analysisNarrative={controller.analysisNarrative}
          isAnalysisStale={controller.isAnalysisStale}
          operationFeed={controller.operationFeed}
          textStats={controller.textStats}
          writingTimeLabel={controller.writingTimeLabel}
        />
      </div>
    </div>
  );
}

export default WritingEditor;
