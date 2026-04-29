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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { ACTING_METHODOLOGIES } from "../../types/constants";

import type { AnalysisResult } from "../../types";

interface ScriptAnalysisProps {
  scriptText: string;
  setScriptText: (text: string) => void;
  selectedMethodology: string;
  setSelectedMethodology: (method: string) => void;
  analyzing: boolean;
  analysisResult: AnalysisResult | null;
  useSampleScript: () => void;
  analyzeScript: () => void;
}

function getEmotionEmoji(emotion: string): string {
  if (emotion === "شوق") return "💭";
  if (emotion === "أمل") return "✨";
  return "❤️";
}

interface AnalysisObjectivesProps {
  objectives: AnalysisResult["objectives"];
}

const AnalysisObjectives: React.FC<AnalysisObjectivesProps> = ({
  objectives,
}) => (
  <div>
    <h4 className="font-semibold mb-2 text-lg">الأهداف:</h4>
    <div className="space-y-2 bg-white p-4 rounded-[22px]">
      <p>
        <strong>الهدف الرئيسي:</strong> {objectives.main}
      </p>
      <p>
        <strong>هدف المشهد:</strong> {objectives.scene}
      </p>
      <div>
        <strong>النبضات:</strong>
        <ul className="list-disc list-inside mt-1">
          {objectives.beats.map((beat, idx) => (
            <li key={idx}>{beat}</li>
          ))}
        </ul>
      </div>
    </div>
  </div>
);

interface AnalysisObstaclesProps {
  obstacles: AnalysisResult["obstacles"];
}

const AnalysisObstacles: React.FC<AnalysisObstaclesProps> = ({ obstacles }) => (
  <div>
    <h4 className="font-semibold mb-2 text-lg">العقبات:</h4>
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-white/[0.04] p-4 rounded-[22px]">
        <strong>داخلية:</strong>
        <ul className="list-disc list-inside mt-1">
          {obstacles.internal.map((obs, idx) => (
            <li key={idx}>{obs}</li>
          ))}
        </ul>
      </div>
      <div className="bg-white/[0.04] p-4 rounded-[22px]">
        <strong>خارجية:</strong>
        <ul className="list-disc list-inside mt-1">
          {obstacles.external.map((obs, idx) => (
            <li key={idx}>{obs}</li>
          ))}
        </ul>
      </div>
    </div>
  </div>
);

interface EmotionalArcProps {
  emotionalArc: AnalysisResult["emotionalArc"];
}

const EmotionalArc: React.FC<EmotionalArcProps> = ({ emotionalArc }) => (
  <div>
    <h4 className="font-semibold mb-2 text-lg">المسار العاطفي:</h4>
    <div className="flex gap-4 flex-wrap">
      {emotionalArc.map((arc, idx) => (
        <div key={idx} className="bg-white p-4 rounded-[22px] text-center">
          <div className="text-2xl mb-2">{getEmotionEmoji(arc.emotion)}</div>
          <Badge variant="outline">{arc.emotion}</Badge>
          <Progress value={arc.intensity} className="mt-2 w-20" />
          <span className="text-sm text-white/55">{arc.intensity}%</span>
        </div>
      ))}
    </div>
  </div>
);

interface CoachingTipsProps {
  coachingTips: AnalysisResult["coachingTips"];
}

const CoachingTips: React.FC<CoachingTipsProps> = ({ coachingTips }) => (
  <div>
    <h4 className="font-semibold mb-2 text-lg">💡 نصائح التدريب:</h4>
    <ul className="space-y-2">
      {coachingTips.map((tip, idx) => (
        <li
          key={idx}
          className="flex items-start gap-2 bg-white p-3 rounded-[22px]"
        >
          <span className="text-green-500">✓</span>
          {tip}
        </li>
      ))}
    </ul>
  </div>
);

interface AnalysisResultsProps {
  analysisResult: AnalysisResult;
}

const AnalysisResults: React.FC<AnalysisResultsProps> = ({
  analysisResult,
}) => (
  <Card className="bg-blue-50 mt-6">
    <CardHeader>
      <CardTitle className="text-blue-900">🎯 نتائج التحليل</CardTitle>
    </CardHeader>
    <CardContent className="space-y-6">
      <AnalysisObjectives objectives={analysisResult.objectives} />
      <AnalysisObstacles obstacles={analysisResult.obstacles} />
      <EmotionalArc emotionalArc={analysisResult.emotionalArc} />
      <CoachingTips coachingTips={analysisResult.coachingTips} />
    </CardContent>
  </Card>
);

export const ScriptAnalysis: React.FC<ScriptAnalysisProps> = ({
  scriptText,
  setScriptText,
  selectedMethodology,
  setSelectedMethodology,
  analyzing,
  analysisResult,
  useSampleScript,
  analyzeScript,
}) => (
  <CardSpotlight className="overflow-hidden rounded-[22px] backdrop-blur-xl">
    <Card className="border-0">
      <CardHeader>
        <CardTitle>تحليل النص</CardTitle>
        <CardDescription>
          ارفع نصاً للحصول على تحليل مدعوم بالذكاء الاصطناعي
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label>النص المسرحي/السينمائي</Label>
            <Button variant="outline" size="sm" onClick={useSampleScript}>
              📄 استخدم نص تجريبي
            </Button>
          </div>
          <Textarea
            placeholder="الصق نصك هنا أو استخدم النص التجريبي..."
            className="min-h-[200px]"
            value={scriptText}
            onChange={(e) => setScriptText(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>منهجية التمثيل</Label>
          <Select
            value={selectedMethodology}
            onValueChange={setSelectedMethodology}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTING_METHODOLOGIES.map((method) => (
                <SelectItem key={method.id} value={method.id}>
                  {method.name} ({method.nameEn})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          className="w-full"
          onClick={analyzeScript}
          disabled={analyzing || !scriptText.trim()}
        >
          {analyzing ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              جاري التحليل...
            </>
          ) : (
            "🔍 حلل النص"
          )}
        </Button>

        {analysisResult && <AnalysisResults analysisResult={analysisResult} />}
      </CardContent>
    </Card>
  </CardSpotlight>
);
