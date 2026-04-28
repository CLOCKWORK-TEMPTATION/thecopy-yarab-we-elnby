import { Contrast, Droplets, RotateCcw, Sun, Thermometer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";

import type { ColorGrade } from "./types";

interface BasicAdjustmentsCardProps {
  grade: ColorGrade;
  onReset: () => void;
  onUpdate: (key: keyof ColorGrade, value: number) => void;
}

export function BasicAdjustmentsCard({
  grade,
  onReset,
  onUpdate,
}: BasicAdjustmentsCardProps) {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-zinc-400 uppercase tracking-wider flex items-center justify-between">
          التعديلات الأساسية
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-6 px-2"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="basic-adjustment-temperature"
              className="text-xs text-zinc-400 flex items-center gap-1"
            >
              <Thermometer className="h-3 w-3" />
              حرارة اللون
            </label>
            <span className="text-xs font-mono text-amber-500">
              {grade.temperature > 0
                ? `+${grade.temperature}`
                : grade.temperature}
            </span>
          </div>
          <div className="relative">
            <div className="absolute inset-0 rounded bg-gradient-to-r from-blue-500 via-white to-orange-500 opacity-30" />
            <Slider
              id="basic-adjustment-temperature"
              value={[grade.temperature]}
              min={-100}
              max={100}
              onValueChange={([value]) =>
                onUpdate("temperature", value ?? grade.temperature)
              }
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="basic-adjustment-contrast"
              className="text-xs text-zinc-400 flex items-center gap-1"
            >
              <Contrast className="h-3 w-3" />
              التباين
            </label>
            <span className="text-xs font-mono text-amber-500">
              {grade.contrast}%
            </span>
          </div>
          <Slider
            id="basic-adjustment-contrast"
            value={[grade.contrast]}
            min={50}
            max={200}
            onValueChange={([value]) =>
              onUpdate("contrast", value ?? grade.contrast)
            }
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="basic-adjustment-saturation"
              className="text-xs text-zinc-400 flex items-center gap-1"
            >
              <Droplets className="h-3 w-3" />
              التشبع
            </label>
            <span className="text-xs font-mono text-amber-500">
              {grade.saturation}%
            </span>
          </div>
          <Slider
            id="basic-adjustment-saturation"
            value={[grade.saturation]}
            min={0}
            max={200}
            onValueChange={([value]) =>
              onUpdate("saturation", value ?? grade.saturation)
            }
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="basic-adjustment-exposure"
              className="text-xs text-zinc-400 flex items-center gap-1"
            >
              <Sun className="h-3 w-3" />
              التعريض
            </label>
            <span className="text-xs font-mono text-amber-500">
              {grade.exposure > 0
                ? `+${grade.exposure.toFixed(1)}`
                : grade.exposure.toFixed(1)}{" "}
              EV
            </span>
          </div>
          <Slider
            id="basic-adjustment-exposure"
            value={[grade.exposure]}
            min={-2}
            max={2}
            step={0.1}
            onValueChange={([value]) =>
              onUpdate("exposure", value ?? grade.exposure)
            }
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label
                htmlFor="basic-adjustment-highlights"
                className="text-xs text-zinc-400"
              >
                الإضاءات
              </label>
              <span className="text-xs font-mono text-amber-500">
                {grade.highlights}
              </span>
            </div>
            <Slider
              id="basic-adjustment-highlights"
              value={[grade.highlights]}
              min={-100}
              max={100}
              onValueChange={([value]) =>
                onUpdate("highlights", value ?? grade.highlights)
              }
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label
                htmlFor="basic-adjustment-shadows"
                className="text-xs text-zinc-400"
              >
                الظلال
              </label>
              <span className="text-xs font-mono text-amber-500">
                {grade.shadows}
              </span>
            </div>
            <Slider
              id="basic-adjustment-shadows"
              value={[grade.shadows]}
              min={-100}
              max={100}
              onValueChange={([value]) =>
                onUpdate("shadows", value ?? grade.shadows)
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
