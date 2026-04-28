import {
  CheckCircle,
  AlertTriangle,
  Target,
  Eye,
  TrendingUp,
  Zap,
  BarChart3,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

import { CATEGORY_LABELS, getScoreColor, getScoreBgColor } from "../constants";

import type { PromptAnalysis } from "@the-copy/prompt-engineering";


interface PromptAnalysisResultProps {
  analysis: PromptAnalysis | null;
}

export function PromptAnalysisResult({ analysis }: PromptAnalysisResultProps) {
  if (!analysis) {
    return (
      <Card className="border-dashed border-2 border-purple-500/20 bg-black/10">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="h-8 w-8 text-purple-500/50" />
          </div>
          <h3 className="text-lg font-medium mb-2">لا يوجد تحليل بعد</h3>
          <p className="text-sm text-white/55">
            اكتب توجيهًا واضغط على &quot;تحليل التوجيه&quot; لرؤية التقييم
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-purple-500/20 bg-black/10">
        <CardContent className="p-6">
          <div className="text-center">
            <div className="relative w-32 h-32 mx-auto mb-4">
              <svg className="w-32 h-32" viewBox="0 0 100 100">
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
                  className={getScoreColor(analysis.metrics.overallScore)}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                  className={cn(
                    "text-3xl font-bold",
                    getScoreColor(analysis.metrics.overallScore)
                  )}
                >
                  {analysis.metrics.overallScore}
                </span>
                <span className="text-xs text-white/55">من 100</span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Badge
                className={cn(
                  "text-sm px-3 py-1",
                  getScoreBgColor(analysis.metrics.overallScore)
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
                <span className={cn("font-bold", getScoreColor(metric.value))}>
                  {metric.value}%
                </span>
              </div>
              <Progress value={metric.value} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-purple-500/20 bg-black/10">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-white/[0.04] rounded-lg">
              <p className="text-xs text-white/55 mb-1">التصنيف</p>
              <Badge variant="secondary">
                {CATEGORY_LABELS[analysis.category]}
              </Badge>
            </div>
            <div className="text-center p-3 bg-white/[0.04] rounded-lg">
              <p className="text-xs text-white/55 mb-1">اللغة</p>
              <Badge variant="secondary">
                {analysis.language === "ar"
                  ? "عربية"
                  : analysis.language === "en"
                    ? "إنجليزية"
                    : "مختلطة"}
              </Badge>
            </div>
            <div className="text-center p-3 bg-white/[0.04] rounded-lg">
              <p className="text-xs text-white/55 mb-1">التعقيد</p>
              <Badge variant="secondary">
                {analysis.complexity === "low"
                  ? "منخفض"
                  : analysis.complexity === "medium"
                    ? "متوسط"
                    : "عالي"}
              </Badge>
            </div>
            <div className="text-center p-3 bg-white/[0.04] rounded-lg">
              <p className="text-xs text-white/55 mb-1">التوكنز</p>
              <Badge variant="secondary">~{analysis.estimatedTokens}</Badge>
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
                  <li key={i} className="flex items-center gap-2 text-sm">
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
                {analysis.weaknesses.map((weakness, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <ArrowDown className="h-3 w-3 text-red-500" />
                    {weakness}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
