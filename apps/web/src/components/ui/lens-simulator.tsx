"use client";

import {
  Camera,
  Circle,
  Maximize2,
  Move,
  Sparkles,
  ZoomIn,
  RotateCcw,
  Info,
  Aperture,
  Sun,
  Moon,
} from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Lens Simulator Component for Cinematography Studio
 * Based on UI_DESIGN_SUGGESTIONS.md
 *
 * Features:
 * - Focal length simulation (14mm - 200mm)
 * - Aperture control (f/1.4 - f/22)
 * - Field of View visualization
 * - Lens distortion preview
 * - Bokeh simulation
 * - Famous lens presets
 */

interface LensPreset {
  id: string;
  name: string;
  nameAr: string;
  brand: string;
  focalLength: number;
  maxAperture: number;
  characteristics: string[];
  famousFilms?: string[];
}

interface LensSimulatorProps {
  className?: string;
  onLensChange?: (lens: {
    focalLength: number;
    aperture: number;
    distortion: number;
  }) => void;
}

// Famous cinema lenses presets
const LENS_PRESETS: LensPreset[] = [
  {
    id: "cooke-s4",
    name: "Cooke S4/i",
    nameAr: "كوك S4",
    brand: "Cooke",
    focalLength: 50,
    maxAperture: 2.0,
    characteristics: ["Warm tones", "Soft highlights", "Gentle bokeh"],
    famousFilms: ["The King's Speech", "Gravity"],
  },
  {
    id: "zeiss-master-prime",
    name: "Zeiss Master Prime",
    nameAr: "زايس ماستر برايم",
    brand: "Zeiss",
    focalLength: 35,
    maxAperture: 1.4,
    characteristics: [
      "Clinical sharpness",
      "Minimal distortion",
      "Clean bokeh",
    ],
    famousFilms: ["Skyfall", "Inglourious Basterds"],
  },
  {
    id: "panavision-primo",
    name: "Panavision Primo",
    nameAr: "بانافيجن بريمو",
    brand: "Panavision",
    focalLength: 75,
    maxAperture: 1.9,
    characteristics: ["Rich colors", "Smooth focus fall-off", "Classic look"],
    famousFilms: ["The Dark Knight", "Inception"],
  },
  {
    id: "arri-signature",
    name: "ARRI Signature Prime",
    nameAr: "آري سيجنتشر",
    brand: "ARRI",
    focalLength: 40,
    maxAperture: 1.8,
    characteristics: [
      "Modern rendering",
      "Pleasing skin tones",
      "Large coverage",
    ],
    famousFilms: ["1917", "Joker"],
  },
  {
    id: "anamorphic-hawk",
    name: "Hawk V-Lite Anamorphic",
    nameAr: "هوك أنامورفيك",
    brand: "Vantage",
    focalLength: 50,
    maxAperture: 2.2,
    characteristics: ["Horizontal flares", "Oval bokeh", "2.39:1 aspect"],
    famousFilms: ["La La Land", "Blade Runner 2049"],
  },
  {
    id: "vintage-super-baltar",
    name: "Super Baltar",
    nameAr: "سوبر بالتار",
    brand: "Bausch & Lomb",
    focalLength: 25,
    maxAperture: 2.0,
    characteristics: ["Vintage character", "Soft edges", "Warm flares"],
    famousFilms: ["The Godfather", "Apocalypse Now"],
  },
];

// Calculate field of view based on focal length and sensor size
const calculateFOV = (focalLength: number, sensorWidth = 36): number => {
  return 2 * Math.atan(sensorWidth / (2 * focalLength)) * (180 / Math.PI);
};

// Get lens type description
const getLensType = (
  focalLength: number
): { type: string; typeAr: string; description: string } => {
  if (focalLength <= 20)
    return {
      type: "Ultra Wide",
      typeAr: "عريضة جداً",
      description: "مثالية للمناظر الطبيعية والمساحات الضيقة",
    };
  if (focalLength <= 35)
    return {
      type: "Wide",
      typeAr: "عريضة",
      description: "ممتازة للمشاهد الواسعة والبيئات",
    };
  if (focalLength <= 60)
    return {
      type: "Standard",
      typeAr: "قياسية",
      description: "تحاكي رؤية العين البشرية",
    };
  if (focalLength <= 100)
    return {
      type: "Portrait",
      typeAr: "بورتريه",
      description: "مثالية للوجوه والتفاصيل",
    };
  return {
    type: "Telephoto",
    typeAr: "تيليفوتو",
    description: "ضغط المسافات والعزل",
  };
};

export function LensSimulator({ className, onLensChange }: LensSimulatorProps) {
  const [focalLength, setFocalLength] = React.useState(50);
  const [aperture, setAperture] = React.useState(2.8);
  const [distortion, setDistortion] = React.useState(0);
  const [selectedPreset, setSelectedPreset] = React.useState<string | null>(
    null
  );
  const [showBokeh, setShowBokeh] = React.useState(true);
  const [isAnamorphic, setIsAnamorphic] = React.useState(false);

  const fov = calculateFOV(focalLength);
  const lensType = getLensType(focalLength);

  // Apply preset
  const applyPreset = (presetId: string) => {
    const preset = LENS_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setFocalLength(preset.focalLength);
      setAperture(preset.maxAperture);
      setSelectedPreset(presetId);
      setIsAnamorphic(presetId.includes("anamorphic"));
      setDistortion(
        presetId.includes("vintage")
          ? 5
          : presetId.includes("anamorphic")
            ? 8
            : 0
      );
    }
  };

  // Notify parent of changes
  React.useEffect(() => {
    onLensChange?.({ focalLength, aperture, distortion });
  }, [focalLength, aperture, distortion, onLensChange]);

  return (
    <TooltipProvider>
      <div className={cn("lens-simulator space-y-6", className)}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-white">
              <Camera className="h-5 w-5 text-amber-500" />
              محاكي العدسات السينمائية
            </h2>
            <p className="text-sm text-zinc-400">Lens Simulator</p>
          </div>
          <Badge
            variant="outline"
            className="border-amber-500/50 text-amber-400"
          >
            {lensType.typeAr} - {lensType.type}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Preview */}
          <Card className="lg:col-span-2 bg-zinc-900 border-zinc-800 overflow-hidden">
            <CardContent className="p-0">
              {/* Lens Viewport */}
              <div
                className="relative aspect-video bg-black flex items-center justify-center overflow-hidden"
                style={{
                  perspective: "1000px",
                }}
              >
                {/* Grid overlay */}
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: `
                      linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                    `,
                    backgroundSize: "10% 10%",
                  }}
                />

                {/* Field of View visualization */}
                <div
                  className="absolute inset-0 border-4 border-amber-500/30 transition-all duration-300"
                  style={{
                    transform: `scale(${fov / 100})`,
                    borderRadius: distortion > 0 ? `${distortion * 5}%` : "0",
                  }}
                />

                {/* Center frame */}
                <div
                  className="relative border-2 border-amber-500/50 transition-all duration-500 flex items-center justify-center"
                  style={{
                    width: `${Math.max(30, 100 - focalLength / 2)}%`,
                    height: isAnamorphic
                      ? "42%"
                      : `${Math.max(30, 100 - focalLength / 2)}%`,
                    borderRadius: distortion > 0 ? `${distortion * 2}%` : "0",
                    transform: `perspective(500px) rotateX(${distortion}deg)`,
                  }}
                >
                  {/* Bokeh circles */}
                  {showBokeh && aperture < 4 && (
                    <>
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className="absolute rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/10 blur-sm"
                          style={{
                            width: `${30 / aperture + i * 10}px`,
                            height: isAnamorphic
                              ? `${(30 / aperture + i * 10) * 0.6}px`
                              : `${30 / aperture + i * 10}px`,
                            left: `${20 + i * 15}%`,
                            top: `${10 + i * 18}%`,
                            opacity: 0.3 + (1 / aperture) * 0.3,
                          }}
                        />
                      ))}
                    </>
                  )}

                  {/* Center crosshair */}
                  <div className="relative w-8 h-8">
                    <div className="absolute w-full h-0.5 bg-amber-500/50 top-1/2 -translate-y-1/2" />
                    <div className="absolute h-full w-0.5 bg-amber-500/50 left-1/2 -translate-x-1/2" />
                    <Circle className="absolute inset-0 text-amber-500/30" />
                  </div>
                </div>

                {/* Anamorphic flare */}
                {isAnamorphic && (
                  <div
                    className="absolute w-full h-1 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent blur-sm"
                    style={{ top: "50%", transform: "translateY(-50%)" }}
                  />
                )}

                {/* Lens info overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                  <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                    <div className="flex items-center gap-4">
                      <span className="text-amber-500">{focalLength}mm</span>
                      <span>f/{aperture.toFixed(1)}</span>
                      <span>FOV: {fov.toFixed(1)}°</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isAnamorphic && (
                        <Badge className="bg-cyan-500/20 text-cyan-400 text-xs">
                          2.39:1 Anamorphic
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Corner vignette */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,${aperture > 8 ? 0.3 : 0.5}) 100%)`,
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Controls */}
          <div className="space-y-4">
            {/* Presets */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-amber-500 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  عدسات سينمائية شهيرة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Select
                  value={selectedPreset ?? ""}
                  onValueChange={applyPreset}
                >
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-100">
                    <SelectValue placeholder="اختر عدسة..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {LENS_PRESETS.map((preset) => (
                      <SelectItem
                        key={preset.id}
                        value={preset.id}
                        className="text-zinc-100 focus:bg-amber-500/20"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{preset.name}</span>
                          <span className="text-xs text-zinc-500">
                            {preset.focalLength}mm f/{preset.maxAperture}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedPreset && (
                  <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 space-y-2 animate-in fade-in">
                    {(() => {
                      const preset = LENS_PRESETS.find(
                        (p) => p.id === selectedPreset
                      );
                      if (!preset) return null;
                      return (
                        <>
                          <div className="flex flex-wrap gap-1">
                            {preset.characteristics.map((char, i) => (
                              <Badge
                                key={i}
                                variant="secondary"
                                className="text-xs bg-zinc-800 text-zinc-300"
                              >
                                {char}
                              </Badge>
                            ))}
                          </div>
                          {preset.famousFilms && (
                            <p className="text-xs text-zinc-500">
                              <span className="text-amber-500">أفلام:</span>{" "}
                              {preset.famousFilms.join(", ")}
                            </p>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Manual Controls */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-zinc-400 uppercase tracking-wider">
                  التحكم اليدوي
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Focal Length */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-zinc-300 flex items-center gap-2">
                      <ZoomIn className="h-4 w-4 text-amber-500" />
                      البعد البؤري
                    </label>
                    <span className="text-amber-500 font-mono text-sm">
                      {focalLength}mm
                    </span>
                  </div>
                  <Slider
                    value={[focalLength]}
                    min={14}
                    max={200}
                    step={1}
                    onValueChange={([v]) => {
                      if (v !== undefined) {
                        setFocalLength(v);
                        setSelectedPreset(null);
                      }
                    }}
                    className="cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-zinc-600">
                    <span>14mm</span>
                    <span className="text-zinc-500">
                      {lensType.description}
                    </span>
                    <span>200mm</span>
                  </div>
                </div>

                {/* Aperture */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-zinc-300 flex items-center gap-2">
                      <Aperture className="h-4 w-4 text-amber-500" />
                      فتحة العدسة
                    </label>
                    <span className="text-amber-500 font-mono text-sm">
                      f/{aperture.toFixed(1)}
                    </span>
                  </div>
                  <Slider
                    value={[aperture]}
                    min={1.4}
                    max={22}
                    step={0.1}
                    onValueChange={([v]) => v !== undefined && setAperture(v)}
                    className="cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-zinc-600">
                    <span className="flex items-center gap-1">
                      <Sun className="h-3 w-3" /> f/1.4
                    </span>
                    <span className="flex items-center gap-1">
                      f/22 <Moon className="h-3 w-3" />
                    </span>
                  </div>
                </div>

                {/* Distortion */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-zinc-300 flex items-center gap-2">
                      <Move className="h-4 w-4 text-amber-500" />
                      التشوه
                    </label>
                    <span className="text-amber-500 font-mono text-sm">
                      {distortion}%
                    </span>
                  </div>
                  <Slider
                    value={[distortion]}
                    min={0}
                    max={20}
                    step={1}
                    onValueChange={([v]) => v !== undefined && setDistortion(v)}
                    className="cursor-pointer"
                  />
                </div>

                {/* Toggles */}
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant={showBokeh ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setShowBokeh(!showBokeh)}
                    className="text-xs"
                  >
                    <Circle className="h-3 w-3 ml-1" />
                    Bokeh
                  </Button>
                  <Button
                    variant={isAnamorphic ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setIsAnamorphic(!isAnamorphic)}
                    className="text-xs"
                  >
                    <Maximize2 className="h-3 w-3 ml-1" />
                    Anamorphic
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFocalLength(50);
                      setAperture(2.8);
                      setDistortion(0);
                      setSelectedPreset(null);
                      setIsAnamorphic(false);
                    }}
                    className="text-xs ml-auto"
                  >
                    <RotateCcw className="h-3 w-3 ml-1" />
                    إعادة
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="bg-amber-500/10 border-amber-500/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div className="text-sm text-zinc-300 space-y-1">
                    <p className="font-medium text-amber-400">نصيحة احترافية</p>
                    <p className="text-xs text-zinc-400">
                      العدسات ذات الفتحة الكبيرة (f/1.4-2.8) تعطي عمق ميدان ضحل
                      وبوكيه جميل - مثالية للمشاهد الرومانسية والدرامية.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default LensSimulator;
