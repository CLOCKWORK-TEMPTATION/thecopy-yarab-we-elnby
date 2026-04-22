"use client";

/**
 * الصفحة: arabic-prompt-engineering-studio
 * الهوية: استوديو هندسة توجيهات بطابع مختبري/منهجي داخل قشرة موحدة
 * المتغيرات الخاصة المضافة: --page-accent, --page-accent-2, --page-border
 * مكونات Aceternity المستخدمة: BackgroundBeams, NoiseBackground, CardSpotlight
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Sparkles,
  Wand2,
  FileText,
  Zap,
  BarChart3,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  Copy,
  History,
  BookOpen,
  RefreshCw,
  ArrowUpDown,
  Target,
  Eye,
  Hash,
  TrendingUp,
  FlaskConical,
  Trash2,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  PenTool,
} from "lucide-react";
import {
  analyzePrompt,
  comparePrompts,
  generateEnhancementSuggestions,
} from "@the-copy/prompt-engineering";
import type {
  PromptAnalysis,
  PromptTemplate,
  PromptCategory,
} from "@the-copy/prompt-engineering";
import {
  loadRemoteAppState,
  persistRemoteAppState,
} from "@/lib/app-state-client";
import { BackgroundBeams } from "@/components/aceternity/background-beams";
import { NoiseBackground } from "@/components/aceternity/noise-background";
import { CardSpotlight } from "@/components/aceternity/card-spotlight";

const CATEGORY_LABELS: Record<PromptCategory, string> = {
  creative_writing: "كتابة إبداعية",
  analysis: "تحليل",
  translation: "ترجمة",
  summarization: "تلخيص",
  question_answering: "أسئلة وأجوبة",
  code_generation: "توليد كود",
  data_extraction: "استخراج بيانات",
  conversation: "محادثة",
  other: "أخرى",
};

const getScoreColor = (score: number) => {
  if (score >= 80) return "text-green-500";
  if (score >= 60) return "text-blue-500";
  if (score >= 40) return "text-amber-500";
  return "text-red-500";
};

const getScoreBgColor = (score: number) => {
  if (score >= 80) return "bg-green-500/20";
  if (score >= 60) return "bg-blue-500/20";
  if (score >= 40) return "bg-amber-500/20";
  return "bg-red-500/20";
};

type PromptHistoryEntry = {
  prompt: string;
  timestamp: Date;
  score: number;
};

interface PersistedPromptHistoryEntry {
  prompt: string;
  timestamp: string;
  score: number;
}

interface PromptEngineeringSnapshot {
  prompt: string;
  analysis: PromptAnalysis | null;
  activeTab: string;
  selectedTemplate: PromptTemplate | null;
  templateVariables: Record<string, string>;
  promptHistory: PersistedPromptHistoryEntry[];
  comparePrompt1: string;
  comparePrompt2: string;
  comparisonResult: ReturnType<typeof comparePrompts> | null;
  suggestions: string[];
}

function restorePromptHistory(
  history: PersistedPromptHistoryEntry[] | undefined
): PromptHistoryEntry[] {
  return (history ?? []).map((entry) => ({
    ...entry,
    timestamp: new Date(entry.timestamp),
  }));
}

function persistPromptHistory(
  history: PromptHistoryEntry[]
): PersistedPromptHistoryEntry[] {
  return history.map((entry) => ({
    ...entry,
    timestamp: entry.timestamp.toISOString(),
  }));
}

export default function ArabicPromptEngineeringStudioPage() {
  const [prompt, setPrompt] = React.useState("");
  const [analysis, setAnalysis] = React.useState<PromptAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("editor");
  const [selectedTemplate, setSelectedTemplate] =
    React.useState<PromptTemplate | null>(null);
  const [templateVariables, setTemplateVariables] = React.useState<
    Record<string, string>
  >({});
  const [promptHistory, setPromptHistory] = React.useState<
    PromptHistoryEntry[]
  >([]);
  const [comparePrompt1, setComparePrompt1] = React.useState("");
  const [comparePrompt2, setComparePrompt2] = React.useState("");
  const [comparisonResult, setComparisonResult] = React.useState<ReturnType<
    typeof comparePrompts
  > | null>(null);
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [isRemoteStateReady, setIsRemoteStateReady] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    void loadRemoteAppState<PromptEngineeringSnapshot>(
      "arabic-prompt-engineering-studio"
    )
      .then((snapshot) => {
        if (cancelled || !snapshot) {
          return;
        }

        setPrompt(snapshot.prompt ?? "");
        setAnalysis(snapshot.analysis ?? null);
        setActiveTab(snapshot.activeTab ?? "editor");
        setSelectedTemplate(snapshot.selectedTemplate ?? null);
        setTemplateVariables(snapshot.templateVariables ?? {});
        setPromptHistory(restorePromptHistory(snapshot.promptHistory));
        setComparePrompt1(snapshot.comparePrompt1 ?? "");
        setComparePrompt2(snapshot.comparePrompt2 ?? "");
        setComparisonResult(snapshot.comparisonResult ?? null);
        setSuggestions(snapshot.suggestions ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          setIsRemoteStateReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!isRemoteStateReady) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void persistRemoteAppState<PromptEngineeringSnapshot>(
        "arabic-prompt-engineering-studio",
        {
          prompt,
          analysis,
          activeTab,
          selectedTemplate,
          templateVariables,
          promptHistory: persistPromptHistory(promptHistory),
          comparePrompt1,
          comparePrompt2,
          comparisonResult,
          suggestions,
        }
      ).catch(() => {});
    }, 400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    activeTab,
    analysis,
    comparePrompt1,
    comparePrompt2,
    comparisonResult,
    isRemoteStateReady,
    prompt,
    promptHistory,
    selectedTemplate,
    suggestions,
    templateVariables,
  ]);

  const handleAnalyze = React.useCallback(() => {
    if (!prompt.trim()) return;

    setIsAnalyzing(true);

    setTimeout(() => {
      try {
        const result = analyzePrompt(prompt);
        setAnalysis(result);
        setSuggestions(generateEnhancementSuggestions(prompt));

        setPromptHistory((prev) => [
          { prompt, timestamp: new Date(), score: result.metrics.overallScore },
          ...prev.slice(0, 9),
        ]);
      } catch {
        setAnalysis(null);
        setSuggestions([]);
      }
      setIsAnalyzing(false);
    }, 500);
  }, [prompt]);

  const handleCopy = React.useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text);
  }, []);

  return (
    <TooltipProvider>
      <main
        dir="rtl"
        className="relative isolate min-h-screen overflow-hidden bg-[var(--background,oklch(0.145_0_0))]"
        style={{
          ["--page-accent" as string]: "var(--accent-technical, #3b5bdb)",
          ["--page-accent-2" as string]: "var(--accent-creative, #c2255c)",
          ["--page-border" as string]: "rgba(255,255,255,0.08)",
        }}
      >
        <NoiseBackground />
        <div className="absolute inset-0 opacity-60 pointer-events-none">
          <BackgroundBeams />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,91,219,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(194,37,92,0.16),transparent_34%)]" />

        <div className="relative z-10 mx-auto max-w-[1600px] px-4 py-4 md:px-6 md:py-6">
          <div className="space-y-6">
            <CardSpotlight className="overflow-hidden rounded-[32px] border border-[var(--page-border)] bg-black/30 shadow-[0_20px_80px_rgba(0,0,0,0.34)] backdrop-blur-2xl">
              <header className="px-6 py-8 text-white md:px-8">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg">
                      <Wand2 className="h-8 w-8" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold tracking-[0.34em] text-white/38">
                        PROMPT ENGINEERING LAB
                      </p>
                      <h1 className="mt-2 text-3xl font-bold mb-1 md:text-4xl">
                        استوديو هندسة التوجيهات العربي
                      </h1>
                      <p className="max-w-3xl text-white/66 leading-7">
                        طبقة بصرية موحدة بنبرة مختبرية/منهجية تساعد على التحرير
                        والتحليل والمقارنة وبناء القوالب داخل نفس لغة المنصة
                        الداكنة.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className="border-purple-400/50 text-purple-200"
                    >
                      <Sparkles className="h-3 w-3 ml-1" />
                      مدعوم بالذكاء الاصطناعي
                    </Badge>
                  </div>
                </div>
              </header>
            </CardSpotlight>

            <CardSpotlight className="overflow-hidden rounded-[32px] border border-[var(--page-border)] bg-black/24 shadow-[0_20px_80px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
              <div className="p-4 md:p-6">
                <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="space-y-6"
                >
                  <TabsList className="grid grid-cols-5 w-full max-w-3xl mx-auto bg-white/6 border border-white/8">
                    <TabsTrigger value="editor" className="gap-2">
                      <PenTool className="h-4 w-4" />
                      المحرر
                    </TabsTrigger>
                    <TabsTrigger value="templates" className="gap-2">
                      <BookOpen className="h-4 w-4" />
                      القوالب
                    </TabsTrigger>
                    <TabsTrigger value="compare" className="gap-2">
                      <ArrowUpDown className="h-4 w-4" />
                      المقارنة
                    </TabsTrigger>
                    <TabsTrigger value="history" className="gap-2">
                      <History className="h-4 w-4" />
                      السجل
                    </TabsTrigger>
                    <TabsTrigger value="lab" className="gap-2">
                      <FlaskConical className="h-4 w-4" />
                      المختبر
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="editor" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2 space-y-4">
                        <Card className="border-purple-500/20 bg-black/10">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-purple-400" />
                                محرر التوجيهات
                              </CardTitle>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCopy(prompt)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setPrompt("")}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <Textarea
                              placeholder="اكتب توجيهك هنا... مثال: اكتب مقالاً تحليلياً عن تأثير الذكاء الاصطناعي على سوق العمل العربي"
                              className="min-h-[300px] bg-black/20 border-purple-500/20 focus:border-purple-500/50 text-lg leading-relaxed"
                              value={prompt}
                              onChange={(e) => setPrompt(e.target.value)}
                              dir="auto"
                            />
                            <div className="flex items-center justify-between text-sm text-white/55">
                              <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1">
                                  <Hash className="h-4 w-4" />
                                  {
                                    prompt.split(/\s+/).filter(Boolean).length
                                  }{" "}
                                  كلمة
                                </span>
                                <span className="flex items-center gap-1">
                                  <FileText className="h-4 w-4" />
                                  {prompt.length} حرف
                                </span>
                                <span className="flex items-center gap-1">
                                  <Zap className="h-4 w-4" />~
                                  {Math.ceil(prompt.length / 4)} tokens
                                </span>
                              </div>
                              <Button
                                onClick={handleAnalyze}
                                disabled={!prompt.trim() || isAnalyzing}
                                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500"
                              >
                                {isAnalyzing ? (
                                  <>
                                    <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                                    جاري التحليل...
                                  </>
                                ) : (
                                  <>
                                    <BarChart3 className="h-4 w-4 ml-2" />
                                    تحليل التوجيه
                                  </>
                                )}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>

                        {suggestions.length > 0 && (
                          <Card className="border-amber-500/20 bg-amber-500/5">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base flex items-center gap-2 text-amber-500">
                                <Lightbulb className="h-5 w-5" />
                                اقتراحات للتحسين
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ul className="space-y-2">
                                {suggestions.map((suggestion, index) => (
                                  <li
                                    key={index}
                                    className="flex items-start gap-2 text-sm"
                                  >
                                    <ChevronRight className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                                    <span>{suggestion}</span>
                                  </li>
                                ))}
                              </ul>
                            </CardContent>
                          </Card>
                        )}
                      </div>

                      <div className="space-y-4">
                        {analysis ? (
                          <>
                            <Card className="border-purple-500/20 bg-black/10">
                              <CardContent className="p-6">
                                <div className="text-center">
                                  <div className="relative w-32 h-32 mx-auto mb-4">
                                    <svg
                                      className="w-32 h-32"
                                      viewBox="0 0 100 100"
                                    >
                                      <circle
                                        cx="50"
                                        cy="50"
                                        r="45"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="8"
                                        className="text-white/[0.04]"
                                      />
                                      <circle
                                        cx="50"
                                        cy="50"
                                        r="45"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="8"
                                        strokeLinecap="round"
                                        strokeDasharray={`${analysis.metrics.overallScore * 2.83} 283`}
                                        transform="rotate(-90 50 50)"
                                        className={getScoreColor(
                                          analysis.metrics.overallScore
                                        )}
                                      />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                      <span
                                        className={cn(
                                          "text-3xl font-bold",
                                          getScoreColor(
                                            analysis.metrics.overallScore
                                          )
                                        )}
                                      >
                                        {analysis.metrics.overallScore}
                                      </span>
                                      <span className="text-xs text-white/55">
                                        من 100
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-center gap-2">
                                    <Badge
                                      className={cn(
                                        "text-sm px-3 py-1",
                                        getScoreBgColor(
                                          analysis.metrics.overallScore
                                        )
                                      )}
                                    >
                                      {analysis.metrics.overallScore >= 80
                                        ? "ممتاز"
                                        : analysis.metrics.overallScore >= 60
                                          ? "جيد"
                                          : analysis.metrics.overallScore >= 40
                                            ? "مقبول"
                                            : "يحتاج تحسين"}
                                    </Badge>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>

                            <Card className="border-purple-500/20 bg-black/10">
                              <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                  <Target className="h-4 w-4 text-purple-400" />
                                  تفاصيل التقييم
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                {[
                                  {
                                    label: "الوضوح",
                                    value: analysis.metrics.clarity,
                                    icon: Eye,
                                  },
                                  {
                                    label: "التحديد",
                                    value: analysis.metrics.specificity,
                                    icon: Target,
                                  },
                                  {
                                    label: "الاكتمال",
                                    value: analysis.metrics.completeness,
                                    icon: CheckCircle,
                                  },
                                  {
                                    label: "الفعالية",
                                    value: analysis.metrics.effectiveness,
                                    icon: TrendingUp,
                                  },
                                  {
                                    label: "كفاءة التوكنز",
                                    value: analysis.metrics.tokenEfficiency,
                                    icon: Zap,
                                  },
                                ].map((metric) => (
                                  <div key={metric.label} className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="flex items-center gap-2 text-white/55">
                                        <metric.icon className="h-4 w-4" />
                                        {metric.label}
                                      </span>
                                      <span
                                        className={cn(
                                          "font-bold",
                                          getScoreColor(metric.value)
                                        )}
                                      >
                                        {metric.value}%
                                      </span>
                                    </div>
                                    <Progress
                                      value={metric.value}
                                      className="h-2"
                                    />
                                  </div>
                                ))}
                              </CardContent>
                            </Card>

                            <Card className="border-purple-500/20 bg-black/10">
                              <CardContent className="p-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="text-center p-3 bg-white/[0.04] rounded-lg">
                                    <p className="text-xs text-white/55 mb-1">
                                      التصنيف
                                    </p>
                                    <Badge variant="secondary">
                                      {CATEGORY_LABELS[analysis.category]}
                                    </Badge>
                                  </div>
                                  <div className="text-center p-3 bg-white/[0.04] rounded-lg">
                                    <p className="text-xs text-white/55 mb-1">
                                      اللغة
                                    </p>
                                    <Badge variant="secondary">
                                      {analysis.language === "ar"
                                        ? "عربية"
                                        : analysis.language === "en"
                                          ? "إنجليزية"
                                          : "مختلطة"}
                                    </Badge>
                                  </div>
                                  <div className="text-center p-3 bg-white/[0.04] rounded-lg">
                                    <p className="text-xs text-white/55 mb-1">
                                      التعقيد
                                    </p>
                                    <Badge variant="secondary">
                                      {analysis.complexity === "low"
                                        ? "منخفض"
                                        : analysis.complexity === "medium"
                                          ? "متوسط"
                                          : "عالي"}
                                    </Badge>
                                  </div>
                                  <div className="text-center p-3 bg-white/[0.04] rounded-lg">
                                    <p className="text-xs text-white/55 mb-1">
                                      التوكنز
                                    </p>
                                    <Badge variant="secondary">
                                      ~{analysis.estimatedTokens}
                                    </Badge>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>

                            <div className="grid grid-cols-1 gap-4">
                              {analysis.strengths.length > 0 && (
                                <Card className="border-green-500/20 bg-green-500/5">
                                  <CardHeader className="pb-2">
                                    <CardTitle className="text-sm flex items-center gap-2 text-green-500">
                                      <CheckCircle className="h-4 w-4" />
                                      نقاط القوة
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <ul className="space-y-1">
                                      {analysis.strengths.map((strength, i) => (
                                        <li
                                          key={i}
                                          className="flex items-center gap-2 text-sm"
                                        >
                                          <ArrowUp className="h-3 w-3 text-green-500" />
                                          {strength}
                                        </li>
                                      ))}
                                    </ul>
                                  </CardContent>
                                </Card>
                              )}

                              {analysis.weaknesses.length > 0 && (
                                <Card className="border-red-500/20 bg-red-500/5">
                                  <CardHeader className="pb-2">
                                    <CardTitle className="text-sm flex items-center gap-2 text-red-500">
                                      <AlertTriangle className="h-4 w-4" />
                                      نقاط الضعف
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <ul className="space-y-1">
                                      {analysis.weaknesses.map(
                                        (weakness, i) => (
                                          <li
                                            key={i}
                                            className="flex items-center gap-2 text-sm"
                                          >
                                            <ArrowDown className="h-3 w-3 text-red-500" />
                                            {weakness}
                                          </li>
                                        )
                                      )}
                                    </ul>
                                  </CardContent>
                                </Card>
                              )}
                            </div>
                          </>
                        ) : (
                          <Card className="border-dashed border-2 border-purple-500/20 bg-black/10">
                            <CardContent className="p-8 text-center">
                              <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
                                <BarChart3 className="h-8 w-8 text-purple-500/50" />
                              </div>
                              <h3 className="text-lg font-medium mb-2">
                                لا يوجد تحليل بعد
                              </h3>
                              <p className="text-sm text-white/55">
                                اكتب توجيهًا واضغط على &quot;تحليل التوجيه&quot;
                                لرؤية التقييم
                              </p>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </CardSpotlight>
          </div>
        </div>
      </main>
    </TooltipProvider>
  );
}
