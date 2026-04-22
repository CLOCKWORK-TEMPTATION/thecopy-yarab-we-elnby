"use client";

import React, { useMemo, useCallback } from "react";
import {
  Camera,
  Clapperboard,
  Lightbulb,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { usePreProduction } from "../../hooks";
import type { PreProductionToolsProps } from "../../types";
import { StudioMetricCell, StudioPanel } from "../studio-ui";

const PreProductionTools: React.FC<PreProductionToolsProps> = ({
  mood = "noir",
}) => {
  const {
    prompt,
    darkness,
    complexity,
    isGenerating,
    result,
    error,
    setPrompt,
    setDarkness,
    setComplexity,
    handleGenerate,
    canGenerate,
    reset,
  } = usePreProduction(mood);

  const handlePromptChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setPrompt(event.target.value);
    },
    [setPrompt]
  );

  const technicalData = useMemo(
    () => ({
      lens: result?.lens ?? "35mm Anamorphic",
      lighting: result?.lighting ?? "Low-Key / Chiaroscuro",
      angle: result?.angle ?? "Dutch Angle (Low)",
    }),
    [result]
  );

  return (
    <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)_280px]">
      <StudioPanel
        title="Scene Brief"
        subtitle="إعداد وصف المشهد ومعايير التوليد"
        headerRight={<Clapperboard className="h-4 w-4 text-[#e5b54f]" />}
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-[0.26em] text-[#7f7b71]">
              Scene Description
            </label>
            <Textarea
              placeholder="اكتب وصفًا دقيقًا للمشهد، توزيع الحركة، الإضاءة المطلوبة، وشعور الكاميرا."
              className="min-h-[180px] border-[#343434] bg-[#0d0d0d] text-white placeholder:text-[#6c675c]"
              value={prompt}
              onChange={handlePromptChange}
            />
          </div>

          <div className="rounded-[10px] border border-[#262626] bg-[#070707] p-4">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-[#e5b54f]" />
              <p className="text-[11px] uppercase tracking-[0.26em] text-[#e5b54f]">
                Shot Mood Controls
              </p>
            </div>

            <div className="mt-5 space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-[#d8caa6]">
                  <span>Shadows &amp; Mystery</span>
                  <span className="font-mono text-[#f6cf72]">
                    {darkness[0]}%
                  </span>
                </div>
                <Slider
                  value={darkness}
                  onValueChange={setDarkness}
                  max={100}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-[#d8caa6]">
                  <span>Visual Chaos</span>
                  <span className="font-mono text-[#f6cf72]">
                    {complexity[0]}%
                  </span>
                </div>
                <Slider
                  value={complexity}
                  onValueChange={setComplexity}
                  max={100}
                  step={1}
                />
              </div>
            </div>
          </div>

          {error ? (
            <div className="rounded-[10px] border border-[#6b2f2f] bg-[#211010] px-4 py-3 text-sm text-[#f3b4b4]">
              {error}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="h-12 border border-[#e5b54f] bg-[#20170a] text-[#f6cf72] hover:bg-[#2c1d0b]"
            >
              {isGenerating ? "جاري التوليد" : "توليد خطة اللقطة"}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={reset}
              className="h-12 border-[#343434] bg-[#0d0d0d] text-[#c6b999] hover:bg-[#171717]"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              إعادة ضبط
            </Button>
          </div>
        </div>
      </StudioPanel>

      <StudioPanel
        title="Lighting Plot & Floor Plan"
        subtitle="مخطط تخطيطي يترجم قرار اللقطة إلى مساحة عمل"
      >
        <div className="relative min-h-[620px] overflow-hidden rounded-[10px] border border-[#2a2a2a] bg-[#040404]">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(229,181,79,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(229,181,79,0.08)_1px,transparent_1px)] bg-[size:32px_32px]" />
          <div className="absolute inset-[10%] border border-[#5b4725]">
            <div className="absolute inset-[5%] border border-[#3b311e]" />
          </div>

          <div className="absolute left-[16%] top-[18%] flex flex-col items-center gap-2 text-center">
            <Lightbulb className="h-7 w-7 text-[#e5b54f]" />
            <div className="text-[10px] leading-5 text-[#d8caa6]">
              <p>Key Light</p>
              <p>{technicalData.lighting}</p>
            </div>
          </div>

          <div className="absolute left-[34%] top-[68%] flex flex-col items-center gap-2 text-center">
            <Lightbulb className="h-7 w-7 rotate-180 text-[#e5b54f]" />
            <div className="text-[10px] leading-5 text-[#d8caa6]">
              <p>Fill</p>
              <p>Practical Bounce</p>
            </div>
          </div>

          <div className="absolute right-[12%] top-1/2 flex -translate-y-1/2 flex-col items-center gap-2 text-center">
            <Camera className="h-8 w-8 text-[#f6cf72]" />
            <div className="text-[10px] leading-5 text-[#d8caa6]">
              <p>Camera Axis</p>
              <p>{technicalData.angle}</p>
            </div>
          </div>

          <div className="absolute right-[16%] top-[36%] h-[180px] w-[260px] border-l border-[#e5b54f] bg-[#e5b54f]/10 [clip-path:polygon(100%_50%,0_0,0_100%)]" />

          <div className="absolute inset-x-6 top-6 flex items-center justify-between text-[10px] uppercase tracking-[0.26em] text-[#8f8a7d]">
            <span>Blueprint View</span>
            <span>{mood}</span>
          </div>

          <div className="absolute inset-x-0 bottom-0 border-t border-[#2a2a2a] bg-[#050505]/90 px-5 py-4">
            {result?.suggestionText ? (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
                <div className="rounded-[10px] border border-[#3a2f19] bg-[#120e08] p-4">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-[#8f8a7d]">
                    Shot Suggestion
                  </p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#eee0ba]">
                    {result.suggestionText}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  <StudioMetricCell label="Lens" value={technicalData.lens} />
                  <StudioMetricCell
                    label="Lighting"
                    value={technicalData.lighting}
                    tone="white"
                  />
                  <StudioMetricCell label="Angle" value={technicalData.angle} />
                </div>
              </div>
            ) : (
              <div className="flex min-h-[130px] items-center justify-center rounded-[10px] border border-dashed border-[#5b4725] bg-[#0a0a0a] px-6 text-center text-sm leading-7 text-[#9f947d]">
                {isGenerating
                  ? "جاري بناء مخطط اللقطة وتحويل الوصف إلى توصية تنفيذية."
                  : "ستظهر هنا خطة اللقطة النصية مع توزيع العدسة والإضاءة وزاوية الكاميرا بعد التوليد."}
              </div>
            )}
          </div>
        </div>
      </StudioPanel>

      <StudioPanel
        title="Shot Package"
        subtitle="الحزمة الفنية الناتجة من التوليد"
        headerRight={<Sparkles className="h-4 w-4 text-[#e5b54f]" />}
      >
        <div className="space-y-3">
          <StudioMetricCell label="Mood" value={mood} />
          <StudioMetricCell
            label="Lens"
            value={technicalData.lens}
            tone="white"
          />
          <StudioMetricCell label="Lighting" value={technicalData.lighting} />
          <StudioMetricCell
            label="Camera Angle"
            value={technicalData.angle}
            tone="white"
          />
          <StudioMetricCell
            label="Generator"
            value={isGenerating ? "Running" : result ? "Ready" : "Idle"}
            tone={result ? "success" : "gold"}
          />
        </div>
      </StudioPanel>
    </div>
  );
};

export default PreProductionTools;
