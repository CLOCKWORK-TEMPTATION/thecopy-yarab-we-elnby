"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Check,
  Contrast,
  Copy,
  Droplets,
  Eye,
  EyeOff,
  Film,
  Palette,
  RotateCcw,
  Sun,
  Thermometer,
  Wand2,
} from "lucide-react";
import SliderNumberInput from "../controls/SliderNumberInput";
import { StudioMetricCell, StudioPanel } from "../studio-ui";

interface ColorGrade {
  temperature: number;
  tint: number;
  exposure: number;
  contrast: number;
  highlights: number;
  shadows: number;
  saturation: number;
  vibrance: number;
  shadowHue: number;
  midtoneHue: number;
  highlightHue: number;
}

interface LUTPreset {
  id: string;
  name: string;
  nameAr: string;
  film?: string;
  description: string;
  grade: Partial<ColorGrade>;
  primaryColor: string;
}

interface ColorGradingPreviewToolProps {
  className?: string;
  onGradeChange?: (grade: ColorGrade) => void;
}

const LUT_PRESETS: LUTPreset[] = [
  {
    id: "neutral",
    name: "Neutral",
    nameAr: "محايد",
    description: "بدون تأثيرات - الصورة الأصلية",
    grade: {},
    primaryColor: "rgb(128, 128, 128)",
  },
  {
    id: "teal-orange",
    name: "Teal & Orange",
    nameAr: "تيل وبرتقالي",
    film: "Mad Max: Fury Road",
    description: "التباين الكلاسيكي بين البشرة والخلفية",
    grade: {
      temperature: 15,
      shadowHue: 180,
      highlightHue: 30,
      contrast: 115,
      saturation: 120,
    },
    primaryColor: "rgb(0, 128, 128)",
  },
  {
    id: "noir",
    name: "Film Noir",
    nameAr: "نوار",
    film: "Sin City",
    description: "تباين عالي مع ظلال عميقة",
    grade: {
      contrast: 150,
      saturation: 30,
      shadows: -30,
      highlights: 20,
      temperature: -10,
    },
    primaryColor: "rgb(20, 20, 30)",
  },
  {
    id: "blockbuster",
    name: "Blockbuster",
    nameAr: "هوليوود",
    film: "Transformers",
    description: "ألوان زاهية ومشبعة",
    grade: {
      contrast: 120,
      saturation: 140,
      vibrance: 130,
      highlights: 15,
      temperature: 5,
    },
    primaryColor: "rgb(255, 180, 50)",
  },
  {
    id: "vintage",
    name: "Vintage Film",
    nameAr: "كلاسيكي",
    film: "O Brother, Where Art Thou?",
    description: "مظهر الأفلام القديمة الدافئ",
    grade: {
      temperature: 25,
      tint: 5,
      saturation: 80,
      contrast: 90,
      shadows: 10,
      highlightHue: 45,
    },
    primaryColor: "rgb(200, 170, 120)",
  },
  {
    id: "matrix",
    name: "Matrix Green",
    nameAr: "ماتريكس",
    film: "The Matrix",
    description: "الطابع الأخضر المميز",
    grade: {
      tint: -30,
      midtoneHue: 120,
      saturation: 70,
      contrast: 110,
      temperature: -15,
    },
    primaryColor: "rgb(0, 180, 80)",
  },
  {
    id: "blade-runner",
    name: "Neon Noir",
    nameAr: "نيون نوار",
    film: "Blade Runner 2049",
    description: "ظلام مع لمسات نيون",
    grade: {
      contrast: 130,
      shadows: -20,
      saturation: 90,
      highlightHue: 300,
      temperature: -5,
    },
    primaryColor: "rgb(255, 100, 200)",
  },
  {
    id: "moonlight",
    name: "Moonlight Blue",
    nameAr: "ضوء القمر",
    film: "Moonlight",
    description: "درجات زرقاء حالمة",
    grade: {
      temperature: -25,
      shadowHue: 220,
      midtoneHue: 200,
      saturation: 85,
      contrast: 95,
    },
    primaryColor: "rgb(80, 120, 200)",
  },
];

const DEFAULT_GRADE: ColorGrade = {
  temperature: 0,
  tint: 0,
  exposure: 0,
  contrast: 100,
  highlights: 0,
  shadows: 0,
  saturation: 100,
  vibrance: 100,
  shadowHue: 0,
  midtoneHue: 0,
  highlightHue: 0,
};

function buildHistogramPath(seed: number): string {
  const points = Array.from({ length: 20 }, (_, index) => {
    const offset = Math.sin((index + 1) * 0.65 + seed / 18) * 8;
    const value = 22 + offset + (seed % 11);
    const y = Number((40 - value).toFixed(2));
    return `L ${index * 5} ${y}`;
  });

  return `M 0 40 ${points.join(" ")} L 100 40 Z`;
}

export function ColorGradingPreviewTool({
  className,
  onGradeChange,
}: ColorGradingPreviewToolProps) {
  const [grade, setGrade] = React.useState<ColorGrade>(DEFAULT_GRADE);
  const [selectedPreset, setSelectedPreset] = React.useState<string | null>(
    null
  );
  const [showOriginal, setShowOriginal] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const activePreset = React.useMemo(
    () =>
      selectedPreset
        ? (LUT_PRESETS.find((preset) => preset.id === selectedPreset) ?? null)
        : null,
    [selectedPreset]
  );

  const isPresetLocked = Boolean(activePreset && activePreset.id !== "neutral");
  const presetReason =
    activePreset && activePreset.id !== "neutral"
      ? `قالب ${activePreset.nameAr} يثبت إعدادات الدرجة الحالية. اختر تحرير الدرجة للانتقال إلى وضع مخصص يسمح بتعديل كل السلايدر والعجلات.`
      : null;

  const generatedFilter = React.useMemo(() => {
    if (showOriginal) {
      return "none";
    }

    return [
      `brightness(${1 + grade.exposure / 4})`,
      `contrast(${grade.contrast / 100})`,
      `saturate(${grade.saturation / 100})`,
      grade.temperature > 0
        ? `sepia(${grade.temperature / 200})`
        : `hue-rotate(${grade.temperature * 2}deg)`,
    ].join(" ");
  }, [
    grade.contrast,
    grade.exposure,
    grade.saturation,
    grade.temperature,
    showOriginal,
  ]);

  const generatedOverlay = React.useMemo(() => {
    if (showOriginal) {
      return {};
    }

    const shadowColor = `hsl(${grade.shadowHue}, 50%, 20%)`;
    const highlightColor = `hsl(${grade.highlightHue}, 40%, 80%)`;

    return {
      background: `linear-gradient(to bottom, ${highlightColor}${Math.floor(
        (100 - grade.highlights) * 0.2
      )
        .toString(16)
        .padStart(
          2,
          "0"
        )}, transparent 30%, transparent 70%, ${shadowColor}${Math.floor(
        (100 + grade.shadows) * 0.3
      )
        .toString(16)
        .padStart(2, "0")})`,
      mixBlendMode: "soft-light" as const,
    };
  }, [
    grade.highlightHue,
    grade.highlights,
    grade.shadowHue,
    grade.shadows,
    showOriginal,
  ]);

  React.useEffect(() => {
    onGradeChange?.(grade);
  }, [grade, onGradeChange]);

  const applyPreset = React.useCallback((presetId: string) => {
    const preset = LUT_PRESETS.find((item) => item.id === presetId);
    if (!preset) {
      return;
    }

    setGrade({ ...DEFAULT_GRADE, ...preset.grade });
    setSelectedPreset(presetId);
  }, []);

  const unlockPreset = React.useCallback(() => {
    setSelectedPreset(null);
  }, []);

  const resetGrade = React.useCallback(() => {
    setGrade(DEFAULT_GRADE);
    setSelectedPreset("neutral");
  }, []);

  const updateGrade = React.useCallback(
    (key: keyof ColorGrade, value: number) => {
      setGrade((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const copySettings = React.useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(JSON.stringify(grade, null, 2));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }, [grade]);

  const histogramPaths = React.useMemo(
    () => ({
      red: buildHistogramPath(grade.temperature + grade.highlights + 12),
      green: buildHistogramPath(grade.saturation + grade.vibrance + 6),
      blue: buildHistogramPath(grade.shadows + grade.highlightHue + 18),
    }),
    [
      grade.highlightHue,
      grade.highlights,
      grade.saturation,
      grade.shadows,
      grade.temperature,
      grade.vibrance,
    ]
  );

  return (
    <div
      className={cn("grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]", className)}
    >
      <div className="space-y-4">
        <StudioPanel
          title="Grade Monitor"
          subtitle="معاينة حية لدرجة الفيلم مع مقارنة قبل وبعد"
          headerRight={
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={() => setShowOriginal((prev) => !prev)}
                className="border border-[#343434] bg-[#0d0d0d] text-[#c6b999] hover:bg-[#171717]"
              >
                {showOriginal ? (
                  <Eye className="mr-2 h-4 w-4" />
                ) : (
                  <EyeOff className="mr-2 h-4 w-4" />
                )}
                {showOriginal ? "معالج" : "أصلي"}
              </Button>
              <Button
                type="button"
                onClick={copySettings}
                className="border border-[#343434] bg-[#0d0d0d] text-[#c6b999] hover:bg-[#171717]"
              >
                {copied ? (
                  <Check className="mr-2 h-4 w-4 text-[#97d85c]" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                نسخ
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="relative aspect-[16/9] overflow-hidden rounded-[10px] border border-[#343434] bg-[#050505]">
              <div
                className="absolute inset-0 transition-all duration-300"
                style={{
                  background: `linear-gradient(135deg, hsl(${200 + grade.temperature}, 40%, 30%) 0%, hsl(${30 + grade.temperature}, 50%, 40%) 50%, hsl(${280 + grade.temperature}, 30%, 20%) 100%)`,
                  filter: generatedFilter,
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="grid w-full max-w-3xl grid-cols-3 gap-4 p-8">
                    <div className="aspect-square rounded-[10px] bg-gradient-to-br from-zinc-800 to-zinc-900 shadow-lg" />
                    <div className="aspect-square rounded-[10px] bg-gradient-to-br from-zinc-500 to-zinc-600 shadow-lg" />
                    <div className="aspect-square rounded-[10px] bg-gradient-to-br from-zinc-200 to-zinc-100 shadow-lg" />
                    <div
                      className="col-start-2 aspect-square rounded-full shadow-lg"
                      style={{
                        background: `linear-gradient(135deg, hsl(${25 + grade.highlightHue * 0.2}, ${50 + grade.saturation * 0.2}%, 70%) 0%, hsl(${20 + grade.shadowHue * 0.1}, ${40 + grade.saturation * 0.1}%, 50%) 100%)`,
                      }}
                    />
                  </div>
                </div>
                <div className="absolute inset-0" style={generatedOverlay} />
              </div>

              {showOriginal ? (
                <div className="absolute inset-0 flex">
                  <div className="w-1/2 overflow-hidden border-r-2 border-white/50">
                    <div className="absolute inset-0 bg-gradient-to-br from-zinc-600 via-amber-700/30 to-zinc-800" />
                  </div>
                  <div
                    className="w-1/2 overflow-hidden"
                    style={{ filter: generatedFilter }}
                  />
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/80 px-4 py-2 text-xs text-white">
                    قبل / بعد
                  </div>
                </div>
              ) : null}

              <div className="absolute left-4 top-4">
                <Badge className="border-0 bg-[#15100a] text-[#f6cf72]">
                  <Film className="mr-2 h-3 w-3" />
                  {activePreset?.nameAr ?? "درجة مخصصة"}
                </Badge>
              </div>

              <div className="absolute bottom-4 right-4 h-20 w-36 overflow-hidden rounded-[10px] border border-[#343434] bg-black/70 p-2">
                <svg className="h-full w-full" viewBox="0 0 100 40">
                  <path d={histogramPaths.red} fill="rgba(255,0,0,0.3)" />
                  <path d={histogramPaths.green} fill="rgba(0,255,0,0.3)" />
                  <path d={histogramPaths.blue} fill="rgba(0,0,255,0.3)" />
                </svg>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StudioMetricCell label="Temperature" value={grade.temperature} />
              <StudioMetricCell
                label="Contrast"
                value={`${grade.contrast}%`}
                tone="white"
              />
              <StudioMetricCell
                label="Saturation"
                value={`${grade.saturation}%`}
              />
              <StudioMetricCell
                label="Vibrance"
                value={`${grade.vibrance}%`}
                tone="white"
              />
            </div>
          </div>
        </StudioPanel>
      </div>

      <div className="space-y-4">
        <StudioPanel
          title="Film Looks"
          subtitle="قوالب درجات مرجعية"
          headerRight={<Wand2 className="h-4 w-4 text-[#e5b54f]" />}
        >
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {LUT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  className={cn(
                    "rounded-[10px] border px-3 py-3 text-right transition-all",
                    selectedPreset === preset.id
                      ? "border-[#e5b54f] bg-[#1f170a]"
                      : "border-[#343434] bg-[#0d0d0d] hover:border-[#73572a]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-4 w-4 rounded-full"
                      style={{ background: preset.primaryColor }}
                    />
                    <span className="text-sm text-white">{preset.nameAr}</span>
                  </div>
                </button>
              ))}
            </div>

            {activePreset ? (
              <div className="rounded-[10px] border border-[#5b4725] bg-[#140f08] p-4">
                <p className="text-lg font-semibold text-white">
                  {activePreset.nameAr}
                </p>
                {activePreset.film ? (
                  <p className="mt-1 text-sm text-[#d8caa6]">
                    {activePreset.film}
                  </p>
                ) : null}
                <p className="mt-3 text-sm leading-7 text-[#cdbf99]">
                  {activePreset.description}
                </p>
                {presetReason ? (
                  <p className="mt-3 text-sm leading-7 text-[#eee0ba]">
                    {presetReason}
                  </p>
                ) : null}
                {presetReason ? (
                  <Button
                    type="button"
                    onClick={unlockPreset}
                    className="mt-4 h-11 w-full border border-[#e5b54f] bg-[#20170a] text-[#f6cf72] hover:bg-[#2c1d0b]"
                  >
                    تحرير الدرجة
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        </StudioPanel>

        <StudioPanel
          title="Color Calibration"
          subtitle="تعديلات الدرجة الأساسية"
          headerRight={
            <Button
              type="button"
              onClick={resetGrade}
              className="border border-[#343434] bg-[#0d0d0d] text-[#c6b999] hover:bg-[#171717]"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              إعادة
            </Button>
          }
        >
          <div className="space-y-5">
            {presetReason ? (
              <div className="rounded-[10px] border border-[#5b4725] bg-[#140f08] px-4 py-3 text-sm leading-7 text-[#eee0ba]">
                {presetReason}
              </div>
            ) : null}

            <SliderNumberInput
              label="حرارة اللون"
              icon={Thermometer}
              value={grade.temperature}
              min={-100}
              max={100}
              step={1}
              disabled={isPresetLocked}
              onChange={(value) => updateGrade("temperature", value)}
            />

            <SliderNumberInput
              label="التباين"
              icon={Contrast}
              unit="%"
              value={grade.contrast}
              min={50}
              max={200}
              step={1}
              disabled={isPresetLocked}
              onChange={(value) => updateGrade("contrast", value)}
            />

            <SliderNumberInput
              label="التشبّع"
              icon={Droplets}
              unit="%"
              value={grade.saturation}
              min={0}
              max={200}
              step={1}
              disabled={isPresetLocked}
              onChange={(value) => updateGrade("saturation", value)}
            />

            <SliderNumberInput
              label="الإضاءة"
              icon={Sun}
              value={grade.exposure}
              min={-100}
              max={100}
              step={1}
              disabled={isPresetLocked}
              onChange={(value) => updateGrade("exposure", value)}
            />

            <SliderNumberInput
              label="الظلال"
              icon={Palette}
              value={grade.shadows}
              min={-100}
              max={100}
              step={1}
              disabled={isPresetLocked}
              onChange={(value) => updateGrade("shadows", value)}
            />
          </div>
        </StudioPanel>
      </div>
    </div>
  );
}

export default ColorGradingPreviewTool;
