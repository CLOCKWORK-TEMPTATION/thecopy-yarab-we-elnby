"use client";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import type { SceneRhythmAnalysis } from "../../types";

type RhythmTab = "map" | "comparison" | "monotony" | "suggestions";

function isRhythmTab(value: string): value is RhythmTab {
  return (
    value === "map" ||
    value === "comparison" ||
    value === "monotony" ||
    value === "suggestions"
  );
}

interface RhythmAnalysisProps {
  rhythmScriptText: string;
  setRhythmScriptText: (text: string) => void;
  analyzingRhythm: boolean;
  rhythmAnalysis: SceneRhythmAnalysis | null;
  selectedRhythmTab: RhythmTab;
  setSelectedRhythmTab: (tab: RhythmTab) => void;
  useRhythmSampleScript: () => void;
  analyzeSceneRhythm: () => void;
  getTempoColor: (tempo: string) => string;
  getTempoLabel: (tempo: string) => string;
  getSeverityColor: (severity: string) => string;
}

interface RhythmMapTabProps {
  rhythmMap: SceneRhythmAnalysis["rhythmMap"];
  getTempoColor: (tempo: string) => string;
  getTempoLabel: (tempo: string) => string;
}

const RhythmMapTab: React.FC<RhythmMapTabProps> = ({
  rhythmMap,
  getTempoColor,
  getTempoLabel,
}) => (
  <TabsContent value="map" className="space-y-4">
    <div className="bg-white p-4 rounded-[22px]">
      <h4 className="font-semibold mb-4">خريطة الإيقاع</h4>
      <div className="space-y-3">
        {rhythmMap.map((point, idx) => (
          <div
            key={idx}
            className="flex items-center gap-4 p-3 border rounded-lg"
          >
            <div
              className={`w-4 h-4 rounded-full ${getTempoColor(point.tempo)}`}
            />
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium">{point.beat}</span>
                <Badge variant="outline" className="text-xs">
                  {getTempoLabel(point.tempo)}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={point.intensity} className="flex-1 h-2" />
                <span className="text-sm text-white/55">
                  {point.intensity}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </TabsContent>
);

interface ComparisonTabProps {
  comparisons: SceneRhythmAnalysis["comparisons"];
}

const ComparisonTab: React.FC<ComparisonTabProps> = ({ comparisons }) => (
  <TabsContent value="comparison" className="space-y-4">
    <div className="bg-white p-4 rounded-[22px]">
      <h4 className="font-semibold mb-4">المقارنة مع المعايير المثلى</h4>
      <div className="space-y-4">
        {comparisons.map((comp, idx) => (
          <div key={idx} className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium">{comp.aspect}</span>
              <span className="text-sm text-white/55">
                {comp.yourScore} vs {comp.optimalScore}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={comp.yourScore} className="flex-1" />
              <span className="text-sm font-medium">
                {comp.difference > 0 ? "+" : ""}
                {comp.difference}
              </span>
            </div>
            <p className="text-sm text-white/55">{comp.feedback}</p>
          </div>
        ))}
      </div>
    </div>
  </TabsContent>
);

interface MonotonyTabProps {
  monotonyAlerts: SceneRhythmAnalysis["monotonyAlerts"];
  getSeverityColor: (severity: string) => string;
}

const MonotonyTab: React.FC<MonotonyTabProps> = ({
  monotonyAlerts,
  getSeverityColor,
}) => (
  <TabsContent value="monotony" className="space-y-4">
    <div className="bg-white p-4 rounded-[22px]">
      <h4 className="font-semibold mb-4">تنبيهات الرتابة</h4>
      {monotonyAlerts.length > 0 ? (
        <div className="space-y-3">
          {monotonyAlerts.map((alert, idx) => (
            <div
              key={idx}
              className={`p-3 border rounded-lg ${getSeverityColor(alert.severity)}`}
            >
              <p className="font-medium mb-1">
                الموقع: {alert.startPosition}% - {alert.endPosition}%
              </p>
              <p className="text-sm mb-2">{alert.description}</p>
              <p className="text-sm italic">{alert.suggestion}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-white/55">لا توجد تنبيهات رتابة - الإيقاع جيد!</p>
      )}
    </div>
  </TabsContent>
);

interface SuggestionsTabProps {
  emotionalSuggestions: SceneRhythmAnalysis["emotionalSuggestions"];
}

const SuggestionsTab: React.FC<SuggestionsTabProps> = ({
  emotionalSuggestions,
}) => (
  <TabsContent value="suggestions" className="space-y-4">
    <div className="bg-white p-4 rounded-[22px]">
      <h4 className="font-semibold mb-4">اقتراحات تحسين العاطفة</h4>
      <div className="space-y-4">
        {emotionalSuggestions.map((suggestion, idx) => (
          <div key={idx} className="p-4 border rounded-lg bg-blue-50">
            <p className="font-medium mb-2">&quot;{suggestion.segment}&quot;</p>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-white/55">الحالي:</span>{" "}
                {suggestion.currentEmotion}
              </p>
              <p>
                <span className="text-white/55">المقترح:</span>{" "}
                {suggestion.suggestedEmotion}
              </p>
              <p>
                <span className="text-white/55">التقنية:</span>{" "}
                {suggestion.technique}
              </p>
              <p className="italic text-blue-700">{suggestion.example}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </TabsContent>
);

interface RhythmScoreBadgeProps {
  score: number;
}

const RhythmScoreBadge: React.FC<RhythmScoreBadgeProps> = ({ score }) => {
  const bgColor =
    score >= 80 ? "bg-green-600" : score >= 60 ? "bg-yellow-600" : "bg-red-600";
  return <Badge className={bgColor}>النتيجة: {score}/100</Badge>;
};

interface RhythmResultsProps {
  rhythmAnalysis: SceneRhythmAnalysis;
  selectedRhythmTab: RhythmTab;
  setSelectedRhythmTab: (tab: RhythmTab) => void;
  getTempoColor: (tempo: string) => string;
  getTempoLabel: (tempo: string) => string;
  getSeverityColor: (severity: string) => string;
}

const RhythmResults: React.FC<RhythmResultsProps> = ({
  rhythmAnalysis,
  selectedRhythmTab,
  setSelectedRhythmTab,
  getTempoColor,
  getTempoLabel,
  getSeverityColor,
}) => (
  <Card className="bg-gradient-to-l from-purple-50 to-blue-50">
    <CardHeader>
      <div className="flex justify-between items-center">
        <CardTitle className="text-2xl">📊 نتائج تحليل الإيقاع</CardTitle>
        <RhythmScoreBadge score={rhythmAnalysis.rhythmScore} />
      </div>
    </CardHeader>
    <CardContent>
      <Tabs
        value={selectedRhythmTab}
        onValueChange={(value) => {
          if (isRhythmTab(value)) {
            setSelectedRhythmTab(value);
          }
        }}
      >
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="map">🗺️ خريطة الإيقاع</TabsTrigger>
          <TabsTrigger value="comparison">📈 المقارنة</TabsTrigger>
          <TabsTrigger value="monotony">⚠️ الرتابة</TabsTrigger>
          <TabsTrigger value="suggestions">💡 الاقتراحات</TabsTrigger>
        </TabsList>

        <RhythmMapTab
          rhythmMap={rhythmAnalysis.rhythmMap}
          getTempoColor={getTempoColor}
          getTempoLabel={getTempoLabel}
        />
        <ComparisonTab comparisons={rhythmAnalysis.comparisons} />
        <MonotonyTab
          monotonyAlerts={rhythmAnalysis.monotonyAlerts}
          getSeverityColor={getSeverityColor}
        />
        <SuggestionsTab
          emotionalSuggestions={rhythmAnalysis.emotionalSuggestions}
        />
      </Tabs>

      <div className="mt-6 p-4 bg-white rounded-[22px]">
        <h4 className="font-semibold mb-2">📝 ملخص التحليل</h4>
        <p className="text-white/55">{rhythmAnalysis.summary}</p>
      </div>
    </CardContent>
  </Card>
);

export const RhythmAnalysis: React.FC<RhythmAnalysisProps> = ({
  rhythmScriptText,
  setRhythmScriptText,
  analyzingRhythm,
  rhythmAnalysis,
  selectedRhythmTab,
  setSelectedRhythmTab,
  useRhythmSampleScript,
  analyzeSceneRhythm,
  getTempoColor,
  getTempoLabel,
  getSeverityColor,
}) => (
  <div className="max-w-6xl mx-auto py-8">
    <h2 className="text-3xl font-bold text-white/85 mb-2">
      🎵 تحليل إيقاع المشهد
    </h2>
    <p className="text-white/55 mb-8">
      حلل إيقاع مشهدك وتصاعدته العاطفية للحصول على أداء أكثر تأثيراً
    </p>

    <CardSpotlight className="mb-8 overflow-hidden rounded-[22px] backdrop-blur-xl">
      <Card className="border-0">
        <CardHeader>
          <CardTitle>تحليل إيقاع المشهد</CardTitle>
          <CardDescription>
            أدخل نص المشهد لتحليل إيقاعه وتصاعده العاطفي
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>نص المشهد</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={useRhythmSampleScript}
              >
                📄 استخدم نص تجريبي
              </Button>
            </div>
            <Textarea
              placeholder="الصق نص المشهد هنا..."
              className="min-h-[150px]"
              value={rhythmScriptText}
              onChange={(e) => setRhythmScriptText(e.target.value)}
            />
          </div>
          <Button
            className="w-full"
            onClick={analyzeSceneRhythm}
            disabled={analyzingRhythm || !rhythmScriptText.trim()}
          >
            {analyzingRhythm ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                جاري التحليل...
              </>
            ) : (
              "🎵 حلل الإيقاع"
            )}
          </Button>
        </CardContent>
      </Card>
    </CardSpotlight>

    {rhythmAnalysis && (
      <RhythmResults
        rhythmAnalysis={rhythmAnalysis}
        selectedRhythmTab={selectedRhythmTab}
        setSelectedRhythmTab={setSelectedRhythmTab}
        getTempoColor={getTempoColor}
        getTempoLabel={getTempoLabel}
        getSeverityColor={getSeverityColor}
      />
    )}
  </div>
);
