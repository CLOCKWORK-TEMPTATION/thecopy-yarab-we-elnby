import React from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

import { VoiceMetrics } from "../../hooks/useVoiceAnalytics";

export interface SpeechRateIndicatorProps {
  speechRate: VoiceMetrics["speechRate"];
}

export const SpeechRateIndicator: React.FC<SpeechRateIndicatorProps> = ({
  speechRate,
}) => {
  const getColor = () => {
    switch (speechRate.level) {
      case "slow":
        return "text-blue-400";
      case "normal":
        return "text-green-400";
      case "fast":
        return "text-red-400";
      default:
        return "text-white/55";
    }
  };

  return (
    <Card className="bg-white/[0.04] border-white/8 rounded-[22px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <span className="text-2xl">⏱️</span>
          سرعة الكلام (WPM)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="text-center">
            <span className={`text-5xl font-bold ${getColor()}`}>
              {speechRate.wpm}
            </span>
            <span className="text-white/55 text-lg mr-2">كلمة/دقيقة</span>
          </div>
          <Progress
            value={Math.min(100, (speechRate.wpm / 200) * 100)}
            className="h-2"
          />
          <div className="flex justify-between text-xs text-white/45">
            <span>بطيء (100)</span>
            <span>مثالي (130-150)</span>
            <span>سريع (180+)</span>
          </div>
          {speechRate.warning && (
            <Alert
              variant="destructive"
              className="bg-yellow-900/30 border-yellow-700"
            >
              <AlertDescription className="text-yellow-200">
                {speechRate.warning}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
