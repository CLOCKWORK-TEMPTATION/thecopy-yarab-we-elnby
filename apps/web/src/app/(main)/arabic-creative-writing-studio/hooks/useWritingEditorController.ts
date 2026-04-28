"use client";

import { useCallback, useMemo, useRef } from "react";

import {
  useOperationFeed,
  useWritingAnalysis,
  useWritingProjectState,
  useWritingTimer,
} from "@/app/(main)/arabic-creative-writing-studio/hooks/useWritingEditorSupport";
import {
  buildAnalysisNarrative,
  calculateTextStats,
  getAverageQuality,
} from "@/app/(main)/arabic-creative-writing-studio/lib/studio/writing-editor-utils";

import type { WritingEditorProps } from "@/app/(main)/arabic-creative-writing-studio/components/writing-editor/types";
import type { ExportFormat } from "@/app/(main)/arabic-creative-writing-studio/lib/export-project";

type ActiveWritingEditorProps = Omit<WritingEditorProps, "project"> & {
  project: NonNullable<WritingEditorProps["project"]>;
};

export function useWritingEditorController({
  project,
  onAnalyze,
  onExport,
  onProjectChange,
  onSave,
  analysisAvailable,
  analysisBlockedReason,
  settings,
}: ActiveWritingEditorProps) {
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const { operationFeed, pushOperation } = useOperationFeed();
  const { markWriting, writingTimeLabel } = useWritingTimer();
  const { content, handleContentChange, handleTitleChange, title } =
    useWritingProjectState({
      onProjectChange,
      onSave,
      project,
      pushOperation,
      settings,
    });
  const {
    analysis,
    analysisSnapshot,
    handleAnalyze,
    isAnalyzing,
  } = useWritingAnalysis({
    analysisAvailable,
    analysisBlockedReason,
    content,
    onAnalyze,
    pushOperation,
  });

  const textStats = useMemo(() => calculateTextStats(content), [content]);
  const isAnalysisStale = Boolean(analysis && analysisSnapshot !== content);
  const analysisNarrative = useMemo(
    () => (analysis ? buildAnalysisNarrative(analysis) : null),
    [analysis],
  );

  const handleTrackedContentChange = useCallback(
    (nextContent: string) => {
      markWriting();
      handleContentChange(nextContent);
    },
    [handleContentChange, markWriting],
  );

  const handleTrackedAnalyze = useCallback(async () => {
    const result = await handleAnalyze();
    if (!result) {
      return;
    }

    pushOperation(
      "success",
      "تحليل النص",
      `اكتمل التحليل. متوسط الجودة الحالي ${getAverageQuality(result)}/100.`,
    );
  }, [handleAnalyze, pushOperation]);

  const handleSave = useCallback(() => {
    const updatedProject = {
      ...project,
      title,
      content,
      wordCount: textStats.wordCount,
      characterCount: textStats.characterCount,
      paragraphCount: textStats.paragraphCount,
      updatedAt: new Date(),
    };

    onSave(updatedProject);
    pushOperation("success", "حفظ المشروع", "تم حفظ المشروع يدوياً.");
  }, [content, onSave, project, pushOperation, textStats, title]);

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      pushOperation(
        "info",
        "تصدير",
        `جاري تجهيز ملف ${format.toUpperCase()} للتنزيل.`,
      );

      const result = await Promise.resolve(onExport(project, format));
      pushOperation(
        result.success ? "success" : "error",
        "تصدير",
        result.message,
      );
    },
    [onExport, project, pushOperation],
  );

  return {
    analysis,
    analysisNarrative,
    content,
    editorRef,
    handleAnalyze: handleTrackedAnalyze,
    handleContentChange: handleTrackedContentChange,
    handleExport,
    handleSave,
    handleTitleChange,
    isAnalysisStale,
    isAnalyzing,
    operationFeed,
    textStats,
    title,
    writingTimeLabel,
  };
}
