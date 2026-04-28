"use client";

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
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  AR_FEATURES,
  GESTURE_CONTROLS,
  SHOT_TYPES,
} from "../../types/constants";

import type {
  TeleprompterSettings,
  BlockingMark,
  CameraEyeSettings,
  HolographicPartner,
  GestureControl,
} from "../../types";

interface ARTrainingProps {
  arMode:
    | "setup"
    | "teleprompter"
    | "blocking"
    | "camera"
    | "partner"
    | "gestures";
  setArMode: (
    mode:
      | "setup"
      | "teleprompter"
      | "blocking"
      | "camera"
      | "partner"
      | "gestures"
  ) => void;
  teleprompterSettings: TeleprompterSettings;
  setTeleprompterSettings: (settings: TeleprompterSettings) => void;
  blockingMarks: BlockingMark[];
  setBlockingMarks: (marks: BlockingMark[]) => void;
  cameraSettings: CameraEyeSettings;
  setCameraSettings: (settings: CameraEyeSettings) => void;
  holographicPartner: HolographicPartner;
  setHolographicPartner: (partner: HolographicPartner) => void;
  activeGestures: GestureControl[];
  setActiveGestures: (gestures: GestureControl[]) => void;
  arSessionActive: boolean;
  setArSessionActive: (active: boolean) => void;
  visionProConnected: boolean;
}

export const ARTraining: React.FC<ARTrainingProps> = ({
  arMode,
  setArMode,
  teleprompterSettings,
  setTeleprompterSettings,
  blockingMarks,
  setBlockingMarks,
  cameraSettings,
  setCameraSettings,
  holographicPartner,
  setHolographicPartner,
  activeGestures,
  setActiveGestures,
  arSessionActive,
  setArSessionActive,
  visionProConnected,
}) => (
  <div className="max-w-6xl mx-auto py-8">
    <h2 className="text-3xl font-bold text-white/85 mb-2">🥽 تدريب AR/MR</h2>
    <p className="text-white/55 mb-8">
      تجربة غامرة مع Vision Pro للتدريب الاحترافي
    </p>

    <Tabs
      defaultValue="setup"
      value={arMode}
      onValueChange={(v) => setArMode(v as any)}
    >
      <TabsList className="grid w-full grid-cols-6 mb-6">
        <TabsTrigger value="setup">⚙️ الإعداد</TabsTrigger>
        <TabsTrigger value="teleprompter">📄 Teleprompter</TabsTrigger>
        <TabsTrigger value="blocking">📍 Blocking</TabsTrigger>
        <TabsTrigger value="camera">🎥 الكاميرا</TabsTrigger>
        <TabsTrigger value="partner">🎭 الشريك</TabsTrigger>
        <TabsTrigger value="gestures">✋ الإيماءات</TabsTrigger>
      </TabsList>

      <TabsContent value="setup" className="space-y-6">
        <CardSpotlight className="overflow-hidden rounded-[22px] backdrop-blur-xl">
          <Card className="border-0">
            <CardHeader>
              <CardTitle>إعداد جلسة AR/MR</CardTitle>
              <CardDescription>
                قم بإعداد جهاز Vision Pro للبدء في التدريب الغامر
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-[22px]">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🥽</span>
                  <div>
                    <h4 className="font-semibold">Vision Pro</h4>
                    <p className="text-sm text-white/55">حالة الاتصال</p>
                  </div>
                </div>
                <Badge
                  className={visionProConnected ? "bg-green-600" : "bg-red-600"}
                >
                  {visionProConnected ? "متصل" : "غير متصل"}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {AR_FEATURES.map((feature, idx) => (
                  <div
                    key={idx}
                    className="p-4 border rounded-[22px] hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{feature.icon}</span>
                      <h4 className="font-semibold">{feature.name}</h4>
                    </div>
                    <p className="text-sm text-white/55">
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={() => setArSessionActive(!arSessionActive)}
                disabled={!visionProConnected}
              >
                {arSessionActive ? "⏹️ إيقاف الجلسة" : "▶️ بدء الجلسة"}
              </Button>
            </CardContent>
          </Card>
        </CardSpotlight>
      </TabsContent>

      <TabsContent value="teleprompter" className="space-y-6">
        <CardSpotlight className="overflow-hidden rounded-[22px] backdrop-blur-xl">
          <Card className="border-0">
            <CardHeader>
              <CardTitle>إعدادات Teleprompter</CardTitle>
              <CardDescription>
                ضبط سرعة وحجم وموقع النص أثناء التدريب
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>السرعة ({teleprompterSettings.speed}%)</Label>
                <Progress
                  value={teleprompterSettings.speed}
                  className="cursor-pointer"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const percentage = Math.round((x / rect.width) * 100);
                    setTeleprompterSettings({
                      ...teleprompterSettings,
                      speed: percentage,
                    });
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>حجم الخط ({teleprompterSettings.fontSize}px)</Label>
                <Input
                  type="number"
                  value={teleprompterSettings.fontSize}
                  onChange={(e) =>
                    setTeleprompterSettings({
                      ...teleprompterSettings,
                      fontSize: parseInt(e.target.value) || 24,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>الشفافية ({teleprompterSettings.opacity}%)</Label>
                <Progress
                  value={teleprompterSettings.opacity}
                  className="cursor-pointer"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const percentage = Math.round((x / rect.width) * 100);
                    setTeleprompterSettings({
                      ...teleprompterSettings,
                      opacity: percentage,
                    });
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>الموقع</Label>
                <Select
                  value={teleprompterSettings.position}
                  onValueChange={(value) =>
                    setTeleprompterSettings({
                      ...teleprompterSettings,
                      position: value as any,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="center">المركز</SelectItem>
                    <SelectItem value="left">اليسار</SelectItem>
                    <SelectItem value="right">اليمين</SelectItem>
                    <SelectItem value="top">الأعلى</SelectItem>
                    <SelectItem value="bottom">الأسفل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </CardSpotlight>
      </TabsContent>

      <TabsContent value="blocking" className="space-y-6">
        <CardSpotlight className="overflow-hidden rounded-[22px] backdrop-blur-xl">
          <Card className="border-0">
            <CardHeader>
              <CardTitle>إعدادات Blocking</CardTitle>
              <CardDescription>
                حدد نقاط الحركة والتموضع في المشهد
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="aspect-video bg-black/14 rounded-[22px] relative border-2 border-dashed border-white/20">
                {blockingMarks.map((mark) => (
                  <div
                    key={mark.id}
                    className="absolute w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold cursor-move"
                    style={{
                      left: `${mark.x}%`,
                      top: `${mark.y}%`,
                      backgroundColor: mark.color,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    {mark.label}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() =>
                    setBlockingMarks([
                      ...blockingMarks,
                      {
                        id: Date.now().toString(),
                        x: 50,
                        y: 50,
                        label: `نقطة ${blockingMarks.length + 1}`,
                        color: "#3b82f6",
                      },
                    ])
                  }
                >
                  ➕ إضافة نقطة
                </Button>
                <Button variant="outline" onClick={() => setBlockingMarks([])}>
                  🗑️ مسح الكل
                </Button>
              </div>
            </CardContent>
          </Card>
        </CardSpotlight>
      </TabsContent>

      <TabsContent value="camera" className="space-y-6">
        <CardSpotlight className="overflow-hidden rounded-[22px] backdrop-blur-xl">
          <Card className="border-0">
            <CardHeader>
              <CardTitle>إعدادات الكاميرا</CardTitle>
              <CardDescription>
                ضبط البعد البؤري ونوع اللقطة ونسبة العرض للارتفاع
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>البعد البؤري (mm)</Label>
                <Input
                  type="number"
                  value={cameraSettings.focalLength}
                  onChange={(e) =>
                    setCameraSettings({
                      ...cameraSettings,
                      focalLength: parseInt(e.target.value) || 50,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>نوع اللقطة</Label>
                <Select
                  value={cameraSettings.shotType}
                  onValueChange={(value) =>
                    setCameraSettings({
                      ...cameraSettings,
                      shotType: value as any,
                    })
                  }
                >
                  <SelectTrigger>
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

              <div className="space-y-2">
                <Label>نسبة العرض للارتفاع</Label>
                <Select
                  value={cameraSettings.aspectRatio}
                  onValueChange={(value) =>
                    setCameraSettings({
                      ...cameraSettings,
                      aspectRatio: value as any,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="16:9">16:9 (شاشة عريضة)</SelectItem>
                    <SelectItem value="4:3">4:3 (تقليدي)</SelectItem>
                    <SelectItem value="2.39:1">2.39:1 (سينمائي)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </CardSpotlight>
      </TabsContent>

      <TabsContent value="partner" className="space-y-6">
        <CardSpotlight className="overflow-hidden rounded-[22px] backdrop-blur-xl">
          <Card className="border-0">
            <CardHeader>
              <CardTitle>الشريك الهولوغرافي</CardTitle>
              <CardDescription>
                قم بإعداد شريك افتراضي للتدريب معه
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>اسم الشخصية</Label>
                <Input
                  value={holographicPartner.character}
                  onChange={(e) =>
                    setHolographicPartner({
                      ...holographicPartner,
                      character: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>المشاعر</Label>
                <Select
                  value={holographicPartner.emotion}
                  onValueChange={(value) =>
                    setHolographicPartner({
                      ...holographicPartner,
                      emotion: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="حب">حب</SelectItem>
                    <SelectItem value="غضب">غضب</SelectItem>
                    <SelectItem value="حزن">حزن</SelectItem>
                    <SelectItem value="خوف">خوف</SelectItem>
                    <SelectItem value="سعادة">سعادة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>الشدة ({holographicPartner.intensity}%)</Label>
                <Progress
                  value={holographicPartner.intensity}
                  className="cursor-pointer"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const percentage = Math.round((x / rect.width) * 100);
                    setHolographicPartner({
                      ...holographicPartner,
                      intensity: percentage,
                    });
                  }}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="partner-active"
                  checked={holographicPartner.isActive}
                  onChange={(e) =>
                    setHolographicPartner({
                      ...holographicPartner,
                      isActive: e.target.checked,
                    })
                  }
                />
                <Label htmlFor="partner-active">تفعيل الشريك</Label>
              </div>
            </CardContent>
          </Card>
        </CardSpotlight>
      </TabsContent>

      <TabsContent value="gestures" className="space-y-6">
        <CardSpotlight className="overflow-hidden rounded-[22px] backdrop-blur-xl">
          <Card className="border-0">
            <CardHeader>
              <CardTitle>التحكم بالإيماءات</CardTitle>
              <CardDescription>
                قم بإعداد الإيماءات للتحكم في التطبيق
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {GESTURE_CONTROLS.map((gesture) => (
                  <div
                    key={gesture.id}
                    className="p-4 border rounded-[22px] hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{gesture.icon}</span>
                        <h4 className="font-semibold">{gesture.name}</h4>
                      </div>
                      <input
                        type="checkbox"
                        checked={activeGestures.some(
                          (g) => g.id === gesture.id
                        )}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setActiveGestures([...activeGestures, gesture]);
                          } else {
                            setActiveGestures(
                              activeGestures.filter((g) => g.id !== gesture.id)
                            );
                          }
                        }}
                      />
                    </div>
                    <p className="text-sm text-white/55">
                      {gesture.description}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </CardSpotlight>
      </TabsContent>
    </Tabs>
  </div>
);
