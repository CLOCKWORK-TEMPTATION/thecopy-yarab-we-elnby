"use client";

import {
  Aperture,
  Circle,
  Move,
  RotateCcw,
  Sparkles,
  ZoomIn,
} from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import SliderNumberInput from "../controls/SliderNumberInput";
import { StudioMetricCell, StudioPanel } from "../studio-ui";

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

interface LensSettings {
  focalLength: number;
  aperture: number;
  distortion: number;
  showBokeh: boolean;
  isAnamorphic: boolean;
  selectedPreset: string | null;
}

interface LensSimulatorToolProps {
  className?: string;
  onLensChange?: (lens: {
    focalLength: number;
    aperture: number;
    distortion: number;
  }) => void;
}

const DEFAULT_LENS_SETTINGS: LensSettings = {
  focalLength: 50,
  aperture: 2.8,
  distortion: 0,
  showBokeh: true,
  isAnamorphic: false,
  selectedPreset: null,
};

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

function calculateFOV(focalLength: number, sensorWidth = 36): number {
  return 2 * Math.atan(sensorWidth / (2 * focalLength)) * (180 / Math.PI);
}

function getLensType(focalLength: number): {
  type: string;
  typeAr: string;
  description: string;
} {
  if (focalLength <= 20) {
    return {
      type: "Ultra Wide",
      typeAr: "عريضة جداً",
      description: "مثالية للمناظر الطبيعية والمساحات الضيقة",
    };
  }

  if (focalLength <= 35) {
    return {
      type: "Wide",
      typeAr: "عريضة",
      description: "ممتازة للمشاهد الواسعة والبيئات",
    };
  }

  if (focalLength <= 60) {
    return {
      type: "Standard",
      typeAr: "قياسية",
      description: "تحاكي رؤية العين البشرية",
    };
  }

  if (focalLength <= 100) {
    return {
      type: "Portrait",
      typeAr: "بورتريه",
      description: "مثالية للوجوه والتفاصيل",
    };
  }

  return {
    type: "Telephoto",
    typeAr: "تيليفوتو",
    description: "ضغط المسافات والعزل",
  };
}

function getPresetDistortion(presetId: string): number {
  if (presetId.includes("vintage")) {
    return 5;
  }

  if (presetId.includes("anamorphic")) {
    return 8;
  }

  return 0;
}

export function LensSimulatorTool({
  className,
  onLensChange,
}: LensSimulatorToolProps) {
  const [settings, setSettings] = React.useState<LensSettings>(
    DEFAULT_LENS_SETTINGS
  );

  const activePreset = React.useMemo(
    () =>
      settings.selectedPreset
        ? (LENS_PRESETS.find(
            (preset) => preset.id === settings.selectedPreset
          ) ?? null)
        : null,
    [settings.selectedPreset]
  );

  const fov = React.useMemo(
    () => calculateFOV(settings.focalLength),
    [settings.focalLength]
  );

  const lensType = React.useMemo(
    () => getLensType(settings.focalLength),
    [settings.focalLength]
  );

  const apertureMin = activePreset?.maxAperture ?? 1.4;
  const isPresetLocked = Boolean(activePreset);
  const presetReason = activePreset
    ? `القالب ${activePreset.nameAr} يثبّت البعد البؤري والتشوه ووضع الأنمورفيك. اختر التحرير اليدوي لتحويلها إلى عدسة مخصصة قابلة للتعديل.`
    : null;

  React.useEffect(() => {
    onLensChange?.({
      focalLength: settings.focalLength,
      aperture: settings.aperture,
      distortion: settings.distortion,
    });
  }, [
    onLensChange,
    settings.aperture,
    settings.distortion,
    settings.focalLength,
  ]);

  const applyPreset = React.useCallback((presetId: string) => {
    const preset = LENS_PRESETS.find((item) => item.id === presetId);
    if (!preset) {
      return;
    }

    setSettings({
      focalLength: preset.focalLength,
      aperture: preset.maxAperture,
      distortion: getPresetDistortion(presetId),
      showBokeh: true,
      isAnamorphic: presetId.includes("anamorphic"),
      selectedPreset: presetId,
    });
  }, []);

  const clearPresetLock = React.useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      selectedPreset: null,
    }));
  }, []);

  const resetSettings = React.useCallback(() => {
    setSettings(DEFAULT_LENS_SETTINGS);
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
            title="Lens Explorer"
            subtitle="مقارنة بصرية بين العدسة الحالية والطابع الأنمورفيك"
            headerRight={
              <Badge className="border-0 bg-[#15100a] text-[#f6cf72]">
                {lensType.typeAr} / {lensType.type}
              </Badge>
            }
          >
            <div className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px_minmax(0,1fr)]">
                <LensViewport
                  title="Spherical"
                  titleAr="كروية"
                  aspectClassName="aspect-[1.85/1]"
                  settings={settings}
                  fov={fov}
                  distortion={Math.max(0, settings.distortion - 2)}
                />

                <div className="rounded-[10px] border border-[#262626] bg-[#070707] p-4">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-[#7f7b71]">
                    Lens Metadata
                  </p>
                  <div className="mt-6 space-y-4">
                    <StudioMetricCell
                      label="Minimum Focus"
                      value="0.35m / 1'2&quot;"
                    />
                    <StudioMetricCell
                      label="Weight"
                      value="1.2kg"
                      tone="white"
                    />
                    <StudioMetricCell label="Filter Size" value="95mm" />
                    <StudioMetricCell
                      label="Distortion"
                      value={`${settings.distortion}%`}
                      tone="white"
                    />
                  </div>
                </div>

                <LensViewport
                  title="Anamorphic"
                  titleAr="أنامورفيك"
                  aspectClassName="aspect-[2.39/1]"
                  settings={{
                    ...settings,
                    isAnamorphic: true,
                    showBokeh: settings.showBokeh,
                  }}
                  fov={fov * 0.82}
                  distortion={Math.max(6, settings.distortion + 4)}
                  highlighted
                />
              </div>

              <div className="rounded-[10px] border border-[#262626] bg-[#070707] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.28em] text-[#7f7b71]">
                      Lens Inventory
                    </p>
                    <p className="mt-1 text-sm text-[#cdbf99]">
                      القوالب المرجعية الجاهزة للمقارنة السريعة.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetSettings}
                    className="border-[#343434] bg-[#0d0d0d] text-[#c6b999] hover:bg-[#171717]"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    إعادة
                  </Button>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {LENS_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset.id)}
                      aria-pressed={settings.selectedPreset === preset.id}
                      className={cn(
                        "rounded-[10px] border px-4 py-4 text-right transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e5b54f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#070707]",
                        settings.selectedPreset === preset.id
                          ? "border-[#e5b54f] bg-[#1f170a]"
                          : "border-[#343434] bg-[#0d0d0d] hover:border-[#73572a]"
                      )}
                    >
                      <p className="text-[10px] uppercase tracking-[0.24em] text-[#7f7b71]">
                        {preset.brand}
                      </p>
                      <p className="mt-2 text-lg font-semibold text-white">
                        {preset.nameAr}
                      </p>
                      <p className="mt-1 text-sm text-[#c6b999]">
                        {preset.focalLength}mm / f{preset.maxAperture}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </StudioPanel>
        </div>

        <div className="space-y-4">
          <StudioPanel
            title="Preset Library"
            subtitle="اختيار عدسات سينمائية جاهزة"
            headerRight={<Sparkles className="h-4 w-4 text-[#e5b54f]" />}
          >
            <div className="space-y-4">
              <Select
                value={settings.selectedPreset ?? ""}
                onValueChange={applyPreset}
              >
                <SelectTrigger className="border-[#343434] bg-[#0d0d0d] text-[#f2e4bc]">
                  <SelectValue placeholder="اختر عدسة..." />
                </SelectTrigger>
                <SelectContent className="border-[#343434] bg-[#090909] text-[#f2e4bc]">
                  {LENS_PRESETS.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {preset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {activePreset ? (
                <div className="rounded-[10px] border border-[#5b4725] bg-[#140f08] p-4">
                  <p className="text-lg font-semibold text-white">
                    {activePreset.nameAr}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-[#e8dab3]">
                    {presetReason}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {activePreset.characteristics.map((characteristic) => (
                      <Badge
                        key={characteristic}
                        className="border-0 bg-[#241c12] text-[#d9c9a4]"
                      >
                        {characteristic}
                      </Badge>
                    ))}
                  </div>

                  {activePreset.famousFilms?.length ? (
                    <p className="mt-4 text-sm text-[#cdbf99]">
                      {activePreset.famousFilms.join(" / ")}
                    </p>
                  ) : null}

                  <Button
                    type="button"
                    onClick={clearPresetLock}
                    className="mt-4 h-11 w-full border border-[#e5b54f] bg-[#20170a] text-[#f6cf72] hover:bg-[#2c1d0b]"
                  >
                    تحرير يدوي
                  </Button>
                </div>
              ) : (
                <div className="rounded-[10px] border border-dashed border-[#5b4725] bg-[#0d0d0d] px-4 py-5 text-sm leading-7 text-[#9f947d]">
                  اختر قالبًا جاهزًا لفتح المقارنة البصرية وتعبئة القيم
                  تلقائيًا.
                </div>
              )}
            </div>
          </StudioPanel>

          <StudioPanel title="Manual Calibration" subtitle="التحكم اليدوي">
            <div className="space-y-5">
              <SliderNumberInput
                label="البعد البؤري"
                icon={ZoomIn}
                unit="mm"
                value={settings.focalLength}
                min={14}
                max={200}
                step={1}
                disabled={isPresetLocked}
                description={lensType.description}
                onChange={(value) =>
                  setSettings((prev) => ({ ...prev, focalLength: value }))
                }
              />

              <SliderNumberInput
                label="فتحة العدسة"
                icon={Aperture}
                unit="f"
                value={settings.aperture}
                min={apertureMin}
                max={22}
                step={0.1}
                formatValue={(value) => value.toFixed(1)}
                disabled={isPresetLocked}
                description={`الحد الأقصى المفتوح الحالي هو f/${apertureMin.toFixed(1)}`}
                onChange={(value) =>
                  setSettings((prev) => ({ ...prev, aperture: value }))
                }
              />

              <SliderNumberInput
                label="التشوه"
                icon={Move}
                unit="%"
                value={settings.distortion}
                min={0}
                max={20}
                step={1}
                disabled={isPresetLocked}
                onChange={(value) =>
                  setSettings((prev) => ({ ...prev, distortion: value }))
                }
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  onClick={() =>
                    setSettings((prev) => ({
                      ...prev,
                      showBokeh: !prev.showBokeh,
                    }))
                  }
                  className={
                    settings.showBokeh
                      ? "h-11 border border-[#e5b54f] bg-[#20170a] text-[#f6cf72] hover:bg-[#2c1d0b]"
                      : "h-11 border border-[#343434] bg-[#0d0d0d] text-[#c6b999] hover:bg-[#171717]"
                  }
                >
                  بوكيه
                </Button>

                <Button
                  type="button"
                  onClick={() =>
                    setSettings((prev) => ({
                      ...prev,
                      isAnamorphic: !prev.isAnamorphic,
                    }))
                  }
                  className={
                    settings.isAnamorphic
                      ? "h-11 border border-[#e5b54f] bg-[#20170a] text-[#f6cf72] hover:bg-[#2c1d0b]"
                      : "h-11 border border-[#343434] bg-[#0d0d0d] text-[#c6b999] hover:bg-[#171717]"
                  }
                >
                  وضع أنامورفيك
                </Button>
              </div>
            </div>
          </StudioPanel>
        </div>
      </div>
    </TooltipProvider>
  );
}

function LensViewport({
  title,
  titleAr,
  aspectClassName,
  settings,
  fov,
  distortion,
  highlighted = false,
}: {
  title: string;
  titleAr: string;
  aspectClassName: string;
  settings: LensSettings;
  fov: number;
  distortion: number;
  highlighted?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between">
        <h3 className="text-sm font-semibold text-[#f6cf72]">
          {title} / {titleAr}
        </h3>
        <p className="text-[10px] uppercase tracking-[0.26em] text-[#7f7b71]">
          {fov.toFixed(1)}°
        </p>
      </div>

      <div
        className={cn(
          "relative overflow-hidden rounded-[10px] border bg-[#050505]",
          aspectClassName,
          highlighted ? "border-[#73572a]" : "border-[#343434]"
        )}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(229,181,79,0.16),transparent_26%),linear-gradient(135deg,#0d0d0d_0%,#040404_55%,#17120c_100%)]" />
        <div
          className="absolute inset-[11%] border border-[#e5b54f]/30 transition-all"
          style={{
            transform: `scale(${Math.min(1.2, Math.max(0.56, fov / 92))})`,
            borderRadius: `${distortion * 2}%`,
          }}
        >
          <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[#e5b54f]/25" />
          <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-[#e5b54f]/25" />
        </div>

        {settings.showBokeh ? (
          <>
            {[0, 1, 2, 3].map((index) => (
              <div
                key={`${title}-bokeh-${index}`}
                className="absolute rounded-full bg-[#f6cf72]/20 blur-md"
                style={{
                  width: `${28 + index * 18}px`,
                  height: settings.isAnamorphic
                    ? `${16 + index * 10}px`
                    : `${28 + index * 18}px`,
                  left: `${18 + index * 15}%`,
                  top: `${18 + index * 12}%`,
                }}
              />
            ))}
          </>
        ) : null}

        {settings.isAnamorphic || highlighted ? (
          <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent blur-sm" />
        ) : null}

        <div className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#e5b54f]/40">
          <Circle className="h-5 w-5 text-[#e5b54f]/50" />
        </div>

        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between border-t border-[#262626] bg-black/70 px-4 py-3 text-[10px] uppercase tracking-[0.24em] text-[#e8dab3]">
          <span>{settings.focalLength}mm</span>
          <span>f/{settings.aperture.toFixed(1)}</span>
          <span>
            {settings.isAnamorphic || highlighted ? "2.39:1" : "1.85:1"}
          </span>
        </div>
      </div>
    </div>
  );
}

export default LensSimulatorTool;
