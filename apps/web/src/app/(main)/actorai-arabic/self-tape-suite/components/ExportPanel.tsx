"use client";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";
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
import { Slider } from "@/components/ui/slider";
import { formatTime } from "./utils";
import type { ExportSettings, Take } from "./types";

interface ExportPanelProps {
  exportSettings: ExportSettings;
  setExportSettings: (
    settings: ExportSettings | ((prev: ExportSettings) => ExportSettings)
  ) => void;
  exportingTakeId: string | null;
  exportProgress: number;
  availableTakes: Take[];
  exportableTakeIds: Set<string>;
  bestExportableTake: Take | undefined;
  exportTake: (takeId: string) => Promise<void>;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({
  exportSettings,
  setExportSettings,
  exportingTakeId,
  exportProgress,
  availableTakes,
  exportableTakeIds,
  bestExportableTake,
  exportTake,
}) => {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <CardSpotlight className="overflow-hidden rounded-[22px] bg-black/18 border-purple-500/30">
        <Card className="bg-black/18 border-purple-500/30 bg-transparent">
          <CardHeader>
            <CardTitle className="text-white">⚙️ إعدادات التصدير</CardTitle>
            <CardDescription className="text-purple-300">
              التصدير الحالي ينزل الملف الأصلي المسجل كما التقطه المتصفح، مع
              استخدام الاسم المنظف وبيانات السليت داخل اسم الملف.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-purple-300">جودة الإخراج</Label>
              <Select
                value={exportSettings.quality}
                onValueChange={(value) =>
                  setExportSettings((previous) => ({
                    ...previous,
                    quality: value as ExportSettings["quality"],
                  }))
                }
              >
                <SelectTrigger className="border-purple-500/30 bg-black/14 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-purple-500/30 bg-black/14">
                  <SelectItem value="casting" className="text-white">
                    Casting
                  </SelectItem>
                  <SelectItem value="high" className="text-white">
                    High
                  </SelectItem>
                  <SelectItem value="medium" className="text-white">
                    Medium
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-purple-300">الصيغة المفضلة</Label>
              <Select
                value={exportSettings.format}
                onValueChange={(value) =>
                  setExportSettings((previous) => ({
                    ...previous,
                    format: value as ExportSettings["format"],
                  }))
                }
              >
                <SelectTrigger className="border-purple-500/30 bg-black/14 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-purple-500/30 bg-black/14">
                  <SelectItem value="webm" className="text-white">
                    WebM
                  </SelectItem>
                  <SelectItem value="mp4" className="text-white">
                    MP4
                  </SelectItem>
                  <SelectItem value="mov" className="text-white">
                    MOV
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl bg-black/14 p-4">
              <div className="mb-4 flex items-center justify-between">
                <Label className="text-purple-300">تضمين بيانات السليت</Label>
                <Button
                  variant="outline"
                  size="sm"
                  className={
                    exportSettings.includeSlate
                      ? "border-purple-600 bg-purple-600 text-white"
                      : "border-purple-500/50 text-white"
                  }
                  onClick={() =>
                    setExportSettings((previous) => ({
                      ...previous,
                      includeSlate: !previous.includeSlate,
                    }))
                  }
                >
                  {exportSettings.includeSlate ? "✓ مفعل" : "معطل"}
                </Button>
              </div>

              {exportSettings.includeSlate && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm text-purple-300">
                      اسم الممثل
                    </Label>
                    <Input
                      value={exportSettings.actorName}
                      onChange={(event) =>
                        setExportSettings((previous) => ({
                          ...previous,
                          actorName: event.target.value,
                        }))
                      }
                      className="mt-1 border-purple-500/30 bg-black/18 text-white"
                      placeholder="اسم الممثل"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-purple-300">
                      اسم المشروع
                    </Label>
                    <Input
                      value={exportSettings.projectName}
                      onChange={(event) =>
                        setExportSettings((previous) => ({
                          ...previous,
                          projectName: event.target.value,
                        }))
                      }
                      className="mt-1 border-purple-500/30 bg-black/18 text-white"
                      placeholder="اسم الفيلم أو المشروع"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-purple-300">اسم الدور</Label>
                    <Input
                      value={exportSettings.roleName}
                      onChange={(event) =>
                        setExportSettings((previous) => ({
                          ...previous,
                          roleName: event.target.value,
                        }))
                      }
                      className="mt-1 border-purple-500/30 bg-black/18 text-white"
                      placeholder="اسم الشخصية"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-purple-300">الوكالة</Label>
                    <Input
                      value={exportSettings.agencyName}
                      onChange={(event) =>
                        setExportSettings((previous) => ({
                          ...previous,
                          agencyName: event.target.value,
                        }))
                      }
                      className="mt-1 border-purple-500/30 bg-black/18 text-white"
                      placeholder="اختياري"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-purple-300">
                      مدة السليت: {exportSettings.slateDuration} ثوان
                    </Label>
                    <Slider
                      value={[exportSettings.slateDuration]}
                      min={3}
                      max={10}
                      step={1}
                      onValueChange={([value]) =>
                        setExportSettings((previous) => ({
                          ...previous,
                          slateDuration: value ?? previous.slateDuration,
                        }))
                      }
                    />
                  </div>
                </div>
              )}
            </div>

            {exportingTakeId && (
              <div className="rounded-xl border border-purple-500/30 bg-black/14 p-4">
                <p className="mb-3 text-white">
                  جاري إعداد الملف للتنزيل...
                </p>
                <Progress value={exportProgress} className="h-3" />
                <p className="mt-2 text-sm text-purple-300">
                  {exportProgress}%
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </CardSpotlight>

      <CardSpotlight className="overflow-hidden rounded-[22px] bg-black/18 border-purple-500/30">
        <Card className="bg-black/18 border-purple-500/30 bg-transparent">
          <CardHeader>
            <CardTitle className="text-white">📤 تنزيل التسجيلات</CardTitle>
            <CardDescription className="text-purple-300">
              التسجيلات التي تحتوي على ملف فيديو حي فقط ستكون قابلة للتنزيل.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {availableTakes.map((take) => {
              const canDownload = exportableTakeIds.has(take.id);
              return (
                <div
                  key={take.id}
                  className="rounded-xl border border-purple-500/20 bg-black/14 p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h4 className="font-medium text-white">{take.name}</h4>
                      <p className="text-sm text-white/55">
                        {formatTime(take.duration)} • {take.score ?? 0}%
                      </p>
                    </div>

                    <Button
                      className="bg-green-600 text-white hover:bg-green-700"
                      onClick={() => {
                        void exportTake(take.id);
                      }}
                      disabled={!canDownload || exportingTakeId === take.id}
                    >
                      {canDownload ? "📤 تنزيل" : "غير متاح"}
                    </Button>
                  </div>

                  {!canDownload && (
                    <p className="mt-3 text-sm text-yellow-300">
                      هذا التسجيل محفوظ كمرجع وصفي فقط بعد إعادة التحميل، لذا
                      لا يملك ملف فيديو صالحاً للتنزيل.
                    </p>
                  )}
                </div>
              );
            })}

            {bestExportableTake && (
              <div className="border-t border-purple-500/30 pt-4">
                <Button
                  className="w-full bg-purple-600 text-white hover:bg-purple-700"
                  onClick={() => {
                    void exportTake(bestExportableTake.id);
                  }}
                  disabled={Boolean(exportingTakeId)}
                >
                  ⭐ تنزيل أفضل تسجيل قابل للتصدير
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </CardSpotlight>
    </div>
  );
};
