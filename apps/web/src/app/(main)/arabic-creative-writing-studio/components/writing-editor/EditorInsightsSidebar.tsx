import {
  EMOTIONAL_TONE_LABELS,
  QUALITY_LABELS,
} from "@/app/(main)/arabic-creative-writing-studio/lib/studio/writing-editor-utils";
import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

import type {
  CalculatedTextStats,
  OperationFeedEntry,
} from "@/app/(main)/arabic-creative-writing-studio/components/writing-editor/types";
import type { TextAnalysis } from "@/app/(main)/arabic-creative-writing-studio/types";

interface EditorInsightsSidebarProps {
  analysis: TextAnalysis | null;
  analysisNarrative: { headline: string; description: string } | null;
  isAnalysisStale: boolean;
  operationFeed: OperationFeedEntry[];
  textStats: CalculatedTextStats;
  writingTimeLabel: string;
}

function StatsPanel({
  textStats,
  writingTimeLabel,
}: Pick<EditorInsightsSidebarProps, "textStats" | "writingTimeLabel">) {
  return (
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
              {writingTimeLabel}
            </div>
            <div className="text-sm text-white/55">وقت الكتابة</div>
          </div>
        </div>
      </CardContent>
    </CardSpotlight>
  );
}

function OperationPanel({
  operationFeed,
}: Pick<EditorInsightsSidebarProps, "operationFeed">) {
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
}

function AnalysisPanel({
  analysis,
  analysisNarrative,
  isAnalysisStale,
}: Pick<
  EditorInsightsSidebarProps,
  "analysis" | "analysisNarrative" | "isAnalysisStale"
>) {
  if (!analysis || !analysisNarrative) {
    return null;
  }

  return (
    <CardSpotlight className="rounded-[22px]">
      <CardHeader>
        <CardTitle>🎯 تحليل جودة النص</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h4 className="font-semibold text-white">
              {analysisNarrative.headline}
            </h4>
            <p className="mt-2 text-sm leading-6 text-white/72">
              {analysisNarrative.description}
            </p>
          </div>

          {isAnalysisStale ? (
            <Alert className="border-amber-400/30 bg-amber-500/10 text-amber-100">
              <AlertDescription>
                التحليل المعروض يخص نسخة أقدم من النص الحالي. أعد تشغيل التحليل
                بعد آخر تعديلاتك للحصول على قراءة محدثة.
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
}

function QuickTipsCard() {
  return (
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
  );
}

export function EditorInsightsSidebar(props: EditorInsightsSidebarProps) {
  return (
    <div className="space-y-6">
      <StatsPanel
        textStats={props.textStats}
        writingTimeLabel={props.writingTimeLabel}
      />
      <OperationPanel operationFeed={props.operationFeed} />
      <AnalysisPanel
        analysis={props.analysis}
        analysisNarrative={props.analysisNarrative}
        isAnalysisStale={props.isAnalysisStale}
      />
      <QuickTipsCard />
    </div>
  );
}
