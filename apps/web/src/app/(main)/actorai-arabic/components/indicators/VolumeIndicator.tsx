import React from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { VoiceMetrics } from "../../hooks/useVoiceAnalytics";

export interface VolumeIndicatorProps {
  volume: VoiceMetrics["volume"];
}

const MIN_VOLUME_DB = -60;
const MAX_VOLUME_DB = 0;
const VOLUME_DB_RANGE = MAX_VOLUME_DB - MIN_VOLUME_DB;

function getVolumeRatio(volumeDb: number): number {
  return Math.min(1, Math.max(0, (volumeDb - MIN_VOLUME_DB) / VOLUME_DB_RANGE));
}

export const VolumeIndicator: React.FC<VolumeIndicatorProps> = ({ volume }) => {
  const volumeRatio = getVolumeRatio(volume.value);

  return (
    <Card className="bg-white/[0.04] border-white/8 rounded-[22px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <span className="text-2xl">🔊</span>
          مستوى الصوت
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  volume.level === "loud"
                    ? "bg-red-500"
                    : volume.level === "normal"
                      ? "bg-green-500"
                      : "bg-blue-500"
                }`}
                style={{ width: `${volumeRatio * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-white/55 px-1">
              <span>منخفض</span>
              <span>مناسب</span>
              <span>مرتفع</span>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center min-w-[80px] p-2 bg-white/5 rounded-xl">
            <span className="text-sm font-medium text-white mb-1">
              {Math.round(volumeRatio * 100)}%
            </span>
            <Badge
              variant="outline"
              className={`border-0 text-xs ${
                volume.level === "normal"
                  ? "bg-green-500/20 text-green-300"
                  : volume.level === "loud"
                    ? "bg-red-500/20 text-red-300"
                    : "bg-blue-500/20 text-blue-300"
              }`}
            >
              {volume.label}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
