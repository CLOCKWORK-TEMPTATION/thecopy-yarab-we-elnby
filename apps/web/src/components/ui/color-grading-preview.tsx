"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Palette,
  Sun,
  Contrast,
  Droplets,
  Thermometer,
  RotateCcw,
  Copy,
  Check,
  Film,
  Wand2,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Color Grading Preview Component for Cinematography Studio
 * Based on UI_DESIGN_SUGGESTIONS.md
 *
 * Features:
 * - Real-time color grading preview
 * - Famous film LUT presets
 * - Color wheels (Shadows, Midtones, Highlights)
 * - Lift/Gamma/Gain controls
 * - Saturation and contrast
 * - Before/After comparison
 * - Export color settings
 */

interface ColorGrade {
  temperature: number; // -100 to 100 (warm/cool)
  tint: number; // -100 to 100 (green/magenta)
  exposure: number; // -2 to 2 stops
  contrast: number; // 0 to 200
  highlights: number; // -100 to 100
  shadows: number; // -100 to 100
  saturation: number; // 0 to 200
  vibrance: number; // 0 to 200
  // Color wheels (hue shift)
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

interface ColorGradingPreviewProps {
  className?: string;
  onGradeChange?: (grade: ColorGrade) => void;
}

// Famous film LUT presets
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

export function ColorGradingPreview({
  className,
  onGradeChange,
}: ColorGradingPreviewProps) {
  const [grade, setGrade] = React.useState<ColorGrade>(DEFAULT_GRADE);
  const [selectedPreset, setSelectedPreset] = React.useState<string>("neutral");
  const [showOriginal, setShowOriginal] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  // Apply preset
  const applyPreset = (presetId: string) => {
    const preset = LUT_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setGrade({ ...DEFAULT_GRADE, ...preset.grade });
      setSelectedPreset(presetId);
    }
  };

  // Update single grade value
  const updateGrade = (key: keyof ColorGrade, value: number) => {
    setGrade((prev) => ({ ...prev, [key]: value }));
    setSelectedPreset(""); // Clear preset when manually adjusting
  };

  // Reset to default
  const resetGrade = () => {
    setGrade(DEFAULT_GRADE);
    setSelectedPreset("neutral");
  };

  // Generate CSS filter string
  const generateFilter = React.useMemo(() => {
    if (showOriginal) return "none";

    const filters = [
      `brightness(${1 + grade.exposure / 4})`,
      `contrast(${grade.contrast / 100})`,
      `saturate(${grade.saturation / 100})`,
      grade.temperature > 0
        ? `sepia(${grade.temperature / 200})`
        : `hue-rotate(${grade.temperature * 2}deg)`,
    ];

    return filters.join(" ");
  }, [grade, showOriginal]);

  // Generate color overlay style
  const generateOverlay = React.useMemo(() => {
    if (showOriginal) return {};

    const shadowColor = `hsl(${grade.shadowHue}, 50%, 20%)`;
    const highlightColor = `hsl(${grade.highlightHue}, 40%, 80%)`;

    return {
      background: `linear-gradient(
        to bottom,
        ${highlightColor}${Math.floor((100 - grade.highlights) * 0.2)
          .toString(16)
          .padStart(2, "0")},
        transparent 30%,
        transparent 70%,
        ${shadowColor}${Math.floor((100 + grade.shadows) * 0.3)
          .toString(16)
          .padStart(2, "0")}
      )`,
      mixBlendMode: "soft-light" as const,
    };
  }, [grade, showOriginal]);

  // Copy grade settings
  const copySettings = () => {
    const settings = JSON.stringify(grade, null, 2);
    navigator.clipboard.writeText(settings);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Notify parent of changes
  React.useEffect(() => {
    onGradeChange?.(grade);
  }, [grade, onGradeChange]);

  return (
    <TooltipProvider>
      <div className={cn("color-grading-preview space-y-6", className)}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-white">
              <Palette className="h-5 w-5 text-amber-500" />
              معاينة التدرج اللوني
            </h2>
            <p className="text-sm text-zinc-400">Color Grading Preview</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowOriginal(!showOriginal)}
              className="border-zinc-700"
            >
              {showOriginal ? (
                <Eye className="h-4 w-4 ml-2" />
              ) : (
                <EyeOff className="h-4 w-4 ml-2" />
              )}
              {showOriginal ? "معالج" : "أصلي"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={copySettings}
              className="border-zinc-700"
            >
              {copied ? (
                <Check className="h-4 w-4 ml-2 text-green-500" />
              ) : (
                <Copy className="h-4 w-4 ml-2" />
              )}
              نسخ
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Preview */}
          <Card className="lg:col-span-2 bg-zinc-900 border-zinc-800 overflow-hidden">
            <CardContent className="p-0">
              <div className="relative aspect-video bg-black overflow-hidden">
                {/* Sample image with grading applied */}
                <div
                  className="absolute inset-0 transition-all duration-300"
                  style={{
                    background: `
                      linear-gradient(135deg,
                        hsl(${200 + grade.temperature}, 40%, 30%) 0%,
                        hsl(${30 + grade.temperature}, 50%, 40%) 50%,
                        hsl(${280 + grade.temperature}, 30%, 20%) 100%
                      )
                    `,
                    filter: generateFilter,
                  }}
                >
                  {/* Simulated scene elements */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="grid grid-cols-3 gap-4 p-8 w-full max-w-2xl">
                      {/* Shadow zone */}
                      <div className="aspect-square rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-900 shadow-lg" />
                      {/* Midtone zone */}
                      <div className="aspect-square rounded-lg bg-gradient-to-br from-zinc-500 to-zinc-600 shadow-lg" />
                      {/* Highlight zone */}
                      <div className="aspect-square rounded-lg bg-gradient-to-br from-zinc-200 to-zinc-100 shadow-lg" />

                      {/* Skin tone reference */}
                      <div
                        className="aspect-square rounded-full shadow-lg col-start-2"
                        style={{
                          background: `linear-gradient(135deg,
                            hsl(${25 + grade.highlightHue * 0.2}, ${50 + grade.saturation * 0.2}%, 70%) 0%,
                            hsl(${20 + grade.shadowHue * 0.1}, ${40 + grade.saturation * 0.1}%, 50%) 100%
                          )`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Color overlay */}
                  <div className="absolute inset-0" style={generateOverlay} />
                </div>

                {/* Split comparison */}
                {showOriginal && (
                  <div className="absolute inset-0 flex">
                    <div className="w-1/2 overflow-hidden border-r-2 border-white/50">
                      <div className="absolute inset-0 bg-gradient-to-br from-zinc-600 via-amber-700/30 to-zinc-800" />
                    </div>
                    <div
                      className="w-1/2 overflow-hidden"
                      style={{
                        background: `linear-gradient(135deg,
                          hsl(${200 + grade.temperature}, 40%, 30%) 0%,
                          hsl(${30 + grade.temperature}, 50%, 40%) 50%,
                          hsl(${280 + grade.temperature}, 30%, 20%) 100%
                        )`,
                        filter: generateFilter,
                      }}
                    />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 px-3 py-1 rounded-full text-xs text-white">
                      قبل / بعد
                    </div>
                  </div>
                )}

                {/* Histogram preview */}
                <div className="absolute bottom-4 right-4 w-32 h-16 bg-black/60 rounded border border-white/10 overflow-hidden">
                  <svg className="w-full h-full" viewBox="0 0 100 40">
                    {/* Red channel */}
                    <path
                      d={`M 0 40 ${Array.from(
                        { length: 20 },
                        (_, i) =>
                          `L ${i * 5} ${40 - Math.random() * 20 - grade.highlights * 0.1}`
                      ).join(" ")} L 100 40 Z`}
                      fill="rgba(255,0,0,0.3)"
                    />
                    {/* Green channel */}
                    <path
                      d={`M 0 40 ${Array.from(
                        { length: 20 },
                        (_, i) =>
                          `L ${i * 5} ${40 - Math.random() * 25 - grade.shadows * 0.1}`
                      ).join(" ")} L 100 40 Z`}
                      fill="rgba(0,255,0,0.3)"
                    />
                    {/* Blue channel */}
                    <path
                      d={`M 0 40 ${Array.from(
                        { length: 20 },
                        (_, i) => `L ${i * 5} ${40 - Math.random() * 22}`
                      ).join(" ")} L 100 40 Z`}
                      fill="rgba(0,0,255,0.3)"
                    />
                  </svg>
                </div>

                {/* Current preset label */}
                <div className="absolute top-4 left-4">
                  {selectedPreset && (
                    <Badge className="bg-black/60 text-white border-0">
                      <Film className="h-3 w-3 ml-1" />
                      {LUT_PRESETS.find((p) => p.id === selectedPreset)?.nameAr}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Controls */}
          <div className="space-y-4">
            {/* LUT Presets */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-amber-500 flex items-center gap-2">
                  <Wand2 className="h-4 w-4" />
                  قوالب الأفلام الشهيرة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {LUT_PRESETS.map((preset) => (
                    <Tooltip key={preset.id}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => applyPreset(preset.id)}
                          className={cn(
                            "p-2 rounded-lg border text-left transition-all",
                            selectedPreset === preset.id
                              ? "bg-amber-500/20 border-amber-500"
                              : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ background: preset.primaryColor }}
                            />
                            <span className="text-xs text-zinc-200 truncate">
                              {preset.nameAr}
                            </span>
                          </div>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-xs">
                        <div className="space-y-1">
                          <p className="font-medium">{preset.name}</p>
                          {preset.film && (
                            <p className="text-xs text-muted-foreground">
                              {preset.film}
                            </p>
                          )}
                          <p className="text-xs">{preset.description}</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Basic Adjustments */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                  التعديلات الأساسية
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetGrade}
                    className="h-6 px-2"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Temperature */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-zinc-400 flex items-center gap-1">
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
                      value={[grade.temperature]}
                      min={-100}
                      max={100}
                      onValueChange={([v]) =>
                        updateGrade("temperature", v ?? grade.temperature)
                      }
                    />
                  </div>
                </div>

                {/* Contrast */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-zinc-400 flex items-center gap-1">
                      <Contrast className="h-3 w-3" />
                      التباين
                    </label>
                    <span className="text-xs font-mono text-amber-500">
                      {grade.contrast}%
                    </span>
                  </div>
                  <Slider
                    value={[grade.contrast]}
                    min={50}
                    max={200}
                    onValueChange={([v]) =>
                      updateGrade("contrast", v ?? grade.contrast)
                    }
                  />
                </div>

                {/* Saturation */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-zinc-400 flex items-center gap-1">
                      <Droplets className="h-3 w-3" />
                      التشبع
                    </label>
                    <span className="text-xs font-mono text-amber-500">
                      {grade.saturation}%
                    </span>
                  </div>
                  <Slider
                    value={[grade.saturation]}
                    min={0}
                    max={200}
                    onValueChange={([v]) =>
                      updateGrade("saturation", v ?? grade.saturation)
                    }
                  />
                </div>

                {/* Exposure */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-zinc-400 flex items-center gap-1">
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
                    value={[grade.exposure]}
                    min={-2}
                    max={2}
                    step={0.1}
                    onValueChange={([v]) =>
                      updateGrade("exposure", v ?? grade.exposure)
                    }
                  />
                </div>

                {/* Highlights/Shadows */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-zinc-400">الإضاءات</label>
                      <span className="text-xs font-mono text-amber-500">
                        {grade.highlights}
                      </span>
                    </div>
                    <Slider
                      value={[grade.highlights]}
                      min={-100}
                      max={100}
                      onValueChange={([v]) =>
                        updateGrade("highlights", v ?? grade.highlights)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-zinc-400">الظلال</label>
                      <span className="text-xs font-mono text-amber-500">
                        {grade.shadows}
                      </span>
                    </div>
                    <Slider
                      value={[grade.shadows]}
                      min={-100}
                      max={100}
                      onValueChange={([v]) =>
                        updateGrade("shadows", v ?? grade.shadows)
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Color Wheels */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-zinc-400 uppercase tracking-wider">
                  عجلات الألوان
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: "shadowHue" as const, label: "الظلال" },
                    { key: "midtoneHue" as const, label: "النصف" },
                    { key: "highlightHue" as const, label: "الإضاءات" },
                  ].map(({ key, label }) => (
                    <div key={key} className="text-center">
                      <div
                        className="w-12 h-12 mx-auto rounded-full border-2 border-zinc-700 relative cursor-pointer"
                        style={{
                          background: `conic-gradient(
                            red, yellow, lime, aqua, blue, magenta, red
                          )`,
                        }}
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = e.clientX - rect.left - rect.width / 2;
                          const y = e.clientY - rect.top - rect.height / 2;
                          const angle =
                            Math.atan2(y, x) * (180 / Math.PI) + 180;
                          updateGrade(key, Math.round(angle));
                        }}
                      >
                        <div
                          className="absolute w-3 h-3 bg-white rounded-full border-2 border-black"
                          style={{
                            left: "50%",
                            top: "50%",
                            transform: `
                              translate(-50%, -50%)
                              rotate(${grade[key]}deg)
                              translateY(-18px)
                            `,
                          }}
                        />
                      </div>
                      <span className="text-xs text-zinc-500 mt-1 block">
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default ColorGradingPreview;
