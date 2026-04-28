"use client";

import { useMemo, useState } from "react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useApp } from "../../context/AppContext";
import {
  AR_FEATURES,
  DEFAULT_VALUES,
  GESTURE_CONTROLS,
  SHOT_TYPES,
} from "../../types/constants";

import type {
  BlockingMark,
  CameraEyeSettings,
  GestureControl,
  HolographicPartner,
  TeleprompterSettings,
} from "../../types";

type ARMode =
  | "setup"
  | "teleprompter"
  | "blocking"
  | "camera"
  | "partner"
  | "gestures";

const AR_MODE_BY_FEATURE_ID: Record<string, ARMode> = {
  teleprompter: "teleprompter",
  blocking: "blocking",
  camera_eye: "camera",
  holographic_partner: "partner",
  gesture_control: "gestures",
};

export function ARTrainingView() {
  const { showNotification } = useApp();

  const [arMode, setArMode] = useState<ARMode>("setup");
  const [teleprompterSettings, setTeleprompterSettings] =
    useState<TeleprompterSettings>(DEFAULT_VALUES.teleprompter);
  const [blockingMarks, setBlockingMarks] = useState<BlockingMark[]>([
    ...DEFAULT_VALUES.blockingMarks,
  ]);
  const [cameraSettings, setCameraSettings] = useState<CameraEyeSettings>(
    DEFAULT_VALUES.camera
  );
  const [holographicPartner, setHolographicPartner] =
    useState<HolographicPartner>(DEFAULT_VALUES.holographicPartner);
  const [activeGestures, setActiveGestures] =
    useState<GestureControl[]>(GESTURE_CONTROLS);
  const [arSessionActive, setArSessionActive] = useState(false);
  const [visionProConnected, setVisionProConnected] = useState(false);

  const selectedFeatureDescription = useMemo(() => {
    const current = AR_FEATURES.find(
      (f) => AR_MODE_BY_FEATURE_ID[f.id] === arMode
    );
    return current?.description;
  }, [arMode]);

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">🥽 تدريب AR/MR</h2>
          <p className="text-white/55">
            تجربة غامرة للتدريب على التمثيل - جاهز لـ Vision Pro
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge
            variant={visionProConnected ? "default" : "outline"}
            className={
              visionProConnected
                ? "bg-green-600"
                : "border-white/20 text-white/85"
            }
          >
            {visionProConnected ? "🔗 Vision Pro متصل" : "⏸️ في انتظار الاتصال"}
          </Badge>
          <Button
            onClick={() => {
              setVisionProConnected((prev) => !prev);
              showNotification(
                visionProConnected ? "info" : "success",
                visionProConnected
                  ? "تم قطع الاتصال"
                  : "تم الاتصال بـ Vision Pro!"
              );
            }}
            variant={visionProConnected ? "destructive" : "default"}
          >
            {visionProConnected ? "قطع الاتصال" : "🥽 اتصل بـ Vision Pro"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-8">
        {AR_FEATURES.map((feature) => {
          const featureMode = AR_MODE_BY_FEATURE_ID[feature.id] ?? "setup";
          return (
            <Card
              key={feature.id}
              className={`cursor-pointer transition-all hover:shadow-lg ${arMode === featureMode ? "ring-2 ring-purple-400 bg-black/18 border-white/20" : "bg-black/14 border-white/8"} border`}
              onClick={() => setArMode(featureMode)}
            >
              <CardContent className="p-4 text-center">
                <div className="text-3xl mb-2">{feature.icon}</div>
                <h4 className="font-semibold text-sm text-white">
                  {feature.name}
                </h4>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CardSpotlight className="overflow-hidden rounded-[22px] h-full bg-black/14 border border-white/8 backdrop-blur-xl">
            <Card className="bg-transparent border-0 h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  👁️ معاينة AR
                  {arSessionActive && (
                    <Badge className="bg-red-500 animate-pulse">
                      جلسة نشطة
                    </Badge>
                  )}
                </CardTitle>
                {selectedFeatureDescription && (
                  <CardDescription className="text-white/55">
                    {selectedFeatureDescription}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="relative bg-gradient-to-br from-black/40 to-black/60 rounded-xl aspect-video overflow-hidden">
                  <div className="absolute inset-0 opacity-20">
                    <div
                      className="w-full h-full"
                      style={{
                        backgroundImage:
                          "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
                        backgroundSize: "50px 50px",
                      }}
                    />
                  </div>

                  {arMode === "teleprompter" && (
                    <div
                      className="absolute left-1/2 transform -translate-x-1/2 max-w-lg p-6 bg-black/60 rounded-xl border border-cyan-500/50 backdrop-blur"
                      style={{
                        top:
                          teleprompterSettings.position === "top"
                            ? "10%"
                            : teleprompterSettings.position === "center"
                              ? "50%"
                              : "80%",
                        transform:
                          teleprompterSettings.position === "center"
                            ? "translate(-50%, -50%)"
                            : "translateX(-50%)",
                        opacity: teleprompterSettings.opacity / 100,
                        fontSize: `${teleprompterSettings.fontSize}px`,
                      }}
                    >
                      <p className="text-cyan-400 text-center leading-relaxed">
                        يا ليلى، يا قمر الليل، أنتِ نور عيني وروحي.
                        <br />
                        كيف أستطيع أن أعيش بعيداً عنكِ؟
                      </p>
                    </div>
                  )}

                  {arMode === "blocking" && (
                    <>
                      {blockingMarks.map((mark) => (
                        <div
                          key={mark.id}
                          className="absolute transform -translate-x-1/2 -translate-y-1/2"
                          style={{ left: `${mark.x}%`, top: `${mark.y}%` }}
                        >
                          <div
                            className="w-16 h-16 rounded-full border-4 flex items-center justify-center text-white font-bold shadow-lg"
                            style={{
                              borderColor: mark.color,
                              backgroundColor: `${mark.color}40`,
                            }}
                          >
                            {mark.label}
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {arMode === "camera" && (
                    <div className="absolute inset-4 border-4 border-yellow-500/70 rounded-[22px]">
                      <div className="absolute top-2 left-2 bg-black/70 px-3 py-1 rounded text-yellow-400 text-sm">
                        {
                          SHOT_TYPES.find(
                            (s) => s.id === cameraSettings.shotType
                          )?.name
                        }
                      </div>
                      <div className="absolute top-2 right-2 bg-black/70 px-3 py-1 rounded text-yellow-400 text-sm">
                        {cameraSettings.aspectRatio}
                      </div>
                      <div className="absolute bottom-2 left-2 bg-black/70 px-3 py-1 rounded text-yellow-400 text-sm">
                        {cameraSettings.focalLength}mm
                      </div>
                    </div>
                  )}

                  {arMode === "partner" && (
                    <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                      <div className="text-8xl mb-4">👤</div>
                      <div className="bg-purple-900/80 px-4 py-2 rounded-[22px] backdrop-blur">
                        <p className="text-purple-200 font-bold">
                          {holographicPartner.character}
                        </p>
                        <p className="text-purple-300 text-sm">
                          العاطفة: {holographicPartner.emotion}
                        </p>
                      </div>
                    </div>
                  )}

                  {arMode === "gestures" && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="text-center text-cyan-300">
                          👁️ تتبع العين
                        </div>
                        <div className="text-center text-green-300">
                          🤚 تتبع اليد
                        </div>
                        <div className="text-center text-yellow-300">
                          🗣️ تتبع الرأس
                        </div>
                        <div className="text-center text-red-300">
                          🎙️ أوامر صوتية
                        </div>
                      </div>
                    </div>
                  )}

                  {arMode === "setup" && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-8xl mb-6 animate-bounce">🥽</div>
                        <h3 className="text-2xl font-bold text-white mb-4">
                          جاهز لتجربة AR/MR
                        </h3>
                        <p className="text-white/55 mb-6 max-w-md">
                          اختر أحد الأدوات من الأعلى للبدء في إعداد بيئة التدريب
                          الغامرة
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-center gap-4">
                  <Button
                    size="lg"
                    onClick={() => {
                      setArSessionActive((prev) => !prev);
                      showNotification(
                        arSessionActive ? "info" : "success",
                        arSessionActive ? "تم إيقاف الجلسة" : "بدأت جلسة AR!"
                      );
                    }}
                    className={
                      arSessionActive
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-green-600 hover:bg-green-700"
                    }
                  >
                    {arSessionActive ? "⏹️ إيقاف الجلسة" : "▶️ بدء جلسة AR"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setArMode("setup")}
                    className="border-white/20 text-white hover:bg-white/8"
                  >
                    🔄 إعادة ضبط
                  </Button>
                </div>
              </CardContent>
            </Card>
          </CardSpotlight>
        </div>

        <div className="space-y-6">
          {arMode === "teleprompter" && (
            <CardSpotlight className="overflow-hidden rounded-[22px] bg-black/14 border border-white/8 backdrop-blur-xl">
              <Card className="bg-transparent border-0">
                <CardHeader>
                  <CardTitle className="text-white">
                    📜 إعدادات Teleprompter
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-white">
                      سرعة التمرير: {teleprompterSettings.speed}%
                    </Label>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={teleprompterSettings.speed}
                      onChange={(e) =>
                        setTeleprompterSettings((prev) => ({
                          ...prev,
                          speed: parseInt(e.target.value, 10),
                        }))
                      }
                      className="w-full mt-2 accent-white"
                    />
                  </div>
                  <div>
                    <Label className="text-white">
                      حجم الخط: {teleprompterSettings.fontSize}px
                    </Label>
                    <input
                      type="range"
                      min="14"
                      max="48"
                      value={teleprompterSettings.fontSize}
                      onChange={(e) =>
                        setTeleprompterSettings((prev) => ({
                          ...prev,
                          fontSize: parseInt(e.target.value, 10),
                        }))
                      }
                      className="w-full mt-2 accent-white"
                    />
                  </div>
                </CardContent>
              </Card>
            </CardSpotlight>
          )}

          {arMode === "blocking" && (
            <CardSpotlight className="overflow-hidden rounded-[22px] bg-black/14 border border-white/8 backdrop-blur-xl">
              <Card className="bg-transparent border-0">
                <CardHeader>
                  <CardTitle className="text-white">
                    🎯 علامات Blocking
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {blockingMarks.map((mark, idx) => (
                    <div
                      key={mark.id}
                      className="flex items-center gap-3 p-3 border border-white/8 rounded-[22px] bg-black/18"
                    >
                      <div
                        className="w-8 h-8 rounded-full"
                        style={{ backgroundColor: mark.color }}
                      />
                      <Input
                        value={mark.label}
                        onChange={(e) =>
                          setBlockingMarks((prev) =>
                            prev.map((item, i) =>
                              i === idx
                                ? { ...item, label: e.target.value }
                                : item
                            )
                          )
                        }
                        className="text-sm bg-black/22 border-white/8 text-white"
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </CardSpotlight>
          )}

          {arMode === "camera" && (
            <CardSpotlight className="overflow-hidden rounded-[22px] bg-black/14 border border-white/8 backdrop-blur-xl">
              <Card className="bg-transparent border-0">
                <CardHeader>
                  <CardTitle className="text-white">📷 عين الكاميرا</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-white">نوع اللقطة</Label>
                    <Select
                      value={cameraSettings.shotType}
                      onValueChange={(val) =>
                        setCameraSettings((prev) => ({
                          ...prev,
                          shotType: val as CameraEyeSettings["shotType"],
                        }))
                      }
                    >
                      <SelectTrigger className="mt-2 bg-black/18 border-white/8 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SHOT_TYPES.map((shot) => (
                          <SelectItem key={shot.id} value={shot.id}>
                            {shot.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </CardSpotlight>
          )}

          {arMode === "partner" && (
            <CardSpotlight className="overflow-hidden rounded-[22px] bg-black/14 border border-white/8 backdrop-blur-xl">
              <Card className="bg-transparent border-0">
                <CardHeader>
                  <CardTitle className="text-white">
                    👤 الشريك الهولوغرافي
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-white">اسم الشخصية</Label>
                    <Input
                      value={holographicPartner.character}
                      onChange={(e) =>
                        setHolographicPartner((prev) => ({
                          ...prev,
                          character: e.target.value,
                        }))
                      }
                      className="mt-2 bg-black/18 border-white/8 text-white placeholder-white/45"
                    />
                  </div>
                </CardContent>
              </Card>
            </CardSpotlight>
          )}

          {arMode === "gestures" && (
            <CardSpotlight className="overflow-hidden rounded-[22px] bg-black/14 border border-white/8 backdrop-blur-xl">
              <Card className="bg-transparent border-0">
                <CardHeader>
                  <CardTitle className="text-white">
                    👁️ التحكم بالإيماءات
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {activeGestures.map((gesture, idx) => (
                    <div
                      key={`${gesture.type}-${idx}`}
                      className={`flex items-center justify-between p-3 border rounded-[22px] ${gesture.enabled ? "bg-green-600/20 border-green-500/30" : "bg-black/18 border-white/8"}`}
                    >
                      <span className="text-sm text-white/85">
                        {gesture.action}
                      </span>
                      <Button
                        size="sm"
                        variant={gesture.enabled ? "default" : "outline"}
                        onClick={() =>
                          setActiveGestures((prev) =>
                            prev.map((g, i) =>
                              i === idx ? { ...g, enabled: !g.enabled } : g
                            )
                          )
                        }
                        className={
                          gesture.enabled
                            ? ""
                            : "border-white/20 text-white hover:bg-white/8"
                        }
                      >
                        {gesture.enabled ? "✓" : "○"}
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </CardSpotlight>
          )}
        </div>
      </div>
    </div>
  );
}
