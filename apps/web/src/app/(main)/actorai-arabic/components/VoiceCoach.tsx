"use client";

import { useRef, useEffect } from "react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

import { useVoiceAnalytics, VoiceMetrics } from "../hooks/useVoiceAnalytics";

// ==================== مكون عرض الموجة الصوتية ====================

interface WaveformDisplayProps {
  data: number[];
  isActive: boolean;
}

const WaveformDisplay: React.FC<WaveformDisplayProps> = ({
  data,
  isActive,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // مسح الشاشة
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(0, 0, width, height);

    if (!isActive || data.length === 0) {
      // رسم خط مستقيم عند عدم النشاط
      ctx.strokeStyle = "#4b5563";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      return;
    }

    // رسم الموجة
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, "#3b82f6");
    gradient.addColorStop(0.5, "#8b5cf6");
    gradient.addColorStop(1, "#ec4899");

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.beginPath();

    const sliceWidth = width / data.length;
    let x = 0;

    for (let i = 0; i < data.length; i++) {
      const dataPoint = data[i] ?? 0;
      const v = dataPoint * 2 + 0.5; // تطبيع البيانات
      const y = (v * height) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.stroke();

    // إضافة تأثير التوهج
    ctx.shadowColor = "#8b5cf6";
    ctx.shadowBlur = 10;
    ctx.stroke();
  }, [data, isActive]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={100}
      className="w-full rounded-lg border border-white/8"
    />
  );
};

// ==================== مكون عرض الترددات ====================

interface FrequencyDisplayProps {
  data: number[];
  isActive: boolean;
}

const FrequencyDisplay: React.FC<FrequencyDisplayProps> = ({
  data,
  isActive,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // مسح الشاشة
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(0, 0, width, height);

    if (!isActive || data.length === 0) return;

    const barWidth = width / data.length;
    const gradient = ctx.createLinearGradient(0, height, 0, 0);
    gradient.addColorStop(0, "#10b981");
    gradient.addColorStop(0.5, "#3b82f6");
    gradient.addColorStop(1, "#ec4899");

    for (let i = 0; i < data.length; i++) {
      const dataValue = data[i] ?? 0;
      const barHeight = (dataValue / 255) * height;
      ctx.fillStyle = gradient;
      ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1, barHeight);
    }
  }, [data, isActive]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={80}
      className="w-full rounded-[22px] border border-white/8"
    />
  );
};

// ==================== مكون مؤشر الطبقة ====================

interface PitchIndicatorProps {
  pitch: VoiceMetrics["pitch"];
}

const PitchIndicator: React.FC<PitchIndicatorProps> = ({ pitch }) => {
  const getColor = () => {
    switch (pitch.level) {
      case "low":
        return "bg-blue-500";
      case "medium":
        return "bg-green-500";
      case "high":
        return "bg-orange-500";
      default:
        return "bg-white/45";
    }
  };

  const getPosition = () => {
    const value = Math.min(Math.max(pitch.value, 80), 400);
    return ((value - 80) / 320) * 100;
  };

  return (
    <Card className="bg-white/[0.04] border-white/8 rounded-[22px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <span className="text-2xl">🎵</span>
          طبقة الصوت (Pitch)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between text-sm text-white/55">
            <span>منخفض</span>
            <span>متوسط</span>
            <span>مرتفع</span>
          </div>
          <div className="relative h-4 bg-white/6 rounded-full overflow-hidden">
            <div
              className="absolute h-full bg-gradient-to-r from-blue-500 via-green-500 to-orange-500 opacity-30"
              style={{ width: "100%" }}
            />
            <div
              className={`absolute w-4 h-4 rounded-full ${getColor()} border-2 border-white transition-all duration-150`}
              style={{ left: `calc(${getPosition()}% - 8px)` }}
            />
          </div>
          <div className="flex justify-between items-center">
            <Badge variant="outline" className="text-white border-white/8">
              {pitch.value > 0 ? `${Math.round(pitch.value)} Hz` : "---"}
            </Badge>
            <span className="text-lg font-semibold text-white">
              {pitch.label}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ==================== مكون مؤشر الشدة ====================

interface VolumeIndicatorProps {
  volume: VoiceMetrics["volume"];
}

const VolumeIndicator: React.FC<VolumeIndicatorProps> = ({ volume }) => {
  const getVolumeLevel = () => {
    // تحويل dB إلى نسبة (0-100)
    const normalized = Math.min(
      100,
      Math.max(0, ((volume.value + 60) / 60) * 100)
    );
    return normalized;
  };

  const getColor = () => {
    switch (volume.level) {
      case "quiet":
        return "from-white/40 to-white/45";
      case "normal":
        return "from-green-400 to-green-600";
      case "loud":
        return "from-red-400 to-red-600";
      default:
        return "from-white/40 to-white/45";
    }
  };

  return (
    <Card className="bg-white/[0.04] border-white/8 rounded-[22px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <span className="text-2xl">🔊</span>
          شدة الصوت (Volume)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex gap-1">
            {Array.from({ length: 20 }, (_, i) => (
              <div
                key={i}
                className={`flex-1 h-8 rounded transition-all duration-75 ${
                  i < getVolumeLevel() / 5
                    ? `bg-gradient-to-t ${getColor()}`
                    : "bg-white/6"
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Badge
                variant={volume.level === "quiet" ? "default" : "outline"}
                className={
                  volume.level === "quiet"
                    ? "bg-white/8"
                    : "text-white/55 border-white/8"
                }
              >
                هادئ
              </Badge>
              <Badge
                variant={volume.level === "normal" ? "default" : "outline"}
                className={
                  volume.level === "normal"
                    ? "bg-green-600"
                    : "text-white/55 border-white/8"
                }
              >
                عادي
              </Badge>
              <Badge
                variant={volume.level === "loud" ? "default" : "outline"}
                className={
                  volume.level === "loud"
                    ? "bg-red-600"
                    : "text-white/55 border-white/8"
                }
              >
                مرتفع
              </Badge>
            </div>
            <span className="text-lg font-semibold text-white">
              {volume.label}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ==================== مكون سرعة الكلام ====================

interface SpeechRateIndicatorProps {
  speechRate: VoiceMetrics["speechRate"];
}

const SpeechRateIndicator: React.FC<SpeechRateIndicatorProps> = ({
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

// ==================== مكون وضوح المخارج ====================

interface ArticulationIndicatorProps {
  articulation: VoiceMetrics["articulation"];
}

const ArticulationIndicator: React.FC<ArticulationIndicatorProps> = ({
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

  return (
    <Card className="bg-white/[0.04] border-white/8 rounded-[22px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <span className="text-2xl">👄</span>
          وضوح المخارج (Articulation)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="relative pt-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-4xl font-bold text-white">
                {Math.round(articulation.score)}%
              </span>
            </div>
            <div className="overflow-hidden h-4 rounded-full bg-white/6">
              <div
                style={{ width: `${articulation.score}%` }}
                className={`h-full rounded-full ${getColor()} transition-all duration-300`}
              />
            </div>
          </div>
          <div className="text-center">
            <Badge className={getColor()}>{articulation.label}</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ==================== مكون التنفس ====================

interface BreathingIndicatorProps {
  breathing: VoiceMetrics["breathing"];
}

const BreathingIndicator: React.FC<BreathingIndicatorProps> = ({
  breathing,
}) => {
  return (
    <Card className="bg-white/[0.04] border-white/8 rounded-[22px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <span className="text-2xl">🌬️</span>
          نمط التنفس
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-white/55">عدد مرات التنفس:</span>
            <span className="text-2xl font-bold text-white">
              {breathing.breathCount}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div
              className={`w-4 h-4 rounded-full ${
                breathing.isBreathing
                  ? "bg-green-500 animate-pulse"
                  : "bg-white/45"
              }`}
            />
            <span className="text-white/68">
              {breathing.isBreathing ? "تنفس..." : "متكلم"}
            </span>
          </div>
          {breathing.warning && (
            <Alert
              variant="destructive"
              className="bg-red-900/30 border-red-700"
            >
              <AlertDescription className="text-red-200">
                {breathing.warning}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// ==================== مكون الوقفات الدرامية ====================

interface PausesIndicatorProps {
  pauses: VoiceMetrics["pauses"];
}

const PausesIndicator: React.FC<PausesIndicatorProps> = ({ pauses }) => {
  return (
    <Card className="bg-white/[0.04] border-white/8 rounded-[22px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <span className="text-2xl">⏸️</span>
          الوقفات الدرامية
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-white/6 rounded-[22px]">
              <div className="text-3xl font-bold text-white">
                {pauses.count}
              </div>
              <div className="text-xs text-white/55">عدد الوقفات</div>
            </div>
            <div className="text-center p-3 bg-white/6 rounded-[22px]">
              <div className="text-3xl font-bold text-white">
                {pauses.averageDuration > 0
                  ? `${(pauses.averageDuration / 1000).toFixed(1)}s`
                  : "---"}
              </div>
              <div className="text-xs text-white/55">متوسط المدة</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                pauses.isEffective ? "bg-green-500" : "bg-yellow-500"
              }`}
            />
            <span className="text-sm text-white/68">{pauses.feedback}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ==================== المكون الرئيسي ====================

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
      {/* العنوان والتحكم */}
      <CardSpotlight className="overflow-hidden rounded-[22px] bg-gradient-to-l from-purple-900/40 to-blue-900/40 border-white/8 backdrop-blur-xl">
        <Card className="bg-transparent border-0">
          <CardHeader>
            <CardTitle className="text-white text-2xl flex items-center gap-3">
              <span className="text-4xl">🎙️</span>
              مدرب الصوت اللحظي
            </CardTitle>
            <CardDescription className="text-white/68">
              تحليل فوري لأدائك الصوتي مع ملاحظات تفصيلية
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-6">
              {/* عرض الموجة الصوتية */}
              <div className="w-full max-w-2xl">
                <WaveformDisplay data={waveformData} isActive={isListening} />
              </div>

              {/* عرض الترددات */}
              <div className="w-full max-w-2xl">
                <FrequencyDisplay data={frequencyData} isActive={isListening} />
              </div>

              {/* أزرار التحكم */}
              <div className="flex gap-4">
                {!isListening ? (
                  <Button
                    size="lg"
                    onClick={startListening}
                    className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 text-xl"
                  >
                    <span className="text-2xl ml-2">🎤</span>
                    ابدأ التحليل
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    variant="destructive"
                    onClick={stopListening}
                    className="px-8 py-6 text-xl animate-pulse"
                  >
                    <span className="text-2xl ml-2">⏹️</span>
                    إيقاف
                  </Button>
                )}
                <Button
                  size="lg"
                  variant="outline"
                  onClick={reset}
                  className="border-white/8 text-white hover:bg-white/8 px-6 py-6"
                >
                  <span className="text-2xl ml-2">🔄</span>
                  إعادة
                </Button>
              </div>

              {/* حالة الاستماع */}
              {isListening && (
                <div className="flex items-center gap-2 text-green-400">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                  <span>جاري الاستماع والتحليل...</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </CardSpotlight>

      {/* رسالة الخطأ */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            <strong>خطأ:</strong> {error}
            <br />
            تأكد من السماح بالوصول للميكروفون في إعدادات المتصفح.
          </AlertDescription>
        </Alert>
      )}

      {/* شبكة المؤشرات */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <PitchIndicator pitch={metrics.pitch} />
        <VolumeIndicator volume={metrics.volume} />
        <SpeechRateIndicator speechRate={metrics.speechRate} />
        <ArticulationIndicator articulation={metrics.articulation} />
        <BreathingIndicator breathing={metrics.breathing} />
        <PausesIndicator pauses={metrics.pauses} />
      </div>

      {/* نصائح التدريب */}
      <CardSpotlight className="overflow-hidden rounded-[22px] bg-gradient-to-l from-yellow-900/20 to-orange-900/20 border-yellow-700/40 backdrop-blur-xl">
        <Card className="bg-transparent border-0">
          <CardHeader>
            <CardTitle className="text-yellow-200 flex items-center gap-2">
              <span className="text-2xl">💡</span>
              نصائح لتحسين الأداء الصوتي
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-yellow-100">
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span>حافظ على طبقة صوت متنوعة لتجنب الرتابة</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span>استخدم الوقفات الدرامية لتعزيز المعنى والتأثير</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span>تنفس بشكل طبيعي ومنتظم لتجنب انقطاع النفس</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span>اهتم بوضوح مخارج الحروف خاصة: ق، ع، ح، خ</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span>سرعة الكلام المثالية للتمثيل: 130-150 كلمة/دقيقة</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </CardSpotlight>
    </div>
  );
};

export default VoiceCoach;
