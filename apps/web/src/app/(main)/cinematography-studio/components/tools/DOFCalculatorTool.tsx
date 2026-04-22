"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Aperture,
  BookOpen,
  Camera,
  RotateCcw,
  Ruler,
  Target,
  ZoomIn,
} from "lucide-react";
import SliderNumberInput from "../controls/SliderNumberInput";
import { StudioMetricCell, StudioPanel } from "../studio-ui";

interface SensorPreset {
  id: string;
  name: string;
  nameAr: string;
  width: number;
  height: number;
  cropFactor: number;
  circleOfConfusion: number;
}

interface DOFResult {
  nearLimit: number;
  farLimit: number;
  totalDOF: number;
  hyperfocal: number;
  circleOfConfusion: number;
  inFront: number;
  behind: number;
}

interface DOFCalculatorToolProps {
  className?: string;
  onCalculate?: (result: DOFResult) => void;
}

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

function calculateDOF(
  focalLength: number,
  aperture: number,
  distance: number,
  coc: number
): DOFResult {
  const focalLengthM = focalLength / 1000;
  const cocM = coc / 1000;
  const hyperfocal =
    (focalLengthM * focalLengthM) / (aperture * cocM) + focalLengthM;
  const nearLimit =
    (hyperfocal * distance) / (hyperfocal + (distance - focalLengthM));

  const farLimit =
    distance >= hyperfocal
      ? Number.POSITIVE_INFINITY
      : (hyperfocal * distance) / (hyperfocal - (distance - focalLengthM));
  const totalDOF =
    farLimit === Number.POSITIVE_INFINITY
      ? Number.POSITIVE_INFINITY
      : farLimit - nearLimit;
  const inFront = distance - nearLimit;
  const behind =
    farLimit === Number.POSITIVE_INFINITY
      ? Number.POSITIVE_INFINITY
      : farLimit - distance;

  return {
    nearLimit: Math.max(0, nearLimit),
    farLimit,
    totalDOF,
    hyperfocal,
    circleOfConfusion: coc,
    inFront,
    behind,
  };
}

function formatDistance(meters: number): string {
  if (!Number.isFinite(meters)) {
    return "∞";
  }

  if (meters < 1) {
    return `${(meters * 100).toFixed(0)} سم`;
  }

  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} كم`;
  }

  return `${meters.toFixed(2)} م`;
}

export function DOFCalculatorTool({
  className,
  onCalculate,
}: DOFCalculatorToolProps) {
  const [sensorId, setSensorId] = React.useState("super35");
  const [focalLength, setFocalLength] = React.useState(50);
  const [aperture, setAperture] = React.useState(2.8);
  const [distance, setDistance] = React.useState(3);

  const selectedSensor = React.useMemo(
    () =>
      SENSOR_PRESETS.find((sensor) => sensor.id === sensorId) ??
      SENSOR_PRESETS[1] ??
      SENSOR_PRESETS[0]!,
    [sensorId]
  );

  const result = React.useMemo(
    () =>
      calculateDOF(
        focalLength,
        aperture,
        distance,
        selectedSensor.circleOfConfusion
      ),
    [aperture, distance, focalLength, selectedSensor.circleOfConfusion]
  );

  const visualNear = React.useMemo(
    () => Math.min(100, (result.nearLimit / Math.max(distance * 2, 0.1)) * 100),
    [distance, result.nearLimit]
  );

  const visualFar = React.useMemo(() => {
    if (!Number.isFinite(result.farLimit)) {
      return 100;
    }

    return Math.min(100, (result.farLimit / Math.max(distance * 2, 0.1)) * 100);
  }, [distance, result.farLimit]);

  React.useEffect(() => {
    onCalculate?.(result);
  }, [onCalculate, result]);

  const reset = React.useCallback(() => {
    setSensorId("super35");
    setFocalLength(50);
    setAperture(2.8);
    setDistance(3);
  }, []);

  return (
    <TooltipProvider>
      <div
        className={cn(
          "grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]",
          className
        )}
      >
        <div className="space-y-4">
          <StudioPanel
            title="Depth Of Field Monitor"
            subtitle="معاينة المجال الفعلي للتركيز داخل الكادر"
            headerRight={
              <Button
                type="button"
                variant="outline"
                onClick={reset}
                className="border-[#343434] bg-[#0d0d0d] text-[#c6b999] hover:bg-[#171717]"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                إعادة
              </Button>
            }
          >
            <div className="space-y-4">
              <div className="relative min-h-[420px] overflow-hidden rounded-[10px] border border-[#343434] bg-[radial-gradient(circle_at_top,rgba(229,181,79,0.08),transparent_24%),linear-gradient(180deg,#0a0a0a_0%,#030303_100%)]">
                <div className="absolute inset-[10%] border border-[#e5b54f]/30">
                  <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[#e5b54f]/25" />
                  <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-[#e5b54f]/25" />
                </div>

                <div
                  className="absolute top-0 bottom-0 w-px border-l border-dashed border-[#7ab7ff]"
                  style={{ left: `${visualNear}%` }}
                >
                  <div className="absolute top-4 left-2 text-[11px] text-[#7ab7ff]">
                    {formatDistance(result.nearLimit)}
                  </div>
                </div>

                {Number.isFinite(result.farLimit) ? (
                  <div
                    className="absolute top-0 bottom-0 w-px border-l border-dashed border-[#7ee08f]"
                    style={{ left: `${Math.min(95, visualFar)}%` }}
                  >
                    <div className="absolute top-4 right-2 text-[11px] text-[#7ee08f]">
                      {formatDistance(result.farLimit)}
                    </div>
                  </div>
                ) : null}

                <div
                  className="absolute top-1/2 h-16 -translate-y-1/2 border-y border-[#e5b54f]/25 bg-[#e5b54f]/12"
                  style={{
                    left: `${visualNear}%`,
                    width: `${Math.max(4, Math.min(100 - visualNear, visualFar - visualNear))}%`,
                  }}
                />

                <div className="absolute left-6 top-1/2 -translate-y-1/2">
                  <Camera className="h-10 w-10 text-[#9b927d]" />
                </div>

                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                  <Target className="h-12 w-12 text-[#f6cf72]" />
                </div>

                <div className="absolute inset-x-0 bottom-0 border-t border-[#262626] bg-black/70 px-5 py-4">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <ResultCard
                      colorClassName="bg-[#e5b54f]"
                      label="عمق الميدان الكلي"
                      value={formatDistance(result.totalDOF)}
                    />
                    <ResultCard
                      colorClassName="bg-[#7ab7ff]"
                      label="أمام الهدف"
                      value={formatDistance(result.inFront)}
                    />
                    <ResultCard
                      colorClassName="bg-[#7ee08f]"
                      label="خلف الهدف"
                      value={formatDistance(result.behind)}
                    />
                    <ResultCard
                      colorClassName="bg-[#c29eff]"
                      label="المسافة الهايبرفوكال"
                      value={formatDistance(result.hyperfocal)}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="rounded-[10px] border border-[#262626] bg-[#070707] p-4">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-[#7f7b71]">
                    Aperture Dial
                  </p>
                  <div className="relative mt-6 h-40 overflow-hidden">
                    <div className="absolute inset-x-1/2 bottom-0 h-64 w-64 -translate-x-1/2 rounded-full border-[10px] border-[#2b2b2b]" />
                    <div className="absolute inset-x-1/2 bottom-0 h-64 w-64 -translate-x-1/2 rounded-full border-[10px] border-[#e5b54f] [clip-path:inset(0_50%_50%_0)]" />
                    <div className="absolute inset-x-1/2 bottom-12 -translate-x-1/2 text-center">
                      <p className="text-3xl font-bold text-[#f6cf72]">
                        T{aperture.toFixed(1)}
                      </p>
                      <p className="mt-2 text-[11px] uppercase tracking-[0.24em] text-[#8f8a7d]">
                        Focus Aperture
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3">
                  <StudioMetricCell
                    label="Sensor"
                    value={selectedSensor.nameAr}
                    tone="white"
                  />
                  <StudioMetricCell
                    label="Circle Of Confusion"
                    value={`${selectedSensor.circleOfConfusion}mm`}
                  />
                  <StudioMetricCell
                    label="Subject Distance"
                    value={`${distance.toFixed(1)}م`}
                    tone="white"
                  />
                </div>
              </div>
            </div>
          </StudioPanel>
        </div>

        <div className="space-y-4">
          <StudioPanel title="Sensor Profile" subtitle="الكاميرا والسينسور">
            <div className="space-y-4">
              <Select value={sensorId} onValueChange={setSensorId}>
                <SelectTrigger className="border-[#343434] bg-[#0d0d0d] text-[#f2e4bc]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[#343434] bg-[#090909] text-[#f2e4bc]">
                  {SENSOR_PRESETS.map((sensor) => (
                    <SelectItem key={sensor.id} value={sensor.id}>
                      {sensor.nameAr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="grid gap-3">
                <StudioMetricCell
                  label="Sensor Size"
                  value={`${selectedSensor.width} × ${selectedSensor.height}mm`}
                />
                <StudioMetricCell
                  label="Crop Factor"
                  value={`${selectedSensor.cropFactor}x`}
                  tone="white"
                />
                <StudioMetricCell
                  label="CoC"
                  value={`${selectedSensor.circleOfConfusion}mm`}
                />
              </div>
            </div>
          </StudioPanel>

          <StudioPanel title="Lens & Subject" subtitle="إعدادات العدسة">
            <div className="space-y-5">
              <SliderNumberInput
                label="البعد البؤري"
                icon={ZoomIn}
                unit="mm"
                value={focalLength}
                min={14}
                max={200}
                step={1}
                onChange={setFocalLength}
              />

              <SliderNumberInput
                label="فتحة العدسة"
                icon={Aperture}
                unit="f"
                value={aperture}
                min={1.4}
                max={22}
                step={0.1}
                formatValue={(value) => value.toFixed(1)}
                onChange={setAperture}
              />

              <SliderNumberInput
                label="مسافة الهدف"
                icon={Ruler}
                unit="م"
                value={distance}
                min={0.3}
                max={50}
                step={0.1}
                formatValue={(value) => value.toFixed(1)}
                onChange={setDistance}
              />
            </div>
          </StudioPanel>

          <StudioPanel title="Focus Notes" subtitle="إرشادات سريعة">
            <div className="rounded-[10px] border border-[#262626] bg-[#070707] p-4">
              <div className="flex items-start gap-3">
                <BookOpen className="mt-1 h-5 w-5 text-[#e5b54f]" />
                <div className="space-y-2 text-sm leading-7 text-[#c6b999]">
                  <p>فتحة أوسع تقلل عمق الميدان وتزيد العزل البصري.</p>
                  <p>العدسات الأطول تضغط المنظور وترفع حساسية التركيز.</p>
                  <p>الاقتراب من الهدف يغيّر حدود المجال أسرع من تغيير القص.</p>
                </div>
              </div>
            </div>
          </StudioPanel>
        </div>
      </div>
    </TooltipProvider>
  );
}

function ResultCard({
  colorClassName,
  label,
  value,
}: {
  colorClassName: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[10px] border border-[#262626] bg-[#050505] p-4">
      <div className="flex items-center gap-2">
        <div className={cn("h-2.5 w-2.5 rounded-full", colorClassName)} />
        <span className="text-[11px] text-[#8f8a7d]">{label}</span>
      </div>
      <p className="mt-3 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

export default DOFCalculatorTool;
