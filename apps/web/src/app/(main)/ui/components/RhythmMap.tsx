import { motion } from "framer-motion";
import { Eye, EyeOff, Activity } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface RhythmData {
  sceneId: string;
  sceneName: string;
  act: number;
  intensity: number; // 0-100
}

interface RhythmMapProps {
  data?: RhythmData[];
  showMap?: boolean;
  onToggle?: (show: boolean) => void;
}

const defaultData: RhythmData[] = [
  { sceneId: "s1", sceneName: "المقدمة", act: 1, intensity: 20 },
  { sceneId: "s2", sceneName: "التعريف بالشخصيات", act: 1, intensity: 30 },
  { sceneId: "s3", sceneName: "الحدث المحرك", act: 1, intensity: 50 },
  { sceneId: "s4", sceneName: "قبول المهمة", act: 1, intensity: 40 },
  { sceneId: "s5", sceneName: "التحضير للرحلة", act: 1, intensity: 35 },
  { sceneId: "s6", sceneName: "أول عقبة", act: 2, intensity: 60 },
  { sceneId: "s7", sceneName: "تطوير المهارات", act: 2, intensity: 45 },
  { sceneId: "s8", sceneName: "كشف السر", act: 2, intensity: 70 },
  { sceneId: "s9", sceneName: "الخيانة", act: 2, intensity: 80 },
  { sceneId: "s10", sceneName: "نقطة اللاعودة", act: 2, intensity: 85 },
  { sceneId: "s11", sceneName: "الاستعداد للنهاية", act: 3, intensity: 55 },
  { sceneId: "s12", sceneName: "المواجهة النهائية", act: 3, intensity: 95 },
  { sceneId: "s13", sceneName: "الذروة", act: 3, intensity: 100 },
  { sceneId: "s14", sceneName: "الحل", act: 3, intensity: 40 },
  { sceneId: "s15", sceneName: "الخاتمة", act: 3, intensity: 25 },
];

const getIntensityColor = (intensity: number): string => {
  if (intensity >= 80) return "var(--state-flagged)";
  if (intensity >= 60) return "var(--state-alt)";
  if (intensity >= 40) return "var(--color-accent)";
  return "var(--state-draft)";
};

const getIntensityLabel = (intensity: number): string => {
  if (intensity >= 80) return "عالي جداً";
  if (intensity >= 60) return "عالي";
  if (intensity >= 40) return "متوسط";
  if (intensity >= 20) return "منخفض";
  return "هادئ";
};

export function RhythmMap({
  data = defaultData,
  showMap = true,
  onToggle,
}: RhythmMapProps) {
  const [isVisible, setIsVisible] = useState(showMap);

  const handleToggle = () => {
    const newState = !isVisible;
    setIsVisible(newState);
    onToggle?.(newState);
  };

  const acts = Array.from(new Set(data.map((d) => d.act))).sort();
  const maxIntensity = Math.max(...data.map((d) => d.intensity));

  return (
    <Card className="bg-[var(--color-panel)] border-[var(--color-surface)]">
      <div className="p-4 border-b border-[var(--color-surface)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-[var(--color-accent)]" />
          <h3 className="text-[var(--color-text)]" dir="rtl">
            خريطة الإيقاع
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggle}
          className="text-[var(--color-muted)] hover:bg-[var(--color-surface)]"
        >
          {isVisible ? (
            <>
              <EyeOff className="w-4 h-4 ml-2" />
              إخفاء
            </>
          ) : (
            <>
              <Eye className="w-4 h-4 ml-2" />
              إظهار
            </>
          )}
        </Button>
      </div>

      {isVisible && (
        <div className="p-6">
          <div className="space-y-6">
            {/* Acts */}
            {acts.map((act) => {
              const actScenes = data.filter((d) => d.act === act);

              return (
                <motion.div
                  key={act}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: act * 0.1 }}
                >
                  <div className="mb-3">
                    <h4 className="text-[var(--color-text)]" dir="rtl">
                      الفصل {act}
                    </h4>
                    <p className="text-[var(--color-muted)]" dir="rtl">
                      {actScenes.length} مشهد
                    </p>
                  </div>

                  {/* Heatmap Grid */}
                  <div
                    className="grid gap-2"
                    style={{
                      gridTemplateColumns: `repeat(${Math.min(actScenes.length, 8)}, minmax(0, 1fr))`,
                    }}
                  >
                    <TooltipProvider>
                      {actScenes.map((scene, idx) => (
                        <Tooltip key={scene.sceneId}>
                          <TooltipTrigger asChild>
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: act * 0.1 + idx * 0.03 }}
                              className="aspect-square rounded-lg cursor-pointer transition-transform hover:scale-110"
                              style={{
                                backgroundColor: getIntensityColor(
                                  scene.intensity
                                ),
                                opacity:
                                  0.2 + (scene.intensity / maxIntensity) * 0.8,
                              }}
                            />
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            className="bg-[var(--color-panel)] border-[var(--color-surface)]"
                          >
                            <div className="text-right" dir="rtl">
                              <p className="text-[var(--color-text)] mb-1">
                                {scene.sceneName}
                              </p>
                              <div className="flex items-center gap-2">
                                <span className="text-[var(--color-muted)]">
                                  الإيقاع:
                                </span>
                                <span
                                  style={{
                                    color: getIntensityColor(scene.intensity),
                                  }}
                                >
                                  {getIntensityLabel(scene.intensity)} (
                                  {scene.intensity}%)
                                </span>
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </TooltipProvider>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-6 pt-6 border-t border-[var(--color-surface)]">
            <h4 className="text-[var(--color-text)] mb-3" dir="rtl">
              مقياس الكثافة
            </h4>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{
                    backgroundColor: "var(--state-draft)",
                    opacity: 0.6,
                  }}
                />
                <span className="text-[var(--color-muted)]">هادئ</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{
                    backgroundColor: "var(--color-accent)",
                    opacity: 0.6,
                  }}
                />
                <span className="text-[var(--color-muted)]">متوسط</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: "var(--state-alt)", opacity: 0.8 }}
                />
                <span className="text-[var(--color-muted)]">عالي</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{
                    backgroundColor: "var(--state-flagged)",
                    opacity: 1,
                  }}
                />
                <span className="text-[var(--color-muted)]">ذروة</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
