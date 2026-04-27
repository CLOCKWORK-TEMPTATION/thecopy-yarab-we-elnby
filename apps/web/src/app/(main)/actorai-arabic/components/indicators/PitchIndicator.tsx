import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { VoiceMetrics } from "../../hooks/useVoiceAnalytics";

export interface PitchIndicatorProps {
  pitch: VoiceMetrics["pitch"];
}

export const PitchIndicator: React.FC<PitchIndicatorProps> = ({ pitch }) => {
  return (
    <Card className="bg-white/[0.04] border-white/8 rounded-[22px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <span className="text-2xl">🎵</span>
          الطبقة الصوتية (Pitch)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-3xl font-bold text-purple-400">
              {Math.round(pitch.current)} Hz
            </span>
            <Badge
              variant={pitch.stability > 0.7 ? "default" : "destructive"}
              className={pitch.stability > 0.7 ? "bg-green-500/20 text-green-300" : ""}
            >
              {pitch.stability > 0.7 ? "مستقر" : "متذبذب"}
            </Badge>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
              style={{ width: `${Math.min(100, (pitch.current / 500) * 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-white/55">
            <span>منخفض</span>
            <span>متوسط</span>
            <span>مرتفع</span>
          </div>
          {pitch.warning && (
            <Alert variant="destructive" className="bg-red-900/30 border-red-900">
              <AlertDescription className="text-red-200">{pitch.warning}</AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
