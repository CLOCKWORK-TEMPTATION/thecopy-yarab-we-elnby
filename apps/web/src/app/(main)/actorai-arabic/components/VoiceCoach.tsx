"use client";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useVoiceAnalytics } from "../hooks/useVoiceAnalytics";

import { ArticulationIndicator } from "./indicators/ArticulationIndicator";
import { BreathingIndicator } from "./indicators/BreathingIndicator";
import { FrequencyDisplay } from "./indicators/FrequencyDisplay";
import { PausesIndicator } from "./indicators/PausesIndicator";
import { PitchIndicator } from "./indicators/PitchIndicator";
import { SpeechRateIndicator } from "./indicators/SpeechRateIndicator";
import { VolumeIndicator } from "./indicators/VolumeIndicator";
import { WaveformDisplay } from "./indicators/WaveformDisplay";

interface ScoreGaugeProps {
  score: number;
}

const ScoreGauge: React.FC<ScoreGaugeProps> = ({ score }) => (
  <div className="w-full md:w-1/3 flex flex-col items-center justify-center space-y-3 bg-white/5 p-6 rounded-[24px] border border-white/10">
    <div className="text-sm font-medium text-white/50 tracking-wider">
      التقييم العام للأداء
    </div>
    <div className="relative">
      <svg className="w-32 h-32 transform -rotate-90">
        <circle
          cx="64"
          cy="64"
          r="56"
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          className="text-white/5"
        />
        <circle
          cx="64"
          cy="64"
          r="56"
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={351.8}
          strokeDashoffset={351.8 - (351.8 * score) / 100}
          className="text-white transition-all duration-1000 ease-out drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
        />
      </svg>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
        <span className="text-4xl font-bold text-white drop-shadow-md">
          {score}
        </span>
        <span className="text-xs text-white/50">%</span>
      </div>
    </div>
  </div>
);

interface ControlPanelProps {
  isListening: boolean;
  error: string | null;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  score: number;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  isListening,
  error,
  onStart,
  onStop,
  onReset,
  score,
}) => (
  <CardSpotlight className="overflow-hidden rounded-[32px] border border-white/8 bg-black/40 shadow-2xl backdrop-blur-3xl">
    <div className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-8 justify-between relative z-10">
      <div className="flex-1 space-y-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${isListening ? "bg-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.6)]" : "bg-white/20"}`}
          />
          <h2 className="text-2xl font-bold text-white">المدرب الصوتي الذكي</h2>
        </div>
        <p className="text-white/60">
          يقوم بتحليل صوتك في الوقت الفعلي وتقديم ملاحظات لتحسين أدائك التمثيلي
        </p>

        {error && (
          <Alert variant="destructive" className="bg-red-900/30 border-red-900">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          {!isListening ? (
            <Button
              onClick={onStart}
              className="bg-white text-black hover:bg-white/90 rounded-full px-8 font-semibold shadow-[0_0_20px_rgba(255,255,255,0.2)]"
            >
              <span className="mr-2 text-lg">🎤</span> بدء التسجيل والتحليل
            </Button>
          ) : (
            <Button
              onClick={onStop}
              variant="destructive"
              className="rounded-full px-8 font-semibold shadow-[0_0_20px_rgba(239,68,68,0.4)]"
            >
              <span className="mr-2 text-lg">⏹️</span> إيقاف
            </Button>
          )}

          <Button
            onClick={onReset}
            variant="outline"
            className="rounded-full border-white/10 hover:bg-white/5 text-white/70"
            disabled={isListening}
          >
            إعادة ضبط
          </Button>
        </div>
      </div>

      <ScoreGauge score={score} />
    </div>
  </CardSpotlight>
);

interface WaveformSectionProps {
  waveformData: number[];
  frequencyData: number[];
  isListening: boolean;
}

const WaveformSection: React.FC<WaveformSectionProps> = ({
  waveformData,
  frequencyData,
  isListening,
}) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <Card className="bg-black/20 border-white/8 rounded-[24px] overflow-hidden">
      <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
        <CardTitle className="text-sm font-medium text-white/70 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          الموجة الصوتية
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 bg-gradient-to-b from-transparent to-black/40">
        <WaveformDisplay data={waveformData} isActive={isListening} />
      </CardContent>
    </Card>

    <Card className="bg-black/20 border-white/8 rounded-[24px] overflow-hidden">
      <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
        <CardTitle className="text-sm font-medium text-white/70 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-pink-500" />
          الطيف الترددي
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 bg-gradient-to-b from-transparent to-black/40">
        <FrequencyDisplay data={frequencyData} isActive={isListening} />
      </CardContent>
    </Card>
  </div>
);

function computeOverallScore(
  metrics: ReturnType<typeof useVoiceAnalytics>["metrics"]
): number {
  return Math.round(
    (Math.min(metrics.pitch.value / 4, 100) +
      Math.min(Math.max(metrics.volume.value + 60, 0) * 2, 100) +
      metrics.articulation.score +
      (metrics.speechRate.level === "normal" ? 100 : 65) +
      (metrics.pauses.isEffective ? 100 : 60)) /
      5
  );
}

export const VoiceCoach: React.FC = () => {
  const {
    isListening,
    isSupported,
    error,
    metrics,
    waveformData,
    frequencyData,
    startListening,
    stopListening,
    reset,
  } = useVoiceAnalytics();

  const overallScore = computeOverallScore(metrics);

  if (!isSupported) {
    return (
      <Card className="bg-red-900/20 border-red-700/50">
        <CardContent className="p-6 text-center">
          <div className="text-6xl mb-4">🎤</div>
          <h3 className="text-xl font-semibold text-red-200 mb-2">
            المتصفح غير مدعوم
          </h3>
          <p className="text-red-300">
            متصفحك لا يدعم واجهة برمجة تطبيقات الصوت. يرجى استخدام Chrome أو
            Firefox أو Edge.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <ControlPanel
        isListening={isListening}
        error={error}
        onStart={startListening}
        onStop={stopListening}
        onReset={reset}
        score={overallScore}
      />

      <WaveformSection
        waveformData={waveformData}
        frequencyData={frequencyData}
        isListening={isListening}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <PitchIndicator pitch={metrics.pitch} />
        <VolumeIndicator volume={metrics.volume} />
        <SpeechRateIndicator speechRate={metrics.speechRate} />
        <ArticulationIndicator articulation={metrics.articulation} />
        <BreathingIndicator breathing={metrics.breathing} />
        <PausesIndicator pauses={metrics.pauses} />
      </div>
    </div>
  );
};
