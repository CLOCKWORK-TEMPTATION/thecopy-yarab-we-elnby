"use client";

import { useCallback, useState } from "react";

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

import { useApp } from "../../context/AppContext";
import { useWebcamAnalysis } from "../../hooks/useWebcamAnalysis";
import { formatTime } from "../../lib/utils";

import type { ChangeEvent } from "react";
import type {
  BlinkRateStatus,
  EyeDirection,
  WebcamAnalysisResult,
} from "../../types";

// ─── Helper functions ───

function getScoreLabel(score: number): string {
  if (score >= 90) return "ممتاز";
  if (score >= 80) return "جيد جداً";
  if (score >= 70) return "جيد";
  return "يحتاج تحسين";
}

function buildFallbackWebcamResult(label: string): WebcamAnalysisResult {
  return {
    eyeLine: {
      direction: "center",
      consistency: 76,
      alerts: ["هذه نتيجة بديلة مبنية على عينة تدريب وليست بثاً مباشراً."],
    },
    expressionSync: {
      score: 72,
      matchedEmotions: ["تركيز", "حضور"],
      mismatches: [],
    },
    blinkRate: {
      rate: 18,
      status: "normal",
      tensionIndicator: 34,
    },
    blocking: {
      spaceUsage: 68,
      movements: [label],
      suggestions: ["كرر التدريب عند توفر الكاميرا لمقارنة النتيجة المباشرة."],
    },
    alerts: ["تم استخدام بديل بصري قابل للتدريب بسبب تعذر الكاميرا."],
    overallScore: 74,
    timestamp: new Date().toISOString(),
  };
}

// ─── Sub-components ───

interface AnalysisResultPanelProps {
  result: WebcamAnalysisResult;
  getEyeDirectionText: (direction: EyeDirection) => string;
  getBlinkStatusColor: (status: BlinkRateStatus) => string;
  getBlinkStatusText: (status: BlinkRateStatus) => string;
}

function AnalysisResultPanel({
  result,
  getEyeDirectionText,
  getBlinkStatusColor,
  getBlinkStatusText,
}: AnalysisResultPanelProps) {
  return (
    <>
      <div className="text-center p-4 bg-gradient-to-br from-black/22 to-black/18 rounded-[22px] border border-white/8">
        <div className="text-4xl font-bold text-white">
          {result.overallScore}
        </div>
        <div className="text-sm text-white/55">النتيجة الإجمالية</div>
        <Badge
          className="mt-2"
          variant={result.overallScore >= 80 ? "default" : "secondary"}
        >
          {getScoreLabel(result.overallScore)}
        </Badge>
      </div>

      <div className="space-y-2">
        <h4 className="font-semibold text-white">👁️ خط النظر</h4>
        <div className="flex justify-between text-sm text-white/85">
          <span>الاتجاه:</span>
          <span>{getEyeDirectionText(result.eyeLine.direction)}</span>
        </div>
        <div className="flex justify-between text-sm text-white/85">
          <span>الاتساق:</span>
          <span>{result.eyeLine.consistency}%</span>
        </div>
        <Progress value={result.eyeLine.consistency} className="h-2" />
        {result.eyeLine.alerts.map((alert, index) => (
          <p key={index} className="text-xs text-orange-400">
            ⚠️ {alert}
          </p>
        ))}
      </div>

      <div className="space-y-2">
        <h4 className="font-semibold text-white">😊 تزامن التعبيرات</h4>
        <div className="flex justify-between text-sm text-white/85">
          <span>النتيجة:</span>
          <span>{result.expressionSync.score}%</span>
        </div>
        <Progress value={result.expressionSync.score} className="h-2" />
        <div className="flex gap-1 flex-wrap">
          {result.expressionSync.matchedEmotions.map((emotion, index) => (
            <Badge
              key={index}
              variant="outline"
              className="text-xs border-white/20 text-white"
            >
              ✓ {emotion}
            </Badge>
          ))}
        </div>
        {result.expressionSync.mismatches.map((mismatch, index) => (
          <p key={index} className="text-xs text-red-400">
            ✗ {mismatch}
          </p>
        ))}
      </div>

      <div className="space-y-2">
        <h4 className="font-semibold text-white">👀 معدل الرمش</h4>
        <div className="flex justify-between text-sm text-white/85">
          <span>المعدل:</span>
          <span>{result.blinkRate.rate} مرة/دقيقة</span>
        </div>
        <div className="flex justify-between text-sm text-white/85">
          <span>الحالة:</span>
          <span className={getBlinkStatusColor(result.blinkRate.status)}>
            {getBlinkStatusText(result.blinkRate.status)}
          </span>
        </div>
        <div className="flex justify-between text-sm text-white/85">
          <span>مؤشر التوتر:</span>
          <span>{result.blinkRate.tensionIndicator}%</span>
        </div>
        <Progress value={result.blinkRate.tensionIndicator} className="h-2" />
      </div>

      <div className="space-y-2">
        <h4 className="font-semibold text-white">🎭 استخدام المساحة</h4>
        <div className="flex justify-between text-sm text-white/85">
          <span>نسبة الاستخدام:</span>
          <span>{result.blocking.spaceUsage}%</span>
        </div>
        <Progress value={result.blocking.spaceUsage} className="h-2" />
        {result.blocking.movements.map((movement, index) => (
          <p key={index} className="text-xs text-white/55">
            • {movement}
          </p>
        ))}
        {result.blocking.suggestions.map((suggestion, index) => (
          <p key={index} className="text-xs text-blue-400">
            💡 {suggestion}
          </p>
        ))}
      </div>

      {result.alerts.length > 0 && (
        <Alert className="bg-white/8 border-white/20">
          <AlertDescription className="text-white/85">
            <ul className="space-y-1">
              {result.alerts.map((alert, index) => (
                <li key={index} className="text-sm">
                  📌 {alert}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}

// ─── Main component ───

export function WebcamAnalysisView() {
  const { showNotification } = useApp();
  const [fallbackResult, setFallbackResult] =
    useState<WebcamAnalysisResult | null>(null);
  const {
    state,
    videoRef,
    canvasRef,
    requestPermission,
    stopWebcam,
    startAnalysis,
    stopAnalysis,
    getBlinkStatusColor,
    getBlinkStatusText,
    getEyeDirectionText,
  } = useWebcamAnalysis();

  const handlePermissionRequest = useCallback(async () => {
    try {
      await requestPermission();
      setFallbackResult(null);
      showNotification("success", "تم تفعيل الكاميرا بنجاح!");
    } catch (error) {
      showNotification(
        "error",
        error instanceof Error ? error.message : "تعذر تفعيل الكاميرا"
      );
    }
  }, [requestPermission, showNotification]);

  const handleStartAnalysis = useCallback(() => {
    const result = startAnalysis();
    if (!result.success) {
      showNotification("error", result.error ?? "تعذر بدء التحليل");
      return;
    }

    showNotification("info", "بدأ التحليل البصري المحلي...");
  }, [showNotification, startAnalysis]);

  const handleStopAnalysis = useCallback(() => {
    const result = stopAnalysis();
    if (!result) {
      return;
    }

    showNotification(
      "success",
      `تم التحليل! النتيجة: ${result.overallScore}/100`
    );
  }, [showNotification, stopAnalysis]);

  const handleUseFallbackSample = useCallback(() => {
    setFallbackResult(buildFallbackWebcamResult("عينة تدريب بصرية جاهزة"));
    showNotification("info", "تم تحميل عينة تدريب بصرية كبديل للكاميرا.");
  }, [showNotification]);

  const handleFallbackUpload = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.currentTarget.files?.[0];
      if (!file) return;
      setFallbackResult(buildFallbackWebcamResult(`ملف مرجعي: ${file.name}`));
      showNotification("info", "تم تجهيز الملف المرجعي للتحليل البديل.");
    },
    [showNotification]
  );

  const shouldShowFallback =
    state.permission !== "pending" && state.permission !== "granted";
  const visibleAnalysisResult = state.analysisResult ?? fallbackResult;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white">
          📹 تحليل الأداء البصري
        </h2>
        <p className="text-white/55 mt-2">
          تحليل لغة الجسد وخط النظر والتعبيرات باستخدام الكاميرا
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CardSpotlight className="overflow-hidden rounded-[22px] bg-black/14 border border-white/8 backdrop-blur-xl">
          <Card className="bg-transparent border-0">
            <CardHeader>
              <CardTitle className="text-white">الكاميرا المباشرة</CardTitle>
              <CardDescription className="text-white/55">
                فعّل الكاميرا لبدء التحليل البصري
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative aspect-video bg-black/40 rounded-[22px] overflow-hidden border border-white/8">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${state.isActive ? "opacity-100" : "opacity-0"}`}
                />
                <canvas ref={canvasRef} className="hidden" />

                {!state.isActive && (
                  <div className="absolute inset-0 flex items-center justify-center text-white">
                    <div className="text-center">
                      <div className="text-6xl mb-4">📷</div>
                      <p>اضغط لتفعيل الكاميرا</p>
                    </div>
                  </div>
                )}

                {state.isAnalyzing && (
                  <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    <span className="text-sm">
                      {formatTime(state.analysisTime)}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 flex-wrap">
                {!state.isActive ? (
                  <Button onClick={handlePermissionRequest} className="flex-1">
                    📹 تفعيل الكاميرا
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={stopWebcam}
                      variant="destructive"
                      className="flex-1"
                    >
                      ⏹ إيقاف الكاميرا
                    </Button>
                    {!state.isAnalyzing ? (
                      <Button onClick={handleStartAnalysis} className="flex-1">
                        🔍 بدء التحليل
                      </Button>
                    ) : (
                      <Button
                        onClick={handleStopAnalysis}
                        variant="outline"
                        className="flex-1 border-white/20 text-white hover:bg-white/8"
                      >
                        ⏹ إنهاء التحليل
                      </Button>
                    )}
                  </>
                )}
              </div>

              {state.permissionMessage && state.permission !== "granted" && (
                <Alert
                  variant="destructive"
                  className="bg-red-600/20 border-red-600/40"
                >
                  <AlertDescription className="text-red-200">
                    {state.permissionMessage}
                  </AlertDescription>
                </Alert>
              )}

              {shouldShowFallback && (
                <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
                  <h4 className="font-semibold text-white">
                    بديل التحليل البصري
                  </h4>
                  <p className="mt-1 text-sm text-white/60">
                    استخدم عينة تدريب أو ارفع ملفاً مرجعياً لمتابعة التمرين دون
                    كاميرا مباشرة.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <Button
                      type="button"
                      onClick={handleUseFallbackSample}
                      className="rounded-full"
                    >
                      استخدام عينة تدريب
                    </Button>
                    <label
                      htmlFor="webcam-fallback-upload"
                      className="cursor-pointer rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white/75 hover:bg-white/8"
                    >
                      رفع ملف مرجعي
                    </label>
                    <input
                      id="webcam-fallback-upload"
                      type="file"
                      accept="image/*,video/*"
                      className="sr-only"
                      onChange={handleFallbackUpload}
                    />
                  </div>
                </div>
              )}

              {state.isAnalyzing && (
                <div className="grid grid-cols-2 gap-3">
                  <Card className="p-3 text-center bg-black/18 border border-white/8 rounded-[22px]">
                    <div className="text-2xl">👁️</div>
                    <div className="text-xs text-white/55">خط النظر</div>
                    <div className="text-sm font-bold text-green-400">
                      يراقب
                    </div>
                  </Card>
                  <Card className="p-3 text-center bg-black/18 border border-white/8 rounded-[22px]">
                    <div className="text-2xl">😊</div>
                    <div className="text-xs text-white/55">التعبيرات</div>
                    <div className="text-sm font-bold text-blue-400">يحسب</div>
                  </Card>
                  <Card className="p-3 text-center bg-black/18 border border-white/8 rounded-[22px]">
                    <div className="text-2xl">👀</div>
                    <div className="text-xs text-white/55">الرمش</div>
                    <div className="text-sm font-bold text-purple-400">
                      يقيس
                    </div>
                  </Card>
                  <Card className="p-3 text-center bg-black/18 border border-white/8 rounded-[22px]">
                    <div className="text-2xl">🎭</div>
                    <div className="text-xs text-white/55">الحركة</div>
                    <div className="text-sm font-bold text-orange-400">
                      يحلل
                    </div>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </CardSpotlight>

        <CardSpotlight className="overflow-hidden rounded-[22px] bg-black/14 border border-white/8 backdrop-blur-xl">
          <Card className="bg-transparent border-0">
            <CardHeader>
              <CardTitle className="text-white">نتائج التحليل</CardTitle>
              <CardDescription className="text-white/55">
                {visibleAnalysisResult
                  ? "آخر تحليل"
                  : "ابدأ التحليل لرؤية النتائج"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {visibleAnalysisResult ? (
                <AnalysisResultPanel
                  result={visibleAnalysisResult}
                  getEyeDirectionText={getEyeDirectionText}
                  getBlinkStatusColor={getBlinkStatusColor}
                  getBlinkStatusText={getBlinkStatusText}
                />
              ) : (
                <div className="text-center py-8 text-white/55">
                  <div className="text-6xl mb-4">📊</div>
                  <p>ابدأ التحليل لرؤية النتائج التفصيلية</p>
                </div>
              )}
            </CardContent>
          </Card>
        </CardSpotlight>
      </div>

      <CardSpotlight className="overflow-hidden rounded-[22px] bg-black/14 border border-white/8 backdrop-blur-xl">
        <Card className="bg-transparent border-0">
          <CardHeader>
            <CardTitle className="text-white">الجلسات السابقة</CardTitle>
          </CardHeader>
          <CardContent>
            {state.sessions.length === 0 ? (
              <div className="text-center py-8 text-white/55">
                لا توجد جلسات محفوظة بعد
              </div>
            ) : (
              <div className="space-y-3">
                {state.sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-3 bg-black/18 border border-white/8 rounded-[22px]"
                  >
                    <div>
                      <div className="font-medium text-white">
                        {session.date}
                      </div>
                      <div className="text-sm text-white/55">
                        المدة: {session.duration}
                      </div>
                    </div>
                    <div className="text-left">
                      <Badge
                        variant={session.score >= 80 ? "default" : "secondary"}
                      >
                        {session.score}/100
                      </Badge>
                      <div className="text-xs text-white/55 mt-1">
                        {session.alerts[0] ?? "لا توجد تنبيهات"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </CardSpotlight>

      <CardSpotlight className="overflow-hidden rounded-[22px] bg-black/14 border border-white/8 backdrop-blur-xl">
        <Card className="bg-transparent border-0">
          <CardHeader>
            <CardTitle className="text-white">
              💡 نصائح للتحليل البصري
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-blue-600/20 border border-blue-500/30 rounded-[22px]">
                <h4 className="font-semibold text-blue-400">خط النظر</h4>
                <p className="text-sm text-white/68">
                  حافظ على نقطة بصرية ثابتة قريبة من العدسة عندما تحتاج إلى حضور
                  مباشر.
                </p>
              </div>
              <div className="p-3 bg-green-600/20 border border-green-500/30 rounded-[22px]">
                <h4 className="font-semibold text-green-400">التعبيرات</h4>
                <p className="text-sm text-white/68">
                  اجعل التغيير التعبيري مرتبطاً بالحدث أو النية لا بمجرد نهاية
                  الجملة.
                </p>
              </div>
              <div className="p-3 bg-purple-600/20 border border-purple-500/30 rounded-[22px]">
                <h4 className="font-semibold text-purple-400">معدل الرمش</h4>
                <p className="text-sm text-white/68">
                  الزيادة المفاجئة في الرمش قد تعني إجهاداً أو توتراً بصرياً
                  يحتاج إلى تهدئة.
                </p>
              </div>
              <div className="p-3 bg-orange-600/20 border border-orange-500/30 rounded-[22px]">
                <h4 className="font-semibold text-orange-400">الحركة</h4>
                <p className="text-sm text-white/68">
                  كل انتقال داخل الكادر يجب أن يخدم المعنى ويُقرأ بوضوح من دون
                  تشويش.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </CardSpotlight>
    </div>
  );
}
