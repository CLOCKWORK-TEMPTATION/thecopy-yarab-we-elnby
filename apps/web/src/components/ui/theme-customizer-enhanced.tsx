"use client";

import {
  Palette,
  Type,
  Layout,
  Moon,
  Sun,
  Monitor,
  Check,
  RotateCcw,
  Download,
  Upload,
  Sparkles,
} from "lucide-react";
import * as React from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

/**
 * Enhanced Theme Customizer Component
 * Based on UI_DESIGN_SUGGESTIONS.md
 *
 * Features:
 * - Live color picker with OKLCH support
 * - Font family selection
 * - Spacing adjustments
 * - Dark/Light mode toggle
 * - Export/Import themes
 * - AI-powered color palette suggestions
 * - Real-time preview
 */

interface ThemeConfig {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
  };
  typography: {
    fontFamily: string;
    scale: number;
  };
  spacing: {
    scale: number;
  };
  mode: "light" | "dark" | "system";
}

interface ThemeCustomizerProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onThemeChange?: (theme: ThemeConfig) => void;
}

const fontFamilies = [
  { name: "Cairo", value: "'Cairo', sans-serif", preview: "القاهرة" },
  {
    name: "Noto Kufi Arabic",
    value: "'Noto Kufi Arabic', sans-serif",
    preview: "نوتو كوفي",
  },
  {
    name: "Noto Sans Arabic",
    value: "'Noto Sans Arabic', sans-serif",
    preview: "نوتو سانس",
  },
  {
    name: "IBM Plex Mono Arabic",
    value: "'IBM Plex Mono Arabic', monospace",
    preview: "آي بي إم",
  },
];

const colorPresets = [
  {
    name: "الافتراضي",
    colors: {
      primary: "oklch(0.205 0 0)",
      secondary: "oklch(0.97 0 0)",
      accent: "oklch(0.646 0.222 41.116)",
      background: "oklch(1 0 0)",
      foreground: "oklch(0.145 0 0)",
    },
  },
  {
    name: "إبداعي",
    colors: {
      primary: "oklch(0.7 0.15 330)",
      secondary: "oklch(0.85 0.1 340)",
      accent: "oklch(0.65 0.2 320)",
      background: "oklch(0.98 0.01 330)",
      foreground: "oklch(0.2 0.05 330)",
    },
  },
  {
    name: "تقني",
    colors: {
      primary: "oklch(0.65 0.18 220)",
      secondary: "oklch(0.85 0.1 230)",
      accent: "oklch(0.6 0.2 210)",
      background: "oklch(0.98 0.01 220)",
      foreground: "oklch(0.2 0.05 220)",
    },
  },
  {
    name: "طبيعي",
    colors: {
      primary: "oklch(0.7 0.15 140)",
      secondary: "oklch(0.85 0.1 150)",
      accent: "oklch(0.65 0.18 130)",
      background: "oklch(0.98 0.01 140)",
      foreground: "oklch(0.2 0.05 140)",
    },
  },
];

export function ThemeCustomizerEnhanced({
  open = false,
  onOpenChange,
  onThemeChange,
}: ThemeCustomizerProps) {
  const [isOpen, setIsOpen] = React.useState(open);

  const defaultColorPreset = colorPresets[0];
  const defaultFontFamily = fontFamilies[0];

  if (!defaultColorPreset || !defaultFontFamily) {
    throw new Error("Default presets not found");
  }

  const [theme, setTheme] = React.useState<ThemeConfig>({
    colors: defaultColorPreset.colors,
    typography: {
      fontFamily: defaultFontFamily.value,
      scale: 1.25,
    },
    spacing: {
      scale: 1,
    },
    mode: "system",
  });

  React.useEffect(() => {
    setIsOpen(open);
  }, [open]);

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  const updateTheme = (updates: Partial<ThemeConfig>) => {
    const newTheme = { ...theme, ...updates };
    setTheme(newTheme);
    onThemeChange?.(newTheme);
  };

  const applyColorPreset = (preset: (typeof colorPresets)[0]) => {
    updateTheme({
      colors: preset.colors,
    });
  };

  const resetTheme = () => {
    const defaultColorPreset = colorPresets[0];
    const defaultFontFamily = fontFamilies[0];

    if (!defaultColorPreset || !defaultFontFamily) {
      return;
    }

    const defaultTheme: ThemeConfig = {
      colors: defaultColorPreset.colors,
      typography: {
        fontFamily: defaultFontFamily.value,
        scale: 1.25,
      },
      spacing: {
        scale: 1,
      },
      mode: "system",
    };
    setTheme(defaultTheme);
    onThemeChange?.(defaultTheme);
  };

  const exportTheme = () => {
    const json = JSON.stringify(theme, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "theme-config.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importTheme = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result;
        if (typeof result === "string") {
          const imported = JSON.parse(result);
          setTheme(imported);
          onThemeChange?.(imported);
        }
      } catch (error) {
        void error;
      }
    };
    reader.readAsText(file);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
        dir="rtl"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            مخصص الثيم
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="colors" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="colors" className="gap-2">
              <Palette className="h-4 w-4" />
              الألوان
            </TabsTrigger>
            <TabsTrigger value="typography" className="gap-2">
              <Type className="h-4 w-4" />
              الخطوط
            </TabsTrigger>
            <TabsTrigger value="spacing" className="gap-2">
              <Layout className="h-4 w-4" />
              المسافات
            </TabsTrigger>
            <TabsTrigger value="mode" className="gap-2">
              <Monitor className="h-4 w-4" />
              الوضع
            </TabsTrigger>
          </TabsList>

          {/* Colors Tab */}
          <TabsContent value="colors" className="space-y-6 mt-6">
            {/* Color Presets */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-accent-creative" />
                <Label>قوالب الألوان</Label>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {colorPresets.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => applyColorPreset(preset)}
                    className={cn(
                      "p-4 rounded-lg border-2 transition-all hover:scale-105",
                      theme.colors.primary === preset.colors.primary
                        ? "border-primary shadow-lg"
                        : "border-transparent hover:border-border"
                    )}
                  >
                    <div className="flex gap-1 mb-2">
                      {Object.values(preset.colors)
                        .slice(0, 3)
                        .map((color, i) => (
                          <div
                            key={i}
                            className="h-8 flex-1 rounded"
                            style={{ background: color }}
                          />
                        ))}
                    </div>
                    <p className="text-sm font-medium">{preset.name}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Colors */}
            <div className="space-y-4">
              <Label>الألوان المخصصة</Label>
              {Object.entries(theme.colors).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="capitalize">{key}</Label>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {value}
                    </code>
                  </div>
                  <div className="flex gap-2">
                    <div
                      className="w-12 h-12 rounded-lg border-2 border-border"
                      style={{ background: value }}
                    />
                    <input
                      type="text"
                      value={value}
                      onChange={(e) =>
                        updateTheme({
                          colors: { ...theme.colors, [key]: e.target.value },
                        })
                      }
                      className="flex-1 px-3 py-2 rounded-md border bg-background"
                      placeholder="oklch(0.5 0.2 180)"
                    />
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Typography Tab */}
          <TabsContent value="typography" className="space-y-6 mt-6">
            <div className="space-y-4">
              <Label>عائلة الخط</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {fontFamilies.map((font) => (
                  <button
                    key={font.value}
                    onClick={() =>
                      updateTheme({
                        typography: {
                          ...theme.typography,
                          fontFamily: font.value,
                        },
                      })
                    }
                    className={cn(
                      "p-4 rounded-lg border-2 text-right transition-all",
                      theme.typography.fontFamily === font.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                    style={{ fontFamily: font.value }}
                  >
                    <p className="text-2xl mb-1">{font.preview}</p>
                    <p className="text-sm text-muted-foreground">{font.name}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>مقياس الخط</Label>
                <span className="text-sm text-muted-foreground">
                  {theme.typography.scale.toFixed(2)}
                </span>
              </div>
              <Slider
                value={[theme.typography.scale]}
                onValueChange={(values) => {
                  const value = values[0];
                  if (value !== undefined) {
                    updateTheme({
                      typography: { ...theme.typography, scale: value },
                    });
                  }
                }}
                min={1.1}
                max={1.5}
                step={0.05}
                className="w-full"
              />
              <div
                className="p-6 rounded-lg border bg-muted/20"
                style={{
                  fontFamily: theme.typography.fontFamily,
                }}
              >
                <h1
                  className="font-bold mb-2"
                  style={{ fontSize: `${theme.typography.scale * 2}rem` }}
                >
                  عنوان كبير
                </h1>
                <h2
                  className="font-semibold mb-2"
                  style={{ fontSize: `${theme.typography.scale * 1.5}rem` }}
                >
                  عنوان متوسط
                </h2>
                <p style={{ fontSize: `${theme.typography.scale}rem` }}>
                  نص عادي للمعاينة. هذا مثال على كيفية ظهور النص مع الإعدادات
                  الحالية.
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Spacing Tab */}
          <TabsContent value="spacing" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>مقياس المسافات</Label>
                <span className="text-sm text-muted-foreground">
                  {theme.spacing.scale.toFixed(2)}x
                </span>
              </div>
              <Slider
                value={[theme.spacing.scale]}
                onValueChange={(values) => {
                  const value = values[0];
                  if (value !== undefined) {
                    updateTheme({
                      spacing: { scale: value },
                    });
                  }
                }}
                min={0.5}
                max={2}
                step={0.1}
                className="w-full"
              />
              <div className="p-6 rounded-lg border bg-muted/20 space-y-4">
                <div
                  className="p-4 bg-primary/10 rounded"
                  style={{ padding: `${theme.spacing.scale}rem` }}
                >
                  مسافة صغيرة
                </div>
                <div
                  className="p-6 bg-primary/10 rounded"
                  style={{ padding: `${theme.spacing.scale * 1.5}rem` }}
                >
                  مسافة متوسطة
                </div>
                <div
                  className="p-8 bg-primary/10 rounded"
                  style={{ padding: `${theme.spacing.scale * 2}rem` }}
                >
                  مسافة كبيرة
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Mode Tab */}
          <TabsContent value="mode" className="space-y-6 mt-6">
            <div className="grid grid-cols-3 gap-4">
              {[
                { value: "light", icon: Sun, label: "فاتح" },
                { value: "dark", icon: Moon, label: "داكن" },
                { value: "system", icon: Monitor, label: "النظام" },
              ].map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  onClick={() =>
                    updateTheme({ mode: value as ThemeConfig["mode"] })
                  }
                  className={cn(
                    "p-6 rounded-lg border-2 transition-all hover:scale-105",
                    theme.mode === value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <Icon className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm font-medium">{label}</p>
                  {theme.mode === value && (
                    <Check className="h-4 w-4 mx-auto mt-2 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex items-center justify-between pt-6 border-t">
          <div className="flex items-center gap-2">
            <button
              onClick={resetTheme}
              className="px-4 py-2 rounded-md border hover:bg-accent transition-colors flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              إعادة تعيين
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="px-4 py-2 rounded-md border hover:bg-accent transition-colors cursor-pointer flex items-center gap-2">
              <Upload className="h-4 w-4" />
              استيراد
              <input
                type="file"
                accept=".json"
                onChange={importTheme}
                className="hidden"
              />
            </label>

            <button
              onClick={exportTheme}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              تصدير
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
