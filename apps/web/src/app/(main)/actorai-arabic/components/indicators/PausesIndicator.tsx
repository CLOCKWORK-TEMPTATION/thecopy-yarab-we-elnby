import React from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { VoiceMetrics } from "../../hooks/useVoiceAnalytics";

export interface PausesIndicatorProps {
  pauses: VoiceMetrics["pauses"];
}

export const PausesIndicator: React.FC<PausesIndicatorProps> = ({ pauses }) => {
  return (
    <Card className="bg-white/[0.04] border-white/8 rounded-[22px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <span className="text-2xl">⏸️</span>
          الوقفات الدرامية
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center justify-center space-y-1">
            <span className="text-sm text-white/55">العدد</span>
            <span className="text-4xl font-bold text-indigo-400">
              {pauses.count}
            </span>
          </div>

          <div className="w-px h-16 bg-white/10" />

          <div className="flex-1 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-white/70">متوسط المدة</span>
              <span className="font-medium text-white">
                {pauses.averageDuration.toFixed(1)} ثانية
              </span>
            </div>

            <div className="flex gap-2">
              <Badge
                variant="outline"
                className={`flex-1 justify-center py-1 border-white/10 ${
                  pauses.averageDuration < 0.5 ? "bg-white/10" : ""
                }`}
              >
                قصيرة
              </Badge>
              <Badge
                variant="outline"
                className={`flex-1 justify-center py-1 border-white/10 ${
                  pauses.averageDuration >= 0.5 && pauses.averageDuration <= 1.5
                    ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                    : ""
                }`}
              >
                مثالية
              </Badge>
              <Badge
                variant="outline"
                className={`flex-1 justify-center py-1 border-white/10 ${
                  pauses.averageDuration > 1.5 ? "bg-white/10" : ""
                }`}
              >
                طويلة
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
