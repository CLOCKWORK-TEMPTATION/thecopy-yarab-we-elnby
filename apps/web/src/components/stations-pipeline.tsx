"use client";

import {
  AreaChart,
  BookOpenText,
  BrainCircuit,
  Gauge,
  Network,
  Play,
  Stethoscope,
  Users,
  X,
  Loader2,
  AlertCircle,
  Download,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState, useTransition } from "react";

import { useToast } from "@/hooks/use-toast";
import { runFullPipeline } from "@/lib/actions/analysis";
import {
  loadRemoteAppState,
  persistRemoteAppState,
} from "@/lib/app-state-client";

// import { textChunker, type ContextMap } from "@/lib/ai/text-chunking";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Textarea } from "./ui/textarea";

// Minimal ContextMap type to avoid missing type errors when chunking is disabled
interface ContextMap {
  chunks: { id: string; content: string }[];
  totalTokens: number;
}

type StationStatus = "pending" | "running" | "completed" | "failed";

interface AnalysisSnapshot {
  text: string;
  results: Record<string, unknown>;
  statuses: StationStatus[];
  activeStation: number | null;
  errorMessage: string | null;
  analysisId: string | null;
}

function createPendingStatuses(): StationStatus[] {
  return Array<StationStatus>(STATIONS.length).fill("pending");
}

function isStationStatus(value: unknown): value is StationStatus {
  return (
    value === "pending" ||
    value === "running" ||
    value === "completed" ||
    value === "failed"
  );
}

function normalizeStatuses(value: unknown): StationStatus[] {
  if (
    Array.isArray(value) &&
    value.length === STATIONS.length &&
    value.every(isStationStatus)
  ) {
    return value;
  }

  return createPendingStatuses();
}

function restoreResults(
  storedResults: Record<string, unknown> | undefined
): Record<number, unknown> {
  if (!storedResults) {
    return {};
  }

  return Object.entries(storedResults).reduce<Record<number, unknown>>(
    (accumulator, [key, value]) => {
      const stationId = Number(key);
      if (Number.isInteger(stationId)) {
        accumulator[stationId] = value;
      }
      return accumulator;
    },
    {}
  );
}

function buildFormattedResults(
  pipelineResult: Awaited<ReturnType<typeof runFullPipeline>>
): Record<number, unknown> {
  return {
    1: pipelineResult?.stationOutputs?.station1,
    2: pipelineResult?.stationOutputs?.station2,
    3: pipelineResult?.stationOutputs?.station3,
    4: pipelineResult?.stationOutputs?.station4,
    5: pipelineResult?.stationOutputs?.station5,
    6: pipelineResult?.stationOutputs?.station6,
    7: pipelineResult?.stationOutputs?.station7,
  };
}

function saveAnalysisToSession(
  pipelineResult: Awaited<ReturnType<typeof runFullPipeline>>,
  contextMap: ContextMap | null,
  isLongText: boolean,
  text: string
): string {
  const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const analysisData = {
    ...(pipelineResult || {}),
    contextMap,
    isLongText,
    originalTextLength: text.length,
  };
  sessionStorage.setItem(
    "stationAnalysisResults",
    JSON.stringify(analysisData)
  );
  sessionStorage.setItem("analysisId", analysisId);
  sessionStorage.setItem("originalText", text);
  sessionStorage.setItem("contextMap", JSON.stringify(contextMap));
  return analysisId;
}

function buildExportReport(
  stations: typeof STATIONS,
  results: Record<number, unknown>
): string {
  const sections = [
    "===========================================",
    "التقرير النهائي الشامل - جميع المحطات",
    "===========================================",
    "",
    `تاريخ التقرير: ${new Date().toLocaleDateString("ar")}`,
    "",
  ];

  stations.forEach((station) => {
    sections.push(`## ${station.name}`);
    sections.push("-------------------------------------------");
    const data = results[station.id];
    if (data) {
      sections.push(
        typeof data === "string" ? data : JSON.stringify(data, null, 2)
      );
    } else {
      sections.push("لا توجد بيانات");
    }
    sections.push("");
  });

  sections.push("===========================================");
  sections.push("نهاية التقرير");
  sections.push("===========================================");
  return sections.join("\n");
}

function triggerDownload(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Dynamically import heavy components
const FileUpload = dynamic(() => import("./file-upload"), {
  loading: () => (
    <div className="flex items-center justify-center p-4">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
    </div>
  ),
});

const StationCard = dynamic(() => import("./station-card"), {
  loading: () => (
    <div className="flex items-center justify-center p-4">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
    </div>
  ),
  ssr: false,
});

const STATIONS = [
  {
    id: 1,
    name: "المحطة 1: التحليل الأساسي",
    description: "يستخرج الشخصيات وعلاقاتهم.",
    Icon: Users,
  },
  {
    id: 2,
    name: "المحطة 2: التحليل المفاهيمي",
    description: "يحدد بيان القصة والنوع.",
    Icon: BookOpenText,
  },
  {
    id: 3,
    name: "المحطة 3: بناء الشبكة",
    description: "يبني هيكل شبكة الصراع.",
    Icon: Network,
  },
  {
    id: 4,
    name: "المحطة 4: مقاييس الكفاءة",
    description: "يقيس كفاءة وفعالية النص.",
    Icon: Gauge,
  },
  {
    id: 5,
    name: "المحطة 5: التحليل المتقدم",
    description: "يحلل الديناميكيات والرموز.",
    Icon: BrainCircuit,
  },
  {
    id: 6,
    name: "المحطة 6: التشخيص والعلاج",
    description: "يشخص الشبكة ويقترح تحسينات.",
    Icon: Stethoscope,
  },
  {
    id: 7,
    name: "المحطة 7: التقرير النهائي",
    description: "يولد التصورات والملخصات النهائية.",
    Icon: AreaChart,
  },
];

const StationsPipeline = () => {
  const [text, setText] = useState("");
  const [results, setResults] = useState<Record<number, unknown>>({});
  const [statuses, setStatuses] = useState<StationStatus[]>(
    createPendingStatuses
  );
  const [activeStation, setActiveStation] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [contextMap] = useState<ContextMap | null>(null);
  const [isLongText] = useState<boolean>(false);
  const [isRemoteStateReady, setIsRemoteStateReady] = useState(false);
  const { toast } = useToast();

  const progress =
    (statuses.filter((s) => s === "completed").length / STATIONS.length) * 100;
  const allStationsCompleted = statuses.every((s) => s === "completed");

  useEffect(() => {
    let cancelled = false;

    void loadRemoteAppState<AnalysisSnapshot>("analysis")
      .then((snapshot) => {
        if (cancelled || !snapshot) return;
        setText(snapshot.text ?? "");
        setResults(restoreResults(snapshot.results));
        setStatuses(normalizeStatuses(snapshot.statuses));
        setActiveStation(snapshot.activeStation ?? null);
        setErrorMessage(snapshot.errorMessage ?? null);
        setAnalysisId(snapshot.analysisId ?? null);
        if (snapshot.analysisId) {
          toast({
            title: "تمت استعادة آخر تحليل",
            description:
              "تم تحميل آخر حالة محفوظة من الخادم المحلي لمسار التحليل.",
          });
        }
      })
      .catch(() => {
        /* empty */
      })
      .finally(() => {
        if (!cancelled) setIsRemoteStateReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [toast]);

  useEffect(() => {
    if (!isRemoteStateReady) return;

    const timeoutId = window.setTimeout(() => {
      void persistRemoteAppState<AnalysisSnapshot>("analysis", {
        text,
        results: Object.fromEntries(
          Object.entries(results).map(([key, value]) => [String(key), value])
        ),
        statuses,
        activeStation,
        errorMessage,
        analysisId,
      }).catch(() => {
        /* empty */
      });
    }, 400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    activeStation,
    analysisId,
    errorMessage,
    isRemoteStateReady,
    results,
    statuses,
    text,
  ]);

  const handleReset = () => {
    setText("");
    setResults({});
    setStatuses(createPendingStatuses());
    setActiveStation(null);
    setErrorMessage(null);
    setAnalysisId(null);
    sessionStorage.removeItem("stationAnalysisResults");
    sessionStorage.removeItem("analysisId");
    sessionStorage.removeItem("originalText");
    sessionStorage.removeItem("contextMap");
  };

  const handleStartAnalysis = () => {
    if (!text.trim()) {
      toast({
        title: "الإدخال مطلوب",
        description: "الرجاء إدخال بعض النصوص لتحليلها.",
        variant: "destructive",
      });
      return;
    }

    setStatuses(createPendingStatuses());
    setResults({});
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const pipelineResult = await runFullPipeline({
          fullText: text,
          projectName: "تحليل درامي شامل",
        });
        const formattedResults = buildFormattedResults(pipelineResult);
        const nextStatuses: StationStatus[] = STATIONS.map((station) =>
          formattedResults[station.id] ? "completed" : "failed"
        );
        const newAnalysisId = saveAnalysisToSession(
          pipelineResult,
          contextMap,
          isLongText,
          text
        );

        setAnalysisId(newAnalysisId);
        setResults(formattedResults);
        setStatuses(nextStatuses);
        setActiveStation(null);
        toast({
          title: "اكتمل التحليل",
          description: isLongText
            ? `تم تحليل النص الطويل (${contextMap?.chunks.length ?? 0} أجزاء) وحفظ النتائج لقسم التطوير الإبداعي.`
            : "تم حفظ النتائج لقسم التطوير الإبداعي. يمكنك الآن الانتقال لصفحة التطوير.",
        });

        if (
          pipelineResult.mode === "fallback" &&
          pipelineResult.warnings.length > 0
        ) {
          toast({
            title: "تم تفعيل المسار الاحتياطي",
            description: pipelineResult.warnings[0],
          });
        }
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "خطأ غير معروف";
        setAnalysisId(null);
        setErrorMessage(`فشل التحليل: ${message}`);
        toast({
          title: "فشل التحليل",
          description: message,
          variant: "destructive",
        });
      }
    });
  };

  const handleExportFinalReport = () => {
    if (!allStationsCompleted) {
      toast({
        title: "التحليل غير مكتمل",
        description: "يرجى الانتظار حتى تكتمل جميع المحطات",
        variant: "destructive",
      });
      return;
    }
    const fullReport = buildExportReport(STATIONS, results);
    triggerDownload(fullReport, `final-report-${Date.now()}.txt`);
    toast({
      title: "تم التصدير بنجاح",
      description: "تم تصدير التقرير النهائي الشامل",
    });
  };

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <FileUpload
          onFileContent={(content: string, filename: string) => {
            setText(content);
            toast({
              title: "تم تحميل الملف",
              description: `تم تحميل ${filename} بنجاح`,
            });
          }}
        />
        <Textarea
          placeholder="ألصق النص الدرامي هنا لبدء التحليل ..."
          className="min-h-48 w-full rounded-[22px] border-2 bg-white/[0.04] p-4 shadow-sm"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isPending}
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <div className="flex gap-2">
            <Button
              onClick={handleStartAnalysis}
              disabled={isPending || !text}
              className="w-full sm:w-auto"
            >
              {isPending ? (
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="ml-2 h-4 w-4" />
              )}
              {isPending ? "جاري التحليل..." : "ابدأ التحليل"}
            </Button>
            {text && (
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={isPending}
              >
                <X className="ml-2 h-4 w-4" />
                إعادة تعيين
              </Button>
            )}
          </div>
        </div>
      </div>

      {(isPending || progress > 0 || errorMessage) && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-headline text-lg font-medium">
              خط أنابيب التحليل
              {isLongText && (
                <span className="text-sm text-white/55 ml-2">
                  ({contextMap?.chunks.length} جزء)
                </span>
              )}
            </h3>
            <span className="text-sm font-medium text-primary">{`${Math.round(progress)}%`}</span>
          </div>
          <Progress value={progress} className="w-full" />
          {contextMap && contextMap.chunks.length > 1 && (
            <p className="text-sm text-white/55">
              النص طويل ({contextMap.totalTokens.toLocaleString()} توكن تقريباً)
              - سيتم تقسيمه إلى {contextMap.chunks.length} أجزاء للمعالجة
            </p>
          )}
        </div>
      )}

      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>خطأ</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {STATIONS.map((station, index) => (
          <StationCard
            key={station.id}
            station={station}
            status={statuses[index] ?? "pending"}
            results={results}
            isActive={activeStation === station.id}
          />
        ))}
      </div>

      {allStationsCompleted && (
        <div className="flex justify-center pt-4">
          <Button onClick={handleExportFinalReport} size="lg" className="gap-2">
            <Download className="h-5 w-5" />
            تصدير التقرير النهائي الشامل
          </Button>
        </div>
      )}
    </div>
  );
};

export { StationsPipeline };
