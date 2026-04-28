import React from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { VoiceMetrics } from "../../hooks/useVoiceAnalytics";

export interface ArticulationIndicatorProps {
  articulation: VoiceMetrics["articulation"];
}

export const ArticulationIndicator: React.FC<ArticulationIndicatorProps> = ({
  articulation,
}) => {
  const getColor = () => {
    switch (articulation.level) {
      case "poor":
        return "bg-red-500";
      case "fair":
        return "bg-yellow-500";
      case "good":
        return "bg-blue-500";
      case "excellent":
        return "bg-green-500";
      default:
        return "bg-white/45";
    }
  };

  const getLabel = () => {
    switch (articulation.level) {
      case "poor":
        return "ضعيف";
      case "fair":
        return "مقبول";
      case "good":
        return "جيد";
      case "excellent":
        return "ممتاز";
      default:
        return "غير محدد";
    }
  };

  return (
    <Card className="bg-white/[0.04] border-white/8 rounded-[22px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <span className="text-2xl">🗣️</span>
          وضوح المخارج
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20 flex-shrink-0">
            <svg viewBox="0 0 36 36" className="w-20 h-20 circular-chart">
              <path
                className="stroke-white/10"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                strokeWidth="3"
              />
              <path
                className={`transition-all duration-500 ease-out ${
                  articulation.level === "poor"
                    ? "stroke-red-500"
                    : articulation.level === "fair"
                      ? "stroke-yellow-500"
                      : articulation.level === "good"
                        ? "stroke-blue-500"
                        : "stroke-green-500"
                }`}
                strokeDasharray={`${articulation.score * 100}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                strokeWidth="3"
              />
              <text
                x="18"
                y="20.5"
                className="text-3xl font-bold fill-white"
                textAnchor="middle"
              >
                {Math.round(articulation.score * 100)}%
              </text>
            </svg>
          </div>
          <div className="flex flex-col gap-2 flex-1">
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/70">التقييم العام</span>
              <Badge className={`${getColor()} border-0`}>{getLabel()}</Badge>
            </div>
            {articulation.issues.length > 0 ? (
              <div className="bg-white/5 rounded-lg p-2 mt-1">
                <span className="text-xs text-white/55 block mb-1">
                  ملاحظات:
                </span>
                <ul className="list-disc list-inside text-xs text-white/80 space-y-1">
                  {articulation.issues.slice(0, 2).map((issue, idx) => (
                    <li key={idx} className="truncate" title={issue}>
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="bg-green-500/10 text-green-300 text-xs p-2 rounded-lg mt-1 flex items-center gap-1">
                <span className="text-sm">✨</span>
                مخارج الحروف واضحة وممتازة
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
