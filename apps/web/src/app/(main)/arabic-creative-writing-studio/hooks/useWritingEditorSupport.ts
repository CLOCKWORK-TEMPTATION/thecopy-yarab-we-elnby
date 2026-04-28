"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  calculateTextStats,
  formatWritingTime,
} from "@/app/(main)/arabic-creative-writing-studio/lib/studio/writing-editor-utils";

import type {
  OperationFeedEntry,
  WritingEditorProps,
} from "@/app/(main)/arabic-creative-writing-studio/components/writing-editor/types";
import type {
  CreativeProject,
  TextAnalysis,
} from "@/app/(main)/arabic-creative-writing-studio/types";

type PushOperation = (
  tone: OperationFeedEntry["tone"],
  label: string,
  message: string
) => void;

export function useOperationFeed() {
  const [operationFeed, setOperationFeed] = useState<OperationFeedEntry[]>([]);

  const pushOperation = useCallback<PushOperation>((tone, label, message) => {
    const nextEntry: OperationFeedEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      tone,
      label,
      message,
      timestamp: Date.now(),
    };

    setOperationFeed((previous) => [nextEntry, ...previous].slice(0, 4));
  }, []);

  return { operationFeed, pushOperation };
}

export function useWritingTimer() {
  const [isWriting, setIsWriting] = useState(false);
  const [writingTime, setWritingTime] = useState(0);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;

    if (isWriting && startTimeRef.current !== null) {
      interval = setInterval(() => {
        setWritingTime(
          Math.floor((Date.now() - (startTimeRef.current ?? Date.now())) / 1000)
        );
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isWriting]);

  return {
    markWriting: () => {
      startTimeRef.current ??= Date.now();
      setIsWriting(true);
    },
    writingTimeLabel: useMemo(
      () => formatWritingTime(writingTime),
      [writingTime]
    ),
  };
}

export function useWritingProjectState({
  onProjectChange,
  onSave,
  project,
  settings,
  pushOperation,
}: Pick<WritingEditorProps, "onProjectChange" | "onSave" | "settings"> & {
  project: NonNullable<WritingEditorProps["project"]>;
  pushOperation: PushOperation;
}) {
  const activeProject = project;
  const [content, setContent] = useState(activeProject.content);
  const [title, setTitle] = useState(activeProject.title);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(
    () => () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    },
    []
  );

  const buildProjectSnapshot = useCallback(
    (nextTitle: string, nextContent: string): CreativeProject => {
      const nextStats = calculateTextStats(nextContent);

      return {
        ...activeProject,
        title: nextTitle,
        content: nextContent,
        wordCount: nextStats.wordCount,
        characterCount: nextStats.characterCount,
        paragraphCount: nextStats.paragraphCount,
        updatedAt: new Date(),
      };
    },
    [activeProject]
  );

  const queueAutoSave = useCallback(
    (nextProject: CreativeProject) => {
      if (!settings.autoSave) {
        return;
      }

      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      autoSaveTimerRef.current = setTimeout(() => {
        onSave(nextProject);
        pushOperation("success", "حفظ تلقائي", "تم حفظ آخر تعديل تلقائياً.");
        autoSaveTimerRef.current = null;
      }, settings.autoSaveInterval);
    },
    [onSave, pushOperation, settings.autoSave, settings.autoSaveInterval]
  );

  const handleTitleChange = useCallback(
    (nextTitle: string) => {
      setTitle(nextTitle);
      const updatedProject = buildProjectSnapshot(nextTitle, content);
      onProjectChange(updatedProject);
      queueAutoSave(updatedProject);
    },
    [buildProjectSnapshot, content, onProjectChange, queueAutoSave]
  );

  const handleContentChange = useCallback(
    (nextContent: string) => {
      setContent(nextContent);

      const updatedProject = buildProjectSnapshot(title, nextContent);
      onProjectChange(updatedProject);
      queueAutoSave(updatedProject);
    },
    [buildProjectSnapshot, onProjectChange, queueAutoSave, title]
  );

  return {
    content,
    handleContentChange,
    handleTitleChange,
    title,
  };
}

export function useWritingAnalysis({
  analysisAvailable,
  analysisBlockedReason,
  content,
  onAnalyze,
  pushOperation,
}: Pick<
  WritingEditorProps,
  "analysisAvailable" | "analysisBlockedReason" | "onAnalyze"
> & {
  content: string;
  pushOperation: PushOperation;
}) {
  const [analysis, setAnalysis] = useState<TextAnalysis | null>(null);
  const [analysisSnapshot, setAnalysisSnapshot] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = useCallback(async () => {
    if (!content.trim()) {
      pushOperation(
        "blocked",
        "تحليل النص",
        "أضف محتوى أولاً قبل تشغيل التحليل."
      );
      return;
    }

    if (!analysisAvailable) {
      pushOperation(
        "blocked",
        "تحليل النص",
        analysisBlockedReason ?? "تحليل النص غير متاح حالياً."
      );
      return;
    }

    setIsAnalyzing(true);
    pushOperation("info", "تحليل النص", "جاري إرسال النسخة الحالية للتحليل.");

    try {
      const result = await onAnalyze(content);

      if (!result) {
        setAnalysis(null);
        pushOperation(
          "error",
          "تحليل النص",
          "فشل التحليل أو لم يرجع نتيجة قابلة للعرض."
        );
        return;
      }

      setAnalysis(result);
      setAnalysisSnapshot(content);
      return result;
    } finally {
      setIsAnalyzing(false);
    }
  }, [
    analysisAvailable,
    analysisBlockedReason,
    content,
    onAnalyze,
    pushOperation,
  ]);

  return {
    analysis,
    analysisSnapshot,
    handleAnalyze,
    isAnalyzing,
  };
}
