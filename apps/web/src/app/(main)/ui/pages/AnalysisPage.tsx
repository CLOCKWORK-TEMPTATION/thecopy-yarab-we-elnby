import { ArrowRight, Brain, FileText, Network, Users } from "lucide-react";
import { useState } from "react";

import { CausalPlotGraph } from "@/app/(main)/ui/components/CausalPlotGraph";
import { ConfidenceMeter } from "@/app/(main)/ui/components/ConfidenceMeter";
import { DebateView } from "@/app/(main)/ui/components/DebateView";
import { ExportHub } from "@/app/(main)/ui/components/ExportHub";
import { SevenStationsDock } from "@/app/(main)/ui/components/SevenStationsDock";
import { UploadDock } from "@/app/(main)/ui/components/UploadDock";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNotifications } from "@/hooks/use-notifications";
import { logger } from "@/lib/ai/utils/logger";

interface AnalysisPageProps {
  onAnalysisFinalized?: (summary: string) => void;
}

interface StationResult {
  station: number;
  data: string;
  confidence: number;
}

interface UploadPromptProps {
  onUpload: (file: File) => void;
}

function UploadPrompt({ onUpload }: UploadPromptProps) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 text-center">
        <h2 className="text-[var(--color-text)] mb-2">ابدأ التحليل</h2>
        <p className="text-[var(--color-muted)]">
          ارفع ملف النص الخاص بك لبدء عملية التحليل
        </p>
      </div>
      <UploadDock onUpload={onUpload} />
    </div>
  );
}

interface FinalReportProps {
  onConvert: () => void;
}

function FinalReport({ onConvert }: FinalReportProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="p-6 bg-[var(--color-panel)] border-[var(--color-surface)]">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-[var(--color-text)] mb-2" dir="rtl">
              التقرير النهائي
            </h2>
            <p className="text-[var(--color-muted)]" dir="rtl">
              اكتملت جميع المحطات السبع بنجاح
            </p>
          </div>
          <Badge className="bg-[var(--state-final)] text-white">مكتمل</Badge>
        </div>

        <div
          className="prose prose-invert max-w-none space-y-4 text-[var(--color-text)]"
          dir="rtl"
        >
          <h3>ملخص التحليل</h3>
          <p>
            تم تحليل النص عبر سبع محطات متخصصة، كل منها تستهدف جانباً محدداً من
            البنية السردية. النتائج التالية تمثل توليفة شاملة للتحليل:
          </p>

          <div className="grid gap-4 mt-6">
            <div className="p-4 bg-[var(--color-surface)] rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-[var(--color-accent)]" />
                <h4>البنية السردية</h4>
              </div>
              <p className="text-[var(--color-muted)]">
                تم تحديد 12 مشهداً رئيسياً موزعة على 3 فصول
              </p>
            </div>

            <div className="p-4 bg-[var(--color-surface)] rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-[var(--color-accent)]" />
                <h4>الشخصيات</h4>
              </div>
              <p className="text-[var(--color-muted)]">
                5 شخصيات رئيسية مع علاقات معقدة وتطور ملحوظ
              </p>
            </div>

            <div className="p-4 bg-[var(--color-surface)] rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Network className="w-5 h-5 text-[var(--color-accent)]" />
                <h4>العلاقات السببية</h4>
              </div>
              <p className="text-[var(--color-muted)]">
                شبكة معقدة من 23 علاقة سببية مباشرة
              </p>
            </div>

            <div className="p-4 bg-[var(--color-surface)] rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-5 h-5 text-[var(--color-accent)]" />
                <h4>مستوى الثقة</h4>
              </div>
              <div className="space-y-3 mt-3">
                <ConfidenceMeter type="cognitive" level="high" value={87} />
                <ConfidenceMeter type="aleatoric" level="mid" value={62} />
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 rounded-lg">
            <h4 className="text-[var(--color-accent)] mb-2">التوصيات</h4>
            <ul className="space-y-2 text-[var(--color-muted)]">
              <li>• تعزيز العلاقة بين الشخصية الثانية والثالثة</li>
              <li>• إضافة نقطة تحول في الفصل الثاني</li>
              <li>• توضيح الدوافع في المشاهد 5-7</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-[var(--color-surface)]">
          <Button
            onClick={onConvert}
            className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-[var(--color-bg)]"
          >
            <ArrowRight className="w-4 h-4 ml-2" />
            تحويل للتطوير
          </Button>
        </div>
      </Card>
    </div>
  );
}

interface StationPanelProps {
  currentStation: number;
  progress: "idle" | "running" | "review" | "finalized";
  stationResults: Record<number, StationResult>;
  stationTitle: string;
  onRunStation: () => void;
  onNextStation: () => void;
}

function StationPanel({
  currentStation,
  progress,
  stationResults,
  stationTitle,
  onRunStation,
  onNextStation,
}: StationPanelProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="p-6 bg-[var(--color-panel)] border-[var(--color-surface)]">
        <h2 className="text-[var(--color-text)] mb-4" dir="rtl">
          المحطة {currentStation}: {stationTitle}
        </h2>

        {progress === "idle" && (
          <div className="text-center py-8">
            <p className="text-[var(--color-muted)] mb-6">
              جاهز لبدء تحليل {stationTitle}
            </p>
            <Button
              onClick={onRunStation}
              className="bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-[var(--color-bg)]"
            >
              تشغيل المحطة
            </Button>
          </div>
        )}

        {progress === "running" && (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[var(--color-text)]">جاري التحليل...</p>
          </div>
        )}

        {progress === "review" && stationResults[currentStation] && (
          <StationReviewContent
            currentStation={currentStation}
            result={stationResults[currentStation]}
            onNextStation={onNextStation}
          />
        )}
      </Card>
    </div>
  );
}

interface StationReviewContentProps {
  currentStation: number;
  result: StationResult;
  onNextStation: () => void;
}

function StationReviewContent({
  currentStation,
  result,
  onNextStation,
}: StationReviewContentProps) {
  return (
    <div className="space-y-6">
      <div className="p-4 bg-[var(--color-surface)] rounded-lg">
        <h3 className="text-[var(--color-text)] mb-3">النتائج الأولية</h3>
        <p className="text-[var(--color-muted)]" dir="rtl">
          {result.data}
        </p>
      </div>

      {currentStation === 4 && (
        <DebateView
          density="cozy"
          perspective="chronological"
          turns={[
            {
              id: "1",
              agent: "محلل أ",
              claim: "البنية السردية تتبع نموذج الرحلة البطولية الكلاسيكية",
              evidence: [
                "وجود دعوة للمغامرة واضحة في الفصل الأول",
                "تطور الشخصية الرئيسية عبر تحديات متصاعدة",
              ],
              verdict: "agree",
              timestamp: new Date(),
            },
            {
              id: "2",
              agent: "محلل ب",
              claim: "هناك عناصر من البنية غير الخطية تكسر النموذج الكلاسيكي",
              evidence: [
                "استخدام الفلاش باك في عدة مشاهد محورية",
                "وجود نهايات متعددة محتملة",
              ],
              verdict: "partial",
              timestamp: new Date(),
            },
          ]}
        />
      )}

      {currentStation === 6 && (
        <CausalPlotGraph
          layout="force"
          filter="all"
          nodes={[
            { id: "s1", label: "البداية", type: "scene", x: 20, y: 50 },
            { id: "c1", label: "البطل", type: "character", x: 40, y: 30 },
            { id: "e1", label: "الصراع", type: "event", x: 50, y: 50 },
            { id: "s2", label: "الذروة", type: "scene", x: 70, y: 40 },
            { id: "s3", label: "النهاية", type: "scene", x: 85, y: 50 },
          ]}
          edges={[
            { id: "e1", from: "s1", to: "c1", weight: 0.9, type: "normal" },
            { id: "e2", from: "c1", to: "e1", weight: 0.8, type: "conflict" },
            { id: "e3", from: "e1", to: "s2", weight: 0.95, type: "reveal" },
            { id: "e4", from: "s2", to: "s3", weight: 0.85, type: "twist" },
          ]}
        />
      )}

      <div className="space-y-3">
        <h4 className="text-[var(--color-text)]">مستوى الثقة</h4>
        <ConfidenceMeter
          type="cognitive"
          level={
            result.confidence > 70
              ? "high"
              : result.confidence > 40
                ? "mid"
                : "low"
          }
          value={result.confidence}
        />
      </div>

      <Button
        onClick={onNextStation}
        className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-[var(--color-bg)]"
      >
        {currentStation < 7 ? "الانتقال للمحطة التالية" : "إنهاء التحليل"}
      </Button>
    </div>
  );
}

export function AnalysisPage({ onAnalysisFinalized }: AnalysisPageProps) {
  const notifications = useNotifications();
  const [currentStation, setCurrentStation] = useState(1);
  const [progress, setProgress] = useState<
    "idle" | "running" | "review" | "finalized"
  >("idle");
  const [uploadComplete, setUploadComplete] = useState(false);
  const [stationResults, setStationResults] = useState<
    Record<number, StationResult>
  >({});

  const stations = [
    { id: 1, title: "استخلاص البنية" },
    { id: 2, title: "تحليل الشخصيات" },
    { id: 3, title: "تحليل السببية" },
    { id: 4, title: "مناظرة التفسير" },
    { id: 5, title: "تقييم الثقة" },
    { id: 6, title: "رسم العلاقات" },
    { id: 7, title: "التقرير النهائي" },
  ];

  const handleRunStation = async () => {
    if (!uploadComplete) {
      notifications.error("يرجى رفع ملف أولاً");
      return;
    }
    setProgress("running");
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const mockResult = {
      station: currentStation,
      data: `نتائج المحطة ${currentStation}`,
      confidence: Math.random() * 100,
    };
    setStationResults((prev) => ({ ...prev, [currentStation]: mockResult }));
    setProgress("review");
    notifications.success(`اكتملت المحطة ${currentStation}`);
  };

  const handleNextStation = () => {
    if (currentStation < 7) {
      setCurrentStation(currentStation + 1);
      setProgress("idle");
    } else {
      setProgress("finalized");
      notifications.success("اكتمل التحليل السباعي بنجاح!");
    }
  };

  const handleConvertToDevelopment = () => {
    const summary = `تم إكمال التحليل السباعي بنجاح. تم تحديد ${Math.floor(Math.random() * 10) + 15} مشهداً رئيسياً، ${Math.floor(Math.random() * 5) + 5} شخصيات محورية، و${Math.floor(Math.random() * 8) + 10} علاقات سببية. التوصيات الرئيسية: تعزيز التطور الدرامي في الفصل الثاني، توضيح دوافع الشخصية الثانوية، وإضافة نقطة تحول في المشهد 12.`;
    onAnalysisFinalized?.(summary);
    notifications.success("جاري التحويل لورشة التطوير...");
  };

  return (
    <div className="flex h-screen">
      <div className="w-80 border-l border-[var(--color-surface)] bg-[var(--color-panel)] p-4 overflow-y-auto">
        <SevenStationsDock
          current={currentStation}
          progress={progress}
          items={stations.map((s) => ({
            ...s,
            state:
              s.id < currentStation
                ? "finalized"
                : s.id === currentStation
                  ? progress
                  : "idle",
          }))}
          onNext={handleNextStation}
          onPrev={() => setCurrentStation(Math.max(1, currentStation - 1))}
          onViewDetails={(id) => logger.info("View station:", id)}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-[var(--color-surface)] bg-[var(--color-panel)] px-6 py-4">
          <h1 className="text-[var(--color-text)] mb-1" dir="rtl">
            التحليل السباعي
          </h1>
          <p className="text-[var(--color-muted)]" dir="rtl">
            نظام تحليل متقدم بسبع محطات متتالية
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!uploadComplete ? (
            <UploadPrompt
              onUpload={(file) => {
                logger.info("Uploaded:", file);
                setTimeout(() => setUploadComplete(true), 2000);
              }}
            />
          ) : progress === "finalized" ? (
            <FinalReport onConvert={handleConvertToDevelopment} />
          ) : (
            <StationPanel
              currentStation={currentStation}
              progress={progress}
              stationResults={stationResults}
              stationTitle={stations[currentStation - 1]?.title ?? ""}
              onRunStation={handleRunStation}
              onNextStation={handleNextStation}
            />
          )}
        </div>

        <ExportHub scope="full_project" />
      </div>
    </div>
  );
}
