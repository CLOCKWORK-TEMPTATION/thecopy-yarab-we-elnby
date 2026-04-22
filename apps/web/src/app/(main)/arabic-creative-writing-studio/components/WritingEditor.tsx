// WritingEditor.tsx
// محرر الكتابة الذكي

"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AppSettings,
  CreativeProject,
  CreativePrompt,
  TextAnalysis,
} from "@/app/(main)/arabic-creative-writing-studio/types";
import type { FeaturedWeeklyChallenge } from "@/app/(main)/arabic-creative-writing-studio/lib/featured-content";
import type {
  ExportFormat,
  ExportResult,
} from "@/app/(main)/arabic-creative-writing-studio/lib/export-project";
import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

export interface WritingEditorProps {
  project: CreativeProject | null;
  selectedPrompt: CreativePrompt | null;
  onProjectChange: (project: CreativeProject) => void;
  onSave: (project: CreativeProject) => void;
  onAnalyze: (text: string) => Promise<TextAnalysis | null>;
  onExport: (
    project: CreativeProject,
    format: ExportFormat
  ) => ExportResult | Promise<ExportResult>;
  onOpenSettings: () => void;
  analysisAvailable: boolean;
  analysisBlockedReason?: string;
  activeChallenge?: FeaturedWeeklyChallenge | null;
  settings: AppSettings;
  loading: boolean;
}

interface CalculatedTextStats {
  wordCount: number;
  characterCount: number;
  paragraphCount: number;
  sentenceCount: number;
  averageWordsPerSentence: number;
}

interface OperationFeedEntry {
  id: string;
  tone: "info" | "success" | "error" | "blocked";
  label: string;
  message: string;
  timestamp: number;
}

const QUALITY_LABELS: Record<keyof TextAnalysis["qualityMetrics"], string> = {
  clarity: "الوضوح",
  creativity: "الإبداع",
  coherence: "التماسك",
  impact: "التأثير",
};

const EMOTIONAL_TONE_LABELS: Record<TextAnalysis["emotionalTone"], string> = {
  positive: "إيجابية",
  neutral: "محايدة",
  negative: "متوترة أو سلبية",
};

function calculateTextStats(content: string): CalculatedTextStats {
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const characterCount = content.length;
  const paragraphCount = content
    .split("\n\n")
    .filter((part) => part.trim()).length;
  const sentenceCount = content
    .split(/[.!?؟]+/)
    .filter((part) => part.trim()).length;

  return {
    wordCount,
    characterCount,
    paragraphCount,
    sentenceCount,
    averageWordsPerSentence:
      sentenceCount > 0 ? Math.round(wordCount / sentenceCount) : 0,
  };
}

function getAverageQuality(analysis: TextAnalysis): number {
  const values = Object.values(analysis.qualityMetrics);
  const total = values.reduce((sum, value) => sum + value, 0);

  return Math.round(total / values.length);
}

function buildAnalysisNarrative(analysis: TextAnalysis) {
  const rankedMetrics = Object.entries(analysis.qualityMetrics).sort(
    (left, right) => right[1] - left[1]
  ) as [keyof TextAnalysis["qualityMetrics"], number][];
  const strongestMetric =
    rankedMetrics[0] ?? (["clarity", analysis.qualityMetrics.clarity] as const);
  const weakestMetric =
    rankedMetrics[rankedMetrics.length - 1] ??
    (["clarity", analysis.qualityMetrics.clarity] as const);
  const averageQuality = getAverageQuality(analysis);

  if (averageQuality >= 85) {
    return {
      headline: "النص متماسك وجاهز لمراجعة نهائية خفيفة.",
      description: `أفضل نقطة فيه الآن هي ${QUALITY_LABELS[strongestMetric[0]]}، ومع ذلك يستحق ${QUALITY_LABELS[weakestMetric[0]]} مراجعة أخيرة قبل الاعتماد.`,
    };
  }

  if (averageQuality >= 70) {
    return {
      headline: "النص جيد، لكنه يحتاج صقلاً محدوداً قبل النسخة النهائية.",
      description: `التحليل يرى أن ${QUALITY_LABELS[strongestMetric[0]]} واضحة، بينما تحتاج ${QUALITY_LABELS[weakestMetric[0]]} إلى دفعة إضافية.`,
    };
  }

  if (averageQuality >= 55) {
    return {
      headline: "النص واعد، لكنه يحتاج مراجعة مركزة قبل المتابعة.",
      description: `ابدأ بتحسين ${QUALITY_LABELS[weakestMetric[0]]} أولاً، ثم راجع ${QUALITY_LABELS[strongestMetric[0]]} حتى لا تفقد نقطة القوة الحالية.`,
    };
  }

  return {
    headline: "التحليل يقترح إعادة صياغة أعمق قبل الاعتماد على هذه النسخة.",
    description: `أضعف نقطة حالياً هي ${QUALITY_LABELS[weakestMetric[0]]}. ابدأ بها ثم أعد تشغيل التحليل بعد مراجعة النص.`,
  };
}

export const WritingEditor: React.FC<WritingEditorProps> = ({
  project,
  selectedPrompt,
  onProjectChange,
  onSave,
  onAnalyze,
  onExport,
  onOpenSettings,
  analysisAvailable,
  analysisBlockedReason,
  activeChallenge,
  settings,
  loading: _loading = false,
}) => {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<TextAnalysis | null>(null);
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

  const textStats = React.useMemo(() => calculateTextStats(content), [content]);
  const isAnalysisStale = Boolean(analysis && analysisSnapshot !== content);

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
    (nextTitle: string, nextContent: string) => {
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
    (newTitle: string) => {
      setTitle(newTitle);

      const updatedProject = buildProjectSnapshot(newTitle, content);

      if (!updatedProject) {
        return;
      }

      onProjectChange(updatedProject);
      queueAutoSave(updatedProject);
    },
    [buildProjectSnapshot, content, onProjectChange, queueAutoSave]
  );

  const handleContentChange = useCallback(
    (newContent: string) => {
      setContent(newContent);
      setIsWriting(true);

      const updatedProject = buildProjectSnapshot(title, newContent);

      if (!updatedProject) {
        return;
      }

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
        analysisBlockedReason || "تحليل النص غير متاح حالياً."
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

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }

    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const renderStatsPanel = () => (
    <CardSpotlight className="rounded-[22px]">
      <CardHeader>
        <CardTitle>📊 إحصائيات النص</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {textStats.wordCount}
            </div>
            <div className="text-sm text-white/55">كلمة</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {textStats.characterCount}
            </div>
            <div className="text-sm text-white/55">حرف</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {textStats.paragraphCount}
            </div>
            <div className="text-sm text-white/55">فقرة</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {formatTime(writingTime)}
            </div>
            <div className="text-sm text-white/55">وقت الكتابة</div>
          </div>
        </div>
      </CardContent>
    </CardSpotlight>
  );

  const renderOperationPanel = () => {
    const toneClasses: Record<OperationFeedEntry["tone"], string> = {
      info: "border-sky-400/30 bg-sky-500/10 text-sky-100",
      success: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100",
      error: "border-rose-400/30 bg-rose-500/10 text-rose-100",
      blocked: "border-amber-400/30 bg-amber-500/10 text-amber-100",
    };

    return (
      <CardSpotlight className="rounded-[22px]">
        <CardHeader>
          <CardTitle>🛰️ حالة العمليات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3" aria-live="polite">
            {operationFeed.length === 0 ? (
              <p className="text-sm leading-6 text-white/55">
                لم تُسجَّل عمليات بعد. عند الحفظ أو التحليل أو التصدير ستظهر
                النتيجة هنا مباشرة.
              </p>
            ) : (
              operationFeed.map((entry) => (
                <div
                  key={entry.id}
                  className={`rounded-2xl border p-3 ${toneClasses[entry.tone]}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold">{entry.label}</span>
                    <span className="text-xs opacity-75">
                      {new Date(entry.timestamp).toLocaleTimeString("ar-EG")}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6">{entry.message}</p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </CardSpotlight>
    );
  };

  const renderAnalysisPanel = () => {
    if (!analysis) {
      return null;
    }

    const narrative = buildAnalysisNarrative(analysis);

    return (
      <CardSpotlight className="rounded-[22px]">
        <CardHeader>
          <CardTitle>🎯 تحليل جودة النص</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h4 className="font-semibold text-white">{narrative.headline}</h4>
              <p className="mt-2 text-sm leading-6 text-white/72">
                {narrative.description}
              </p>
            </div>

            {isAnalysisStale ? (
              <Alert className="border-amber-400/30 bg-amber-500/10 text-amber-100">
                <AlertDescription>
                  التحليل المعروض يخص نسخة أقدم من النص الحالي. أعد تشغيل
                  التحليل بعد آخر تعديلاتك للحصول على قراءة محدثة.
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-white/4 p-3">
                <div className="text-sm text-white/55">قابلية القراءة</div>
                <div className="mt-1 text-lg font-semibold text-white">
                  {analysis.readabilityScore}/100
                </div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/4 p-3">
                <div className="text-sm text-white/55">تنوع المفردات</div>
                <div className="mt-1 text-lg font-semibold text-white">
                  {analysis.vocabularyDiversity}/100
                </div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/4 p-3">
                <div className="text-sm text-white/55">تنوع الجمل</div>
                <div className="mt-1 text-lg font-semibold text-white">
                  {analysis.sentenceVariety}/100
                </div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/4 p-3">
                <div className="text-sm text-white/55">النبرة العاطفية</div>
                <div className="mt-1 text-lg font-semibold text-white">
                  {EMOTIONAL_TONE_LABELS[analysis.emotionalTone]}
                </div>
              </div>
            </div>

            {Object.entries(analysis.qualityMetrics).map(([key, value]) => {
              const typedKey = key as keyof TextAnalysis["qualityMetrics"];

              return (
                <div key={typedKey}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {QUALITY_LABELS[typedKey]}
                    </span>
                    <span className="text-sm font-bold">{value}/100</span>
                  </div>
                  <Progress value={value} className="w-full" />
                </div>
              );
            })}

            {analysis.suggestions.length > 0 ? (
              <div className="mt-6">
                <h4 className="mb-2 font-semibold">💡 اقتراحات التحسين</h4>
                <ul className="space-y-1">
                  {analysis.suggestions.map((suggestion, index) => (
                    <li
                      key={index}
                      className="flex items-start text-sm text-white/65"
                    >
                      <span className="mr-2 text-yellow-500">•</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </CardContent>
      </CardSpotlight>
    );
  };

  if (!project) {
    return (
      <div className="text-center py-12">
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
      <CardSpotlight className="mb-6 rounded-[22px] p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 items-center space-x-4 space-x-reverse">
            <Input
              type="text"
              value={title}
              onChange={(event) => handleTitleChange(event.target.value)}
              className="text-xl font-bold"
              placeholder="عنوان المشروع..."
            />
            {settings.autoSave ? (
              <span className="text-sm text-green-600">💾 حفظ تلقائي مفعل</span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !content.trim() || !analysisAvailable}
              variant="default"
            >
              {isAnalyzing ? "🔄 جاري التحليل..." : "🔍 تحليل النص"}
            </Button>

            <Button onClick={handleSave} variant="default">
              💾 حفظ
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default">📤 تصدير</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => void handleExport("txt")}>
                  📄 نص خالص
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void handleExport("html")}>
                  🌐 صفحة ويب
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void handleExport("json")}>
                  📋 بيانات منظمة
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void handleExport("rtf")}>
                  📝 نص غني
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardSpotlight>

      {!analysisAvailable ? (
        <Alert className="mb-6 border-amber-400/30 bg-amber-500/10 text-amber-100">
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm leading-6">
              {analysisBlockedReason ||
                "تحليل النص غير متاح الآن لأن إعدادات الذكاء لم تكتمل بعد."}
            </span>
            <Button variant="outline" onClick={onOpenSettings}>
              افتح الإعدادات
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3">
          {selectedPrompt ? (
            <div className="mb-6 rounded-[22px] border border-white/8 bg-white/[0.04] p-6 backdrop-blur-2xl">
              <h3 className="mb-2 text-lg font-semibold text-white">
                📝 المحفز الإبداعي: {selectedPrompt.title}
              </h3>
              <p className="leading-relaxed text-white/68">
                {selectedPrompt.arabic}
              </p>
              {selectedPrompt.tips && selectedPrompt.tips.length > 0 ? (
                <div className="mt-4">
                  <h4 className="mb-2 font-medium text-white">💡 نصائح</h4>
                  <ul className="space-y-1 text-sm text-white/68">
                    {selectedPrompt.tips.map((tip, index) => (
                      <li key={index} className="flex items-start">
                        <span className="mr-2 text-purple-500">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          {activeChallenge ? (
            <div className="mb-6 rounded-[22px] border border-emerald-400/20 bg-emerald-500/10 p-6 backdrop-blur-2xl">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    🏆 {activeChallenge.title}
                  </h3>
                  <p className="mt-2 max-w-3xl leading-7 text-white/72">
                    {activeChallenge.description}
                  </p>
                </div>
                <div className="text-sm text-white/72">
                  ينتهي في{" "}
                  {activeChallenge.deadline.toLocaleDateString("ar-EG")}
                </div>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-white/78">
                {activeChallenge.requirements.map((requirement, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-2 text-emerald-300">•</span>
                    {requirement}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-[22px] border border-white/8 bg-white/[0.04] shadow-lg backdrop-blur-2xl">
            <textarea
              ref={editorRef}
              value={content}
              onChange={(event) => handleContentChange(event.target.value)}
              placeholder="ابدأ كتابة إبداعك هنا... 🖋️"
              className={`h-96 w-full resize-none border-none bg-transparent p-6 text-white placeholder-white/45 focus:outline-none ${
                settings.fontSize === "small"
                  ? "text-sm"
                  : settings.fontSize === "large"
                    ? "text-lg"
                    : "text-base"
              }`}
              style={{
                fontFamily:
                  "'Noto Sans Arabic', 'Cairo', 'Tajawal', Arial, sans-serif",
                lineHeight: 1.8,
                direction: settings.textDirection,
              }}
            />
          </div>
        </div>

        <div className="space-y-6">
          {renderStatsPanel()}
          {renderOperationPanel()}
          {renderAnalysisPanel()}

          <CardSpotlight className="rounded-[22px]">
            <CardHeader>
              <CardTitle>💡 نصائح سريعة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-white/55">
                <div className="flex items-start">
                  <span className="mr-2 text-green-500">•</span>
                  اكتب بدون توقف لأول 10 دقائق
                </div>
                <div className="flex items-start">
                  <span className="mr-2 text-blue-500">•</span>
                  لا تخف من المسودة الأولى السيئة
                </div>
                <div className="flex items-start">
                  <span className="mr-2 text-purple-500">•</span>
                  استخدم الحواس الخمس في الوصف
                </div>
                <div className="flex items-start">
                  <span className="mr-2 text-orange-500">•</span>
                  اقرأ النص بصوت عال للتدقيق
                </div>
              </div>
            </CardContent>
          </CardSpotlight>
        </div>
      </div>
    </div>
  );
};

export default WritingEditor;
