"use client";

import { useCallback } from "react";

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

export function WebcamAnalysisView() {
  const { showNotification } = useApp();
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

              {state.permission === "denied" && (
                <Alert
                  variant="destructive"
                  className="bg-red-600/20 border-red-600/40"
                >
                  <AlertDescription className="text-red-200">
                    تم رفض إذن الكاميرا. يرجى السماح بالوصول من إعدادات المتصفح.
                  </AlertDescription>
                </Alert>
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
                {state.analysisResult
                  ? "آخر تحليل"
                  : "ابدأ التحليل لرؤية النتائج"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {state.analysisResult ? (
                <>
                  <div className="text-center p-4 bg-gradient-to-br from-black/22 to-black/18 rounded-[22px] border border-white/8">
                    <div className="text-4xl font-bold text-white">
                      {state.analysisResult.overallScore}
                    </div>
                    <div className="text-sm text-white/55">
                      النتيجة الإجمالية
                    </div>
                    <Badge
                      className="mt-2"
                      variant={
                        state.analysisResult.overallScore >= 80
                          ? "default"
                          : "secondary"
                      }
                    >
                      {state.analysisResult.overallScore >= 90
                        ? "ممتاز"
                        : state.analysisResult.overallScore >= 80
                          ? "جيد جداً"
                          : state.analysisResult.overallScore >= 70
                            ? "جيد"
                            : "يحتاج تحسين"}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold text-white">👁️ خط النظر</h4>
                    <div className="flex justify-between text-sm text-white/85">
                      <span>الاتجاه:</span>
                      <span>
                        {getEyeDirectionText(
                          state.analysisResult.eyeLine.direction
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-white/85">
                      <span>الاتساق:</span>
                      <span>{state.analysisResult.eyeLine.consistency}%</span>
                    </div>
                    <Progress
                      value={state.analysisResult.eyeLine.consistency}
                      className="h-2"
                    />
                    {state.analysisResult.eyeLine.alerts.map((alert, index) => (
                      <p key={index} className="text-xs text-orange-400">
                        ⚠️ {alert}
                      </p>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold text-white">
                      😊 تزامن التعبيرات
                    </h4>
                    <div className="flex justify-between text-sm text-white/85">
                      <span>النتيجة:</span>
                      <span>{state.analysisResult.expressionSync.score}%</span>
                    </div>
                    <Progress
                      value={state.analysisResult.expressionSync.score}
                      className="h-2"
                    />
                    <div className="flex gap-1 flex-wrap">
                      {state.analysisResult.expressionSync.matchedEmotions.map(
                        (emotion, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="text-xs border-white/20 text-white"
                          >
                            ✓ {emotion}
                          </Badge>
                        )
                      )}
                    </div>
                    {state.analysisResult.expressionSync.mismatches.map(
                      (mismatch, index) => (
                        <p key={index} className="text-xs text-red-400">
                          ✗ {mismatch}
                        </p>
                      )
                    )}
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold text-white">👀 معدل الرمش</h4>
                    <div className="flex justify-between text-sm text-white/85">
                      <span>المعدل:</span>
                      <span>
                        {state.analysisResult.blinkRate.rate} مرة/دقيقة
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-white/85">
                      <span>الحالة:</span>
                      <span
                        className={getBlinkStatusColor(
                          state.analysisResult.blinkRate.status
                        )}
                      >
                        {getBlinkStatusText(
                          state.analysisResult.blinkRate.status
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-white/85">
                      <span>مؤشر التوتر:</span>
                      <span>
                        {state.analysisResult.blinkRate.tensionIndicator}%
                      </span>
                    </div>
                    <Progress
                      value={state.analysisResult.blinkRate.tensionIndicator}
                      className="h-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold text-white">
                      🎭 استخدام المساحة
                    </h4>
                    <div className="flex justify-between text-sm text-white/85">
                      <span>نسبة الاستخدام:</span>
                      <span>{state.analysisResult.blocking.spaceUsage}%</span>
                    </div>
                    <Progress
                      value={state.analysisResult.blocking.spaceUsage}
                      className="h-2"
                    />
                    {state.analysisResult.blocking.movements.map(
                      (movement, index) => (
                        <p key={index} className="text-xs text-white/55">
                          • {movement}
                        </p>
                      )
                    )}
                    {state.analysisResult.blocking.suggestions.map(
                      (suggestion, index) => (
                        <p key={index} className="text-xs text-blue-400">
                          💡 {suggestion}
                        </p>
                      )
                    )}
                  </div>

                  {state.analysisResult.alerts.length > 0 && (
                    <Alert className="bg-white/8 border-white/20">
                      <AlertDescription className="text-white/85">
                        <ul className="space-y-1">
                          {state.analysisResult.alerts.map((alert, index) => (
                            <li key={index} className="text-sm">
                              📌 {alert}
                            </li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                </>
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
