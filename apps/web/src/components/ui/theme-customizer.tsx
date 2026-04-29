"use client";

import {
  Palette,
  Sun,
  Moon,
  Monitor,
  Check,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

/**
 * Theme Customizer Component
 * Based on UI_DESIGN_SUGGESTIONS.md
 *
 * Features:
 * - Theme mode selection (light/dark/system)
 * - Brand color customization
 * - Radius customization
 * - Font size adjustment
 * - Live preview
 * - Preset themes
 */

type ThemeMode = "light" | "dark" | "system";

interface ThemeConfig {
  mode: ThemeMode;
  brandHue: number;
  brandChroma: number;
  radius: number;
  fontSize: number;
  reduceMotion: boolean;
}

const defaultConfig: ThemeConfig = {
  mode: "system",
  brandHue: 41,
  brandChroma: 0.222,
  radius: 10,
  fontSize: 16,
  reduceMotion: false,
};

const presetThemes = [
  { name: "البرتقالي", nameEn: "Orange", hue: 41, chroma: 0.222 },
  { name: "الأزرق", nameEn: "Blue", hue: 220, chroma: 0.18 },
  { name: "الأخضر", nameEn: "Green", hue: 140, chroma: 0.15 },
  { name: "البنفسجي", nameEn: "Purple", hue: 280, chroma: 0.2 },
  { name: "الوردي", nameEn: "Pink", hue: 330, chroma: 0.15 },
  { name: "الأحمر", nameEn: "Red", hue: 25, chroma: 0.2 },
];

function ThemeModeSelector({
  config,
  updateConfig,
}: {
  config: ThemeConfig;
  updateConfig: (u: Partial<ThemeConfig>) => void;
}) {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">وضع الثيم</Label>
      <div className="grid grid-cols-3 gap-2">
        {[
          { mode: "light" as ThemeMode, icon: Sun, label: "فاتح" },
          { mode: "dark" as ThemeMode, icon: Moon, label: "داكن" },
          { mode: "system" as ThemeMode, icon: Monitor, label: "النظام" },
        ].map(({ mode, icon: Icon, label }) => (
          <button
            key={mode}
            onClick={() => updateConfig({ mode })}
            className={cn(
              "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
              config.mode === mode
                ? "border-brand bg-brand/10"
                : "border-border hover:border-brand/50"
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-xs font-medium">{label}</span>
            {config.mode === mode && (
              <Check className="w-4 h-4 text-brand absolute top-2 left-2" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function BrandColorSelector({
  config,
  updateConfig,
}: {
  config: ThemeConfig;
  updateConfig: (u: Partial<ThemeConfig>) => void;
}) {
  return (
    <>
      <div className="space-y-3">
        <Label className="text-sm font-medium">لون العلامة التجارية</Label>
        <div className="grid grid-cols-6 gap-2">
          {presetThemes.map((preset) => (
            <button
              key={preset.nameEn}
              onClick={() =>
                updateConfig({
                  brandHue: preset.hue,
                  brandChroma: preset.chroma,
                })
              }
              className={cn(
                "w-10 h-10 rounded-full border-2 transition-transform hover:scale-110",
                config.brandHue === preset.hue
                  ? "border-foreground scale-110"
                  : "border-transparent"
              )}
              style={{
                background: `oklch(0.646 ${preset.chroma} ${preset.hue})`,
              }}
              title={preset.name}
            >
              {config.brandHue === preset.hue && (
                <Check className="w-4 h-4 text-white mx-auto" />
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">درجة اللون</Label>
          <span className="text-xs text-muted-foreground">
            {config.brandHue}°
          </span>
        </div>
        <Slider
          value={[config.brandHue]}
          onValueChange={([value]) => {
            if (value === undefined) return;
            updateConfig({ brandHue: value });
          }}
          min={0}
          max={360}
          step={1}
          className="w-full"
        />
        <div
          className="h-4 rounded-full"
          style={{
            background:
              "linear-gradient(to left, oklch(0.646 0.2 0), oklch(0.646 0.2 60), oklch(0.646 0.2 120), oklch(0.646 0.2 180), oklch(0.646 0.2 240), oklch(0.646 0.2 300), oklch(0.646 0.2 360))",
          }}
        />
      </div>
    </>
  );
}

function RadiusAndFontControls({
  config,
  updateConfig,
}: {
  config: ThemeConfig;
  updateConfig: (u: Partial<ThemeConfig>) => void;
}) {
  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">حدة الزوايا</Label>
          <span className="text-xs text-muted-foreground">
            {config.radius}px
          </span>
        </div>
        <Slider
          value={[config.radius]}
          onValueChange={([value]) => {
            if (value === undefined) return;
            updateConfig({ radius: value });
          }}
          min={0}
          max={24}
          step={2}
          className="w-full"
        />
        <div className="flex gap-2">
          <div
            className="flex-1 h-10 bg-muted"
            style={{ borderRadius: `${config.radius}px` }}
          />
          <div
            className="flex-1 h-10 bg-brand"
            style={{ borderRadius: `${config.radius}px` }}
          />
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">حجم الخط</Label>
          <span className="text-xs text-muted-foreground">
            {config.fontSize}px
          </span>
        </div>
        <Slider
          value={[config.fontSize]}
          onValueChange={([value]) => {
            if (value === undefined) return;
            updateConfig({ fontSize: value });
          }}
          min={12}
          max={20}
          step={1}
          className="w-full"
        />
      </div>
    </>
  );
}

function ThemePreviewCard() {
  return (
    <div className="p-4 bg-card border border-border rounded-lg space-y-3">
      <div className="font-medium">معاينة</div>
      <div className="flex gap-2">
        <Button size="sm">زر أساسي</Button>
        <Button size="sm" variant="outline">
          زر ثانوي
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        هذا نص تجريبي لمعاينة حجم الخط والألوان
      </p>
    </div>
  );
}

export function ThemeCustomizer() {
  const [config, setConfig] = React.useState<ThemeConfig>(defaultConfig);
  const [isOpen, setIsOpen] = React.useState(false);

  const applyTheme = React.useCallback((newConfig: ThemeConfig) => {
    const root = document.documentElement;
    if (newConfig.mode === "dark") {
      root.classList.add("dark");
    } else if (newConfig.mode === "light") {
      root.classList.remove("dark");
    } else {
      root.classList.toggle(
        "dark",
        window.matchMedia("(prefers-color-scheme: dark)").matches
      );
    }

    root.style.setProperty(
      "--brand",
      `oklch(0.646 ${newConfig.brandChroma} ${newConfig.brandHue})`
    );
    root.style.setProperty("--radius", `${newConfig.radius / 16}rem`);
    root.style.setProperty("--radius-lg", `${(newConfig.radius + 6) / 16}rem`);
    root.style.setProperty("--radius-xl", `${(newConfig.radius + 14) / 16}rem`);
    root.style.setProperty("--text-base", `${newConfig.fontSize / 16}rem`);

    if (newConfig.reduceMotion) {
      root.style.setProperty("--duration-fast", "0ms");
      root.style.setProperty("--duration-normal", "0ms");
      root.style.setProperty("--duration-slow", "0ms");
    } else {
      root.style.setProperty("--duration-fast", "150ms");
      root.style.setProperty("--duration-normal", "300ms");
      root.style.setProperty("--duration-slow", "500ms");
    }

    localStorage.setItem("theme-config", JSON.stringify(newConfig));
  }, []);

  React.useEffect(() => {
    const saved = localStorage.getItem("theme-config");
    if (saved) {
      const parsed = JSON.parse(saved) as ThemeConfig;
      setConfig(parsed);
      applyTheme(parsed);
    }
  }, [applyTheme]);

  React.useEffect(() => {
    if (config.mode !== "system") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => applyTheme(config);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [config, applyTheme]);

  const updateConfig = (updates: Partial<ThemeConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    applyTheme(newConfig);
  };

  const resetToDefaults = () => {
    setConfig(defaultConfig);
    applyTheme(defaultConfig);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="fixed bottom-6 left-6 z-50 w-12 h-12 rounded-full shadow-lg bg-brand text-brand-foreground hover:bg-brand/90"
        >
          <Palette className="w-5 h-5" />
          <span className="sr-only">تخصيص الثيم</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 sm:w-96" dir="rtl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-right">
            <Sparkles className="w-5 h-5 text-brand" />
            تخصيص المظهر
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          <ThemeModeSelector config={config} updateConfig={updateConfig} />
          <BrandColorSelector config={config} updateConfig={updateConfig} />
          <RadiusAndFontControls config={config} updateConfig={updateConfig} />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">تقليل الحركة</Label>
              <p className="text-xs text-muted-foreground">
                إيقاف الحركات والانتقالات
              </p>
            </div>
            <Switch
              checked={config.reduceMotion}
              onCheckedChange={(checked) =>
                updateConfig({ reduceMotion: checked })
              }
            />
          </div>
          <ThemePreviewCard />
          <Button
            variant="outline"
            className="w-full"
            onClick={resetToDefaults}
          >
            <RotateCcw className="w-4 h-4 ml-2" />
            إعادة التعيين للافتراضي
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default ThemeCustomizer;
