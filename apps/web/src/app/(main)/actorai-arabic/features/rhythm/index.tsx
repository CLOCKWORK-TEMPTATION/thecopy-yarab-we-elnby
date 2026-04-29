"use client";

import { useCallback, useState, type ChangeEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

import { useApp } from "../../context/AppContext";
import { analyzeSceneRhythmText } from "../../lib/script-analysis";
import { SAMPLE_SCRIPT } from "../../types/constants";

import type { SceneRhythmAnalysis, TempoLevel } from "../../types";

type RhythmTab = "map" | "comparison" | "monotony" | "suggestions";

// ─── Helper functions (file-level) ───

function getTempoColor(tempo: TempoLevel): string {
  switch (tempo) {
    case "slow":
      return "bg-blue-400";
    case "medium":
      return "bg-green-400";
    case "fast":
      return "bg-orange-400";
    case "very-fast":
      return "bg-red-500";
    default:
      return "bg-white/45";
  }
}

function getTempoLabel(tempo: TempoLevel): string {
  switch (tempo) {
    case "slow":
      return "بطيء";
    case "medium":
      return "متوسط";
    case "fast":
      return "سريع";
    case "very-fast":
      return "سريع جداً";
    default:
      return tempo;
  }
}

// ─── Tab content sub-components ───

interface RhythmMapTabProps {
  analysis: SceneRhythmAnalysis;
}

function RhythmMapTab({ analysis }: RhythmMapTabProps) {
  return (
    <div className="space-y-4">
      <div className="bg-blue-500/20 p-4 rounded-lg border border-blue-500/30">
        <h4 className="font-semibold mb-2 text-white">📋 ملخص التحليل:</h4>
        <p className="text-white/68">{analysis.summary}</p>
      </div>
      <div className="space-y-2">
        {analysis.rhythmMap.map((point, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 p-3 bg-white/[0.04] rounded-lg border border-white/8"
          >
            <div
              className={`w-10 h-10 rounded-full ${getTempoColor(point.tempo)} flex items-center justify-center text-white font-bold`}
            >
              {idx + 1}
            </div>
            <div className="flex-1">
              <div className="font-medium text-white">{point.beat}</div>
              <div className="text-sm text-white/55">
                {point.emotion} • {getTempoLabel(point.tempo)}
              </div>
            </div>
            <div className="text-left">
              <Progress value={point.intensity} className="w-20" />
              <span className="text-xs text-white/45">{point.intensity}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ComparisonTabProps {
  analysis: SceneRhythmAnalysis;
}

function ComparisonTab({ analysis }: ComparisonTabProps) {
  return (
    <div className="space-y-4">
      {analysis.comparisons.map((comp, idx) => (
        <div
          key={idx}
          className="bg-white/[0.04] p-4 rounded-lg border border-white/8"
        >
          <div className="flex justify-between items-start mb-3">
            <h5 className="font-semibold text-white">{comp.aspect}</h5>
            <Badge variant={comp.difference >= 0 ? "default" : "outline"}>
              {comp.difference >= 0 ? `+${comp.difference}` : comp.difference}
            </Badge>
          </div>
          <p className="text-sm text-white/68">💡 {comp.feedback}</p>
        </div>
      ))}
    </div>
  );
}

interface MonotonyTabProps {
  analysis: SceneRhythmAnalysis;
}

function MonotonyTab({ analysis }: MonotonyTabProps) {
  return (
    <div className="space-y-4">
      {analysis.monotonyAlerts.map((alert, idx) => (
        <div
          key={idx}
          className={`p-4 rounded-lg border-2 ${
            alert.severity === "low"
              ? "bg-yellow-500/20 border-yellow-400/50 text-yellow-100"
              : alert.severity === "medium"
                ? "bg-orange-500/20 border-orange-400/50 text-orange-100"
                : "bg-red-500/20 border-red-400/50 text-red-100"
          }`}
        >
          <h5 className="font-semibold mb-1">{alert.description}</h5>
          <p className="text-sm">💡 {alert.suggestion}</p>
        </div>
      ))}
    </div>
  );
}

interface SuggestionsTabProps {
  analysis: SceneRhythmAnalysis;
}

function SuggestionsTab({ analysis }: SuggestionsTabProps) {
  return (
    <div className="space-y-4">
      {analysis.emotionalSuggestions.map((sugg, idx) => (
        <Card key={idx} className="bg-white/[0.04] border-white/8">
          <CardHeader>
            <CardTitle className="text-base text-white">
              &quot;{sugg.segment}&quot;
            </CardTitle>
            <CardDescription className="text-white/68">
              {sugg.currentEmotion} ← {sugg.suggestedEmotion}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-white/68">
            <p>
              <strong>التقنية:</strong> {sugg.technique}
            </p>
            <p>
              <strong>مثال:</strong> {sugg.example}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface RhythmResultsProps {
  rhythmAnalysis: SceneRhythmAnalysis;
  selectedRhythmTab: RhythmTab;
  setSelectedRhythmTab: (tab: RhythmTab) => void;
}

function RhythmResults({
  rhythmAnalysis,
  selectedRhythmTab,
  setSelectedRhythmTab,
}: RhythmResultsProps) {
  const tabs: { id: RhythmTab; label: string }[] = [
    { id: "map", label: "🗺️ خريطة الإيقاع" },
    { id: "comparison", label: "📊 المقارنة" },
    { id: "monotony", label: "⚠️ اكتشاف الرتابة" },
    { id: "suggestions", label: "🎨 التلوين العاطفي" },
  ];

  return (
    <>
      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={selectedRhythmTab === tab.id ? "default" : "outline"}
            onClick={() => setSelectedRhythmTab(tab.id)}
            size="sm"
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {selectedRhythmTab === "map" && (
        <RhythmMapTab analysis={rhythmAnalysis} />
      )}
      {selectedRhythmTab === "comparison" && (
        <ComparisonTab analysis={rhythmAnalysis} />
      )}
      {selectedRhythmTab === "monotony" && (
        <MonotonyTab analysis={rhythmAnalysis} />
      )}
      {selectedRhythmTab === "suggestions" && (
        <SuggestionsTab analysis={rhythmAnalysis} />
      )}
    </>
  );
}

// ─── Main component ───

export function SceneRhythmView() {
  const { showNotification } = useApp();
  const [rhythmScriptText, setRhythmScriptText] = useState("");
  const [analyzingRhythm, setAnalyzingRhythm] = useState(false);
  const [rhythmAnalysis, setRhythmAnalysis] =
    useState<SceneRhythmAnalysis | null>(null);
  const [selectedRhythmTab, setSelectedRhythmTab] = useState<RhythmTab>("map");

  const useRhythmSampleScript = useCallback(() => {
    setRhythmScriptText(SAMPLE_SCRIPT);
    showNotification("info", "تم تحميل النص التجريبي لتحليل الإيقاع");
  }, [showNotification]);

  const analyzeSceneRhythm = useCallback(() => {
    if (!rhythmScriptText.trim()) {
      showNotification("error", "يرجى إدخال نص أولاً لتحليل الإيقاع");
      return;
    }

    setAnalyzingRhythm(true);
    const analysis: SceneRhythmAnalysis =
      analyzeSceneRhythmText(rhythmScriptText);
    setRhythmAnalysis(analysis);
    setAnalyzingRhythm(false);
    showNotification("success", "تم تحليل إيقاع المشهد بنجاح!");
  }, [rhythmScriptText, showNotification]);

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-4xl">🎵</span>
        <h2 className="text-3xl font-bold text-white">تحليل إيقاع المشهد</h2>
      </div>
      <p className="text-white/68 mb-8">
        اكتشف إيقاع أدائك وحسّنه بأدوات التحليل المتقدمة
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 bg-white/[0.04] border-white/8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              📝 النص المسرحي
            </CardTitle>
            <CardDescription className="text-white/68">
              أدخل نصك لتحليل الإيقاع
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={useRhythmSampleScript}
              >
                📄 نص تجريبي
              </Button>
            </div>
            <Textarea
              placeholder="الصق نصك هنا..."
              className="min-h-[300px]"
              value={rhythmScriptText}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                setRhythmScriptText(e.target.value)
              }
            />
            <Button
              className="w-full"
              onClick={analyzeSceneRhythm}
              disabled={analyzingRhythm || !rhythmScriptText.trim()}
            >
              {analyzingRhythm
                ? "⏳ جاري تحليل الإيقاع..."
                : "🎵 تحليل الإيقاع"}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 bg-white/[0.04] border-white/8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              📊 نتائج التحليل
            </CardTitle>
            {rhythmAnalysis && (
              <div className="flex items-center gap-4 mt-2">
                <Badge className="text-lg px-4 py-1">
                  النتيجة: {rhythmAnalysis.rhythmScore}/100
                </Badge>
                <Badge variant="outline" className="text-lg px-4 py-1">
                  الإيقاع: {getTempoLabel(rhythmAnalysis.overallTempo)}
                </Badge>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {!rhythmAnalysis ? (
              <div className="text-center py-16 text-white/55">
                <div className="text-8xl mb-4 opacity-30">🎵</div>
                <p className="text-xl">أدخل نصاً وابدأ التحليل لرؤية النتائج</p>
              </div>
            ) : (
              <RhythmResults
                rhythmAnalysis={rhythmAnalysis}
                selectedRhythmTab={selectedRhythmTab}
                setSelectedRhythmTab={setSelectedRhythmTab}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
