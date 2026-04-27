import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VoiceMetrics } from "../../hooks/useVoiceAnalytics";

export interface BreathingIndicatorProps {
  breathing: VoiceMetrics["breathing"];
}

export const BreathingIndicator: React.FC<BreathingIndicatorProps> = ({
  breathing,
}) => {
  return (
    <Card className="bg-white/[0.04] border-white/8 rounded-[22px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <span className="text-2xl">🫁</span>
          التحكم بالتنفس
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-blue-400">
                {Math.round(breathing.score * 100)}%
              </span>
            </div>
            <Badge
              className={`${
                breathing.issues.length > 0
                  ? "bg-yellow-500/20 text-yellow-300"
                  : "bg-green-500/20 text-green-300"
              } border-0`}
            >
              {breathing.issues.length > 0 ? "يحتاج تحسين" : "ممتاز"}
            </Badge>
          </div>

          <div className="flex gap-2 h-16">
            {/* Visual representation of breath cycles */}
            {[...Array(10)].map((_, i) => {
              const height = 40 + Math.sin(i * 0.8) * 40;
              const isIssue =
                breathing.issues.length > 0 && (i === 3 || i === 7);
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-full opacity-70 ${
                    isIssue ? "bg-red-400" : "bg-blue-400"
                  }`}
                  style={{
                    height: `${height}%`,
                    marginTop: "auto",
                    marginBottom: "auto",
                  }}
                />
              );
            })}
          </div>

          {breathing.issues.length > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2">
              <ul className="text-xs text-yellow-200/80 space-y-1">
                {breathing.issues.map((issue, idx) => (
                  <li key={idx} className="flex items-start gap-1">
                    <span className="text-yellow-500 mt-0.5">•</span>
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
