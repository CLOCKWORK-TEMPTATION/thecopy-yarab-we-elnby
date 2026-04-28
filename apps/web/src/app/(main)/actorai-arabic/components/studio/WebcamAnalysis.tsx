"use client";

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

import type { WebcamAnalysisResult } from "../../types";
import type { RefObject } from "react";

interface WebcamAnalysisProps {
  webcamActive: boolean;
  webcamAnalyzing: boolean;
  webcamAnalysisTime: number;
  webcamAnalysisResult: WebcamAnalysisResult | null;
  webcamPermission: "granted" | "denied" | "pending";
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  requestWebcamPermission: () => Promise<void>;
  stopWebcam: () => void;
  startWebcamAnalysis: () => void;
  stopWebcamAnalysis: () => void;
  formatTime: (seconds: number) => string;
  getEyeDirectionText: (direction: string) => string;
  getBlinkStatusText: (status: "normal" | "high" | "low") => string;
  getBlinkStatusColor: (status: "normal" | "high" | "low") => string;
}

export const WebcamAnalysis: React.FC<WebcamAnalysisProps> = ({
  webcamActive,
  webcamAnalyzing,
  webcamAnalysisTime,
  webcamAnalysisResult,
  webcamPermission,
  videoRef,
  canvasRef,
  requestWebcamPermission,
  stopWebcam,
  startWebcamAnalysis,
  stopWebcamAnalysis,
  formatTime,
  getEyeDirectionText,
  getBlinkStatusText,
  getBlinkStatusColor,
}) => (
  <div className="max-w-6xl mx-auto py-8">
    <h2 className="text-3xl font-bold text-white/85 mb-2">
      👁️ تحليل الأداء البصري
    </h2>
    <p className="text-white/55 mb-8">
      حلل أداءك المرئي واحصل على ملاحظات حول اتجاه النظر والتعبيرات واستخدام
      المساحة
    </p>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* منطقة الكاميرا */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📹 الكاميرا المباشرة
          </CardTitle>
          <CardDescription>
            قم بتفعيل الكاميرا لبدء تحليل أدائك البصري
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* عرض الفيديو */}
          <div className="relative aspect-video bg-black/14 rounded-[22px] overflow-hidden">
            {webcamActive ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                />
                {webcamAnalyzing && (
                  <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full animate-pulse">
                    <span className="w-2 h-2 bg-white rounded-full"></span>
                    <span className="text-sm font-mono">
                      {formatTime(webcamAnalysisTime)}
                    </span>
                  </div>
                )}
                {/* مؤشرات التحليل المباشر */}
                {webcamAnalyzing && (
                  <div className="absolute bottom-4 left-4 right-4 bg-black/60 text-white p-3 rounded-lg text-sm">
                    <div className="flex justify-between items-center">
                      <span>👁️ جاري تحليل اتجاه النظر...</span>
                      <span className="animate-pulse">●</span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-white">
                <div className="text-6xl mb-4">📷</div>
                <p className="text-white/55">الكاميرا غير مفعلة</p>
              </div>
            )}
          </div>

          {/* أزرار التحكم */}
          <div className="flex flex-wrap gap-3">
            {!webcamActive ? (
              <Button onClick={requestWebcamPermission} className="flex-1">
                📹 تفعيل الكاميرا
              </Button>
            ) : (
              <>
                <Button
                  onClick={stopWebcam}
                  variant="outline"
                  className="flex-1"
                >
                  ⏹️ إيقاف الكاميرا
                </Button>
                {!webcamAnalyzing ? (
                  <Button
                    onClick={startWebcamAnalysis}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    ▶️ بدء التحليل
                  </Button>
                ) : (
                  <Button
                    onClick={stopWebcamAnalysis}
                    variant="destructive"
                    className="flex-1"
                  >
                    ⏹️ إيقاف التحليل
                  </Button>
                )}
              </>
            )}
          </div>

          {/* حالة الإذن */}
          {webcamPermission === "denied" && (
            <Alert variant="destructive">
              <AlertDescription>
                تم رفض الوصول للكاميرا. يرجى السماح بالوصول من إعدادات المتصفح.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* المؤشرات البصرية */}
      <Card>
        <CardHeader>
          <CardTitle>📊 المؤشرات البصرية</CardTitle>
          <CardDescription>
            المعايير التي يتم تحليلها أثناء الأداء
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border rounded-[22px] hover:bg-white/[0.04] transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">👁️</span>
                <h4 className="font-semibold">اتجاه النظر (Eye-line)</h4>
              </div>
              <p className="text-white/55 text-sm">
                تتبع اتجاه نظرك وتوزيعه على المساحة المرئية
              </p>
            </div>

            <div className="p-4 border rounded-[22px] hover:bg-white/[0.04] transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">🎭</span>
                <h4 className="font-semibold">اتساق التعبيرات مع النص</h4>
              </div>
              <p className="text-white/55 text-sm">
                مدى تطابق تعبيرات وجهك مع المشاعر المطلوبة في النص
              </p>
            </div>

            <div className="p-4 border rounded-[22px] hover:bg-white/[0.04] transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">😌</span>
                <h4 className="font-semibold">معدل الرمش (مؤشر للتوتر)</h4>
              </div>
              <p className="text-white/55 text-sm">
                قياس معدل الرمش كمؤشر على مستوى الراحة أو التوتر
              </p>
            </div>

            <div className="p-4 border rounded-[22px] hover:bg-white/[0.04] transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">🎬</span>
                <h4 className="font-semibold">استخدام المساحة (Blocking)</h4>
              </div>
              <p className="text-white/55 text-sm">
                تحليل حركتك واستخدامك للمساحة المتاحة
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    {/* نتائج التحليل */}
    {webcamAnalysisResult && (
      <Card className="mt-6 bg-gradient-to-l from-blue-50 to-purple-50">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl">📋 نتائج التحليل البصري</CardTitle>
            <Badge
              className={
                webcamAnalysisResult.overallScore >= 80
                  ? "bg-green-600"
                  : webcamAnalysisResult.overallScore >= 60
                    ? "bg-yellow-600"
                    : "bg-red-600"
              }
            >
              النتيجة: {webcamAnalysisResult.overallScore}/100
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* اتجاه النظر */}
          <div className="bg-white/[0.04] p-4 rounded-[22px]">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              👁️ اتجاه النظر
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-white/55">الاتجاه الغالب</p>
                <p className="font-medium">
                  {getEyeDirectionText(webcamAnalysisResult.eyeLine.direction)}
                </p>
              </div>
              <div>
                <p className="text-sm text-white/55">نسبة الثبات</p>
                <div className="flex items-center gap-2">
                  <Progress
                    value={webcamAnalysisResult.eyeLine.consistency}
                    className="flex-1"
                  />
                  <span className="font-medium">
                    {webcamAnalysisResult.eyeLine.consistency}%
                  </span>
                </div>
              </div>
            </div>
            {webcamAnalysisResult.eyeLine.alerts.length > 0 && (
              <div className="mt-3 space-y-1">
                {webcamAnalysisResult.eyeLine.alerts.map((alert, idx) => (
                  <p
                    key={idx}
                    className="text-sm text-orange-600 flex items-center gap-1"
                  >
                    ⚠️ {alert}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* اتساق التعبيرات */}
          <div className="bg-white/[0.04] p-4 rounded-[22px]">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              🎭 اتساق التعبيرات
            </h4>
            <div className="mb-3">
              <p className="text-sm text-white/55 mb-1">نسبة التطابق</p>
              <div className="flex items-center gap-2">
                <Progress
                  value={webcamAnalysisResult.expressionSync.score}
                  className="flex-1"
                />
                <span className="font-medium">
                  {webcamAnalysisResult.expressionSync.score}%
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              <span className="text-sm text-white/55">المشاعر المتطابقة:</span>
              {webcamAnalysisResult.expressionSync.matchedEmotions.map(
                (emotion, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="bg-green-50 text-green-700"
                  >
                    {emotion}
                  </Badge>
                )
              )}
            </div>
          </div>

          {/* معدل الرمش */}
          <div className="bg-white/[0.04] p-4 rounded-[22px]">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              😌 معدل الرمش
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-white/55">الحالة</p>
                <p
                  className={`font-medium ${getBlinkStatusColor(webcamAnalysisResult.blinkRate.status)}`}
                >
                  {getBlinkStatusText(webcamAnalysisResult.blinkRate.status)}
                </p>
              </div>
              <div>
                <p className="text-sm text-white/55">المعدل (رمشة/دقيقة)</p>
                <p className="font-medium">
                  {webcamAnalysisResult.blinkRate.rate}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )}
  </div>
);
