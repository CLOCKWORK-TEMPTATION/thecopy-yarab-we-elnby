"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Focus,
  Camera,
  Aperture,
  Ruler,
  Target,
  Layers,
  ZoomIn,
  RotateCcw,
  BookOpen,
} from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * Depth of Field Calculator Component for Cinematography Studio
 * Based on UI_DESIGN_SUGGESTIONS.md
 *
 * Features:
 * - Calculate DOF based on sensor, focal length, aperture, distance
 * - Visual DOF preview
 * - Camera/sensor presets
 * - Near/far focus limits
 * - Hyperfocal distance
 * - Circle of confusion
 */

interface SensorPreset {
  id: string;
  name: string;
  nameAr: string;
  width: number; // mm
  height: number; // mm
  cropFactor: number;
  circleOfConfusion: number; // mm
}

interface DOFResult {
  nearLimit: number; // meters
  farLimit: number; // meters
  totalDOF: number; // meters
  hyperfocal: number; // meters
  circleOfConfusion: number; // mm
  inFront: number; // meters in front of subject
  behind: number; // meters behind subject
}

interface DOFCalculatorProps {
  className?: string;
  onCalculate?: (result: DOFResult) => void;
}

// Common cinema sensor presets
const SENSOR_PRESETS: SensorPreset[] = [
  {
    id: "full-frame",
    name: "Full Frame",
    nameAr: "إطار كامل",
    width: 36,
    height: 24,
    cropFactor: 1,
    circleOfConfusion: 0.029,
  },
  {
    id: "super35",
    name: "Super 35mm",
    nameAr: "سوبر 35",
    width: 24.89,
    height: 18.66,
    cropFactor: 1.4,
    circleOfConfusion: 0.019,
  },
  {
    id: "arri-alexa-lf",
    name: "ARRI ALEXA LF",
    nameAr: "آري أليكسا LF",
    width: 36.7,
    height: 25.54,
    cropFactor: 0.98,
    circleOfConfusion: 0.029,
  },
  {
    id: "arri-alexa-35",
    name: "ARRI ALEXA 35",
    nameAr: "آري أليكسا 35",
    width: 27.99,
    height: 19.22,
    cropFactor: 1.28,
    circleOfConfusion: 0.022,
  },
  {
    id: "red-monstro",
    name: "RED Monstro 8K",
    nameAr: "ريد مونسترو",
    width: 40.96,
    height: 21.6,
    cropFactor: 0.88,
    circleOfConfusion: 0.033,
  },
  {
    id: "red-komodo",
    name: "RED Komodo",
    nameAr: "ريد كومودو",
    width: 27.03,
    height: 14.26,
    cropFactor: 1.33,
    circleOfConfusion: 0.021,
  },
  {
    id: "sony-venice",
    name: "Sony Venice",
    nameAr: "سوني فينيس",
    width: 36,
    height: 24,
    cropFactor: 1,
    circleOfConfusion: 0.029,
  },
  {
    id: "blackmagic-ursa",
    name: "Blackmagic URSA 12K",
    nameAr: "بلاك ماجيك",
    width: 33.78,
    height: 23.22,
    cropFactor: 1.06,
    circleOfConfusion: 0.027,
  },
  {
    id: "aps-c",
    name: "APS-C",
    nameAr: "APS-C",
    width: 23.5,
    height: 15.6,
    cropFactor: 1.5,
    circleOfConfusion: 0.018,
  },
  {
    id: "micro-43",
    name: "Micro 4/3",
    nameAr: "مايكرو 4/3",
    width: 17.3,
    height: 13,
    cropFactor: 2,
    circleOfConfusion: 0.015,
  },
];

// Calculate DOF
const calculateDOF = (
  focalLength: number, // mm
  aperture: number,
  distance: number, // meters
  coc: number // mm
): DOFResult => {
  const focalLengthM = focalLength / 1000;
  const cocM = coc / 1000;

  // Hyperfocal distance
  const hyperfocal =
    (focalLengthM * focalLengthM) / (aperture * cocM) + focalLengthM;

  // Near focus limit
  const nearLimit =
    (hyperfocal * distance) / (hyperfocal + (distance - focalLengthM));

  // Far focus limit
  let farLimit: number;
  if (distance >= hyperfocal) {
    farLimit = Infinity;
  } else {
    farLimit =
      (hyperfocal * distance) / (hyperfocal - (distance - focalLengthM));
  }

  // Total DOF
  const totalDOF = farLimit === Infinity ? Infinity : farLimit - nearLimit;

  // In front and behind subject
  const inFront = distance - nearLimit;
  const behind = farLimit === Infinity ? Infinity : farLimit - distance;

  return {
    nearLimit: Math.max(0, nearLimit),
    farLimit,
    totalDOF,
    hyperfocal,
    circleOfConfusion: coc,
    inFront,
    behind,
  };
};

// Format distance for display
const formatDistance = (meters: number): string => {
  if (!isFinite(meters)) return "∞";
  if (meters < 1) return `${(meters * 100).toFixed(0)} سم`;
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} كم`;
  return `${meters.toFixed(2)} م`;
};

export function DOFCalculator({ className, onCalculate }: DOFCalculatorProps) {
  const [sensorId, setSensorId] = React.useState("super35");
  const [focalLength, setFocalLength] = React.useState(50);
  const [aperture, setAperture] = React.useState(2.8);
  const [distance, setDistance] = React.useState(3); // meters
  const [result, setResult] = React.useState<DOFResult | null>(null);

  const selectedSensor =
    SENSOR_PRESETS.find((s) => s.id === sensorId) ??
    SENSOR_PRESETS[1] ??
    SENSOR_PRESETS[0]!;

  // Calculate DOF when parameters change
  React.useEffect(() => {
    const dofResult = calculateDOF(
      focalLength,
      aperture,
      distance,
      selectedSensor.circleOfConfusion
    );
    setResult(dofResult);
    onCalculate?.(dofResult);
  }, [focalLength, aperture, distance, selectedSensor, onCalculate]);

  // Reset to defaults
  const reset = () => {
    setSensorId("super35");
    setFocalLength(50);
    setAperture(2.8);
    setDistance(3);
  };

  // Calculate visual representation percentages
  const visualNear = result
    ? Math.min(100, (result.nearLimit / (distance * 2)) * 100)
    : 0;
  const visualFar = result
    ? Math.min(100, (result.farLimit / (distance * 2)) * 100)
    : 100;
  const visualSubject = 50; // Subject always at 50% (center)

  return (
    <TooltipProvider>
      <div className={cn("dof-calculator space-y-6", className)}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-white">
              <Focus className="h-5 w-5 text-amber-500" />
              حاسبة عمق الميدان
            </h2>
            <p className="text-sm text-zinc-400">Depth of Field Calculator</p>
          </div>
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="h-4 w-4 ml-2" />
            إعادة
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Visual Preview */}
          <Card className="lg:col-span-2 bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <Layers className="h-4 w-4" />
                معاينة عمق الميدان
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* DOF Visualization */}
              <div className="relative h-48 bg-gradient-to-b from-zinc-950 to-zinc-900 rounded-lg overflow-hidden mb-6">
                {/* Background blur gradient */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(to right,
                      rgba(0,0,0,0.8) 0%,
                      rgba(0,0,0,0.8) ${visualNear}%,
                      transparent ${visualNear + 5}%,
                      transparent ${visualFar - 5}%,
                      rgba(0,0,0,0.8) ${visualFar}%,
                      rgba(0,0,0,0.8) 100%
                    )`,
                  }}
                />

                {/* Focus plane indicator */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-amber-500"
                  style={{ left: `${visualSubject}%` }}
                >
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-amber-500 rounded-full" />
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-amber-500 rounded-full" />
                </div>

                {/* Near limit line */}
                {result && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-blue-500/50 border-l border-dashed border-blue-500"
                    style={{ left: `${visualNear}%` }}
                  >
                    <div className="absolute top-2 left-2 text-xs text-blue-400 whitespace-nowrap">
                      {formatDistance(result.nearLimit)}
                    </div>
                  </div>
                )}

                {/* Far limit line */}
                {result && result.farLimit !== Infinity && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-green-500/50 border-l border-dashed border-green-500"
                    style={{ left: `${Math.min(95, visualFar)}%` }}
                  >
                    <div className="absolute top-2 right-2 text-xs text-green-400 whitespace-nowrap">
                      {formatDistance(result.farLimit)}
                    </div>
                  </div>
                )}

                {/* Sharp zone indicator */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-16 bg-gradient-to-r from-blue-500/20 via-amber-500/30 to-green-500/20 border-y border-amber-500/30"
                  style={{
                    left: `${visualNear}%`,
                    width: `${Math.min(100 - visualNear, visualFar - visualNear)}%`,
                  }}
                />

                {/* Camera icon */}
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <Camera className="h-8 w-8 text-zinc-600" />
                </div>

                {/* Subject indicator */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                  style={{ left: `${visualSubject}%` }}
                >
                  <Target className="h-10 w-10 text-amber-500" />
                </div>

                {/* Distance markers */}
                <div className="absolute bottom-2 left-0 right-0 flex justify-between px-4 text-xs text-zinc-600">
                  <span>0م</span>
                  <span className="text-amber-500">{distance.toFixed(1)}م</span>
                  <span>{(distance * 2).toFixed(0)}م+</span>
                </div>
              </div>

              {/* Results Grid */}
              {result && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="text-xs text-zinc-400">
                        عمق الميدان الكلي
                      </span>
                    </div>
                    <p className="text-lg font-bold text-white">
                      {formatDistance(result.totalDOF)}
                    </p>
                  </div>

                  <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-xs text-zinc-400">أمام الهدف</span>
                    </div>
                    <p className="text-lg font-bold text-white">
                      {formatDistance(result.inFront)}
                    </p>
                  </div>

                  <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-xs text-zinc-400">خلف الهدف</span>
                    </div>
                    <p className="text-lg font-bold text-white">
                      {formatDistance(result.behind)}
                    </p>
                  </div>

                  <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500" />
                      <span className="text-xs text-zinc-400">
                        المسافة الهايبرفوكال
                      </span>
                    </div>
                    <p className="text-lg font-bold text-white">
                      {formatDistance(result.hyperfocal)}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Controls */}
          <div className="space-y-4">
            {/* Camera Sensor */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-amber-500 flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  الكاميرا / السينسور
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={sensorId} onValueChange={setSensorId}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {SENSOR_PRESETS.map((sensor) => (
                      <SelectItem
                        key={sensor.id}
                        value={sensor.id}
                        className="text-zinc-100 focus:bg-amber-500/20"
                      >
                        <div className="flex items-center gap-2">
                          <span>{sensor.nameAr}</span>
                          <span className="text-xs text-zinc-500">
                            ({sensor.width}×{sensor.height}mm)
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedSensor && (
                  <div className="mt-3 p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-zinc-500">حجم السينسور:</span>
                        <p className="text-zinc-300">
                          {selectedSensor.width}×{selectedSensor.height}mm
                        </p>
                      </div>
                      <div>
                        <span className="text-zinc-500">عامل القص:</span>
                        <p className="text-zinc-300">
                          {selectedSensor.cropFactor}x
                        </p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-zinc-500">دائرة الارتباك:</span>
                        <p className="text-zinc-300">
                          {selectedSensor.circleOfConfusion}mm
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Parameters */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-zinc-400 uppercase tracking-wider">
                  إعدادات العدسة
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
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={focalLength}
                        onChange={(e) => setFocalLength(Number(e.target.value))}
                        className="w-20 h-7 bg-zinc-950 border-zinc-800 text-center text-amber-500"
                      />
                      <span className="text-xs text-zinc-500">mm</span>
                    </div>
                  </div>
                  <Slider
                    value={[focalLength]}
                    min={14}
                    max={200}
                    step={1}
                    onValueChange={([v]) =>
                      v !== undefined && setFocalLength(v)
                    }
                  />
                  <div className="flex justify-between text-xs text-zinc-600">
                    <span>14mm</span>
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
                    <span className="text-amber-500 font-mono">
                      f/{aperture.toFixed(1)}
                    </span>
                  </div>
                  <Slider
                    value={[aperture]}
                    min={1.4}
                    max={22}
                    step={0.1}
                    onValueChange={([v]) => v !== undefined && setAperture(v)}
                  />
                  <div className="flex justify-between text-xs text-zinc-600">
                    <span>f/1.4 (ضحل)</span>
                    <span>f/22 (عميق)</span>
                  </div>
                </div>

                {/* Subject Distance */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-zinc-300 flex items-center gap-2">
                      <Ruler className="h-4 w-4 text-amber-500" />
                      مسافة الهدف
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={distance}
                        onChange={(e) => setDistance(Number(e.target.value))}
                        step={0.1}
                        className="w-20 h-7 bg-zinc-950 border-zinc-800 text-center text-amber-500"
                      />
                      <span className="text-xs text-zinc-500">م</span>
                    </div>
                  </div>
                  <Slider
                    value={[distance]}
                    min={0.3}
                    max={50}
                    step={0.1}
                    onValueChange={([v]) => v !== undefined && setDistance(v)}
                  />
                  <div className="flex justify-between text-xs text-zinc-600">
                    <span>30سم</span>
                    <span>50م</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tips */}
            <Card className="bg-amber-500/10 border-amber-500/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <BookOpen className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div className="text-sm text-zinc-300 space-y-2">
                    <p className="font-medium text-amber-400">نصائح للتصوير</p>
                    <ul className="text-xs text-zinc-400 space-y-1">
                      <li>
                        • فتحة أكبر (f/1.4-2.8) = عمق ميدان ضحل = خلفية ضبابية
                      </li>
                      <li>• فتحة أصغر (f/8-16) = عمق ميدان عميق = وضوح أكثر</li>
                      <li>• البعد البؤري الأطول = عمق ميدان أضيق</li>
                      <li>• المسافة الأقرب = عمق ميدان أضيق</li>
                    </ul>
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

export default DOFCalculator;
