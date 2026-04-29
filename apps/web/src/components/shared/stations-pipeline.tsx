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
import { useState, useTransition } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { runFullPipeline } from "@/lib/actions/analysis";
// import { textChunker, type ContextMap } from "@/lib/ai/text-chunking";

// Minimal ContextMap type to avoid missing type errors when chunking is disabled
interface ContextMap {
  chunks: { id: string; content: string }[];
  totalTokens: number;
}

type PipelineResult = Awaited<ReturnType<typeof runFullPipeline>>;
type StationStatus = "pending" | "running" | "completed" | "failed";

function buildSharedFormattedResults(
  pipelineResult: PipelineResult
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

function saveSharedAnalysisToStorage(
  pipelineResult: PipelineResult,
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

  try {
    localStorage.setItem("sevenStationsAnalysis", JSON.stringify(analysisData));
  } catch {
    /* unavailable */
  }
  try {
    sessionStorage.setItem(
      "stationAnalysisResults",
      JSON.stringify(analysisData)
    );
    sessionStorage.setItem("analysisId", analysisId);
    sessionStorage.setItem("originalText", text);
    sessionStorage.setItem("contextMap", JSON.stringify(contextMap));
  } catch {
    /* unavailable */
  }

  return analysisId;
}

function buildSharedExportReport(
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

function triggerSharedDownload(content: string, filename: string) {
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
const FileUpload = dynamic(() => import("@/components/file-upload"), {
  loading: () => (
    <div className="flex items-center justify-center p-4">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
    </div>
  ),
});

const StationCard = dynamic(() => import("@/components/station-card"), {
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
    Array<StationStatus>(STATIONS.length).fill("pending")
  );
  const [activeStation, setActiveStation] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [contextMap] = useState<ContextMap | null>(null);
  const [isLongText] = useState<boolean>(false);
  const { toast } = useToast();

  const progress =
    (statuses.filter((s) => s === "completed").length / STATIONS.length) * 100;
  const allStationsCompleted = statuses.every((s) => s === "completed");

  const handleReset = () => {
    setText("");
    setResults({});
    setStatuses(Array<StationStatus>(STATIONS.length).fill("pending"));
    setActiveStation(null);
    setErrorMessage(null);
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

    setStatuses(Array<StationStatus>(STATIONS.length).fill("pending"));
    setResults({});
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const pipelineResult = await runFullPipeline({
          fullText: text,
          projectName: "تحليل درامي شامل",
        });
        const formattedResults = buildSharedFormattedResults(pipelineResult);
        const nextStatuses: StationStatus[] = STATIONS.map((station) =>
          formattedResults[station.id] ? "completed" : "failed"
        );

        saveSharedAnalysisToStorage(
          pipelineResult,
          contextMap,
          isLongText,
          text
        );

        setResults(formattedResults);
        setStatuses(nextStatuses);
        setActiveStation(null);

        const completedCount = nextStatuses.filter(
          (s) => s === "completed"
        ).length;
        toast({
          title: "اكتمل التحليل",
          description:
            pipelineResult.mode === "fallback"
              ? `تم التحليل عبر المسار الاحتياطي المحلي (${completedCount}/7 محطات). يمكنك الانتقال لصفحة التطوير.`
              : `تم تحليل النص بنجاح (${completedCount}/7 محطات). يمكنك الانتقال لصفحة التطوير.`,
        });

        if (
          pipelineResult.mode === "fallback" &&
          pipelineResult.warnings.length > 0
        ) {
          toast({
            title: "ملاحظة: مسار احتياطي",
            description: pipelineResult.warnings[0],
          });
        }
      } catch (error: unknown) {
        const errorMsg =
          error instanceof Error ? error.message : "خطأ غير معروف";
        setErrorMessage(
          `فشل التحليل: ${errorMsg}. تحقق من اتصال الشبكة أو حاول مرة أخرى.`
        );
        toast({
          title: "فشل التحليل",
          description: `${errorMsg} — تحقق من اتصال الشبكة أو حاول مرة أخرى.`,
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
    const fullReport = buildSharedExportReport(STATIONS, results);
    triggerSharedDownload(fullReport, `final-report-${Date.now()}.txt`);
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
          className="min-h-48 w-full rounded-lg border-2 bg-card p-4 shadow-sm"
          value={text}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setText(e.target.value)
          }
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
                <span className="text-sm text-muted-foreground ml-2">
                  ({contextMap?.chunks.length} جزء)
                </span>
              )}
            </h3>
            <span className="text-sm font-medium text-primary">{`${Math.round(progress)}%`}</span>
          </div>
          <Progress value={progress} className="w-full" />
          {contextMap && contextMap.chunks.length > 1 && (
            <p className="text-sm text-muted-foreground">
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
