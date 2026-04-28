"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  buildAnalysisNarrative,
  calculateTextStats,
  formatWritingTime,
  getAverageQuality,
} from "@/app/(main)/arabic-creative-writing-studio/lib/studio/writing-editor-utils";

import type { CreativeProject } from "@/app/(main)/arabic-creative-writing-studio/types";
import type {
  OperationFeedEntry,
  WritingEditorProps,
} from "@/app/(main)/arabic-creative-writing-studio/components/writing-editor/types";
import type { ExportFormat } from "@/app/(main)/arabic-creative-writing-studio/lib/export-project";

export function useWritingEditorController({
  project,
  onAnalyze,
  onExport,
  onProjectChange,
  onSave,
  analysisAvailable,
  analysisBlockedReason,
  settings,
}: WritingEditorProps) {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] =
    useState<Awaited<ReturnType<typeof onAnalyze>>>(null);
  const [analysisSnapshot, setAnalysisSnapshot] = useState("");
  const [writingTime, setWritingTime] = useState(0);
  const [isWriting, setIsWriting] = useState(false);
  const [operationFeed, setOperationFeed] = useState<OperationFeedEntry[]>([]);

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const startTimeRef = useRef(Date.now());
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (project) {
      setContent(project.content);
      setTitle(project.title);
    } else {
      setContent("");
      setTitle("مشروع جديد");
    }

    setAnalysis(null);
    setAnalysisSnapshot("");
  }, [project]);

  const textStats = useMemo(() => calculateTextStats(content), [content]);
  const isAnalysisStale = Boolean(analysis && analysisSnapshot !== content);
  const writingTimeLabel = useMemo(
    () => formatWritingTime(writingTime),
    [writingTime]
  );
  const analysisNarrative = useMemo(
    () => (analysis ? buildAnalysisNarrative(analysis) : null),
    [analysis]
  );

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;

    if (isWriting) {
      interval = setInterval(() => {
        setWritingTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isWriting]);

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  const pushOperation = useCallback(
    (tone: OperationFeedEntry["tone"], label: string, message: string) => {
      const nextEntry: OperationFeedEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        tone,
        label,
        message,
        timestamp: Date.now(),
      };

      setOperationFeed((previous) => [nextEntry, ...previous].slice(0, 4));
    },
    []
  );

  const buildProjectSnapshot = useCallback(
    (nextTitle: string, nextContent: string): CreativeProject | null => {
      if (!project) {
        return null;
      }

      const nextStats = calculateTextStats(nextContent);

      return {
        ...project,
        title: nextTitle,
        content: nextContent,
        wordCount: nextStats.wordCount,
        characterCount: nextStats.characterCount,
        paragraphCount: nextStats.paragraphCount,
        updatedAt: new Date(),
      };
    },
    [project]
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
      if (!updatedProject) return;

      onProjectChange(updatedProject);
      queueAutoSave(updatedProject);
    },
    [buildProjectSnapshot, content, onProjectChange, queueAutoSave]
  );

  const handleContentChange = useCallback(
    (nextContent: string) => {
      setContent(nextContent);
      setIsWriting(true);

      const updatedProject = buildProjectSnapshot(title, nextContent);
      if (!updatedProject) return;

      onProjectChange(updatedProject);
      queueAutoSave(updatedProject);
    },
    [buildProjectSnapshot, onProjectChange, queueAutoSave, title]
  );

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
      pushOperation(
        "success",
        "تحليل النص",
        `اكتمل التحليل. متوسط الجودة الحالي ${getAverageQuality(result)}/100.`
      );
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

  const handleSave = useCallback(() => {
    const updatedProject = buildProjectSnapshot(title, content);

    if (!updatedProject) {
      pushOperation("blocked", "حفظ المشروع", "لا يوجد مشروع مفتوح للحفظ.");
      return;
    }

    onSave(updatedProject);
    pushOperation("success", "حفظ المشروع", "تم حفظ المشروع يدوياً.");
  }, [buildProjectSnapshot, content, onSave, pushOperation, title]);

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      if (!project) {
        pushOperation("blocked", "تصدير", "لا يوجد مشروع مفتوح للتصدير.");
        return;
      }

      pushOperation(
        "info",
        "تصدير",
        `جاري تجهيز ملف ${format.toUpperCase()} للتنزيل.`
      );

      const result = await Promise.resolve(onExport(project, format));
      pushOperation(
        result.success ? "success" : "error",
        "تصدير",
        result.message
      );
    },
    [onExport, project, pushOperation]
  );

  return {
    analysis,
    analysisNarrative,
    content,
    editorRef,
    handleAnalyze,
    handleContentChange,
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
