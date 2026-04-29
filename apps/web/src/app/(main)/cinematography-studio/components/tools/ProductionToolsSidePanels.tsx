"use client";

import { Thermometer } from "lucide-react";

import { Slider } from "@/components/ui/slider";

import { StudioMetricCell, StudioPanel } from "../studio-ui";

import { ScopePanel } from "./ScopePanel";
import { ToggleRow } from "./ToggleRow";

import type { TechnicalSettings } from "../../hooks/useProduction-types";
import type { VisualMood } from "../../types";

export interface SidePanelsProps {
  technicalSettings: TechnicalSettings;
  colorTempValue: number[];
  recommendedColorTemp: number;
  mood: VisualMood;
  toggleFocusPeaking: () => void;
  toggleFalseColor: () => void;
  setColorTempFromSlider: (value: number[]) => void;
}

export function SidePanels({
  technicalSettings,
  colorTempValue,
  recommendedColorTemp,
  mood,
  toggleFocusPeaking,
  toggleFalseColor,
  setColorTempFromSlider,
}: SidePanelsProps) {
  return (
    <div className="space-y-4">
      <StudioPanel title="Scopes" subtitle="مراقبة فنية مباشرة">
        <div className="space-y-3">
          <ScopePanel title="RGB Parade" variant="wave" />
          <ScopePanel title="Vectorscope" variant="vector" />
          <ScopePanel title="Luma Histogram" variant="histogram" />
        </div>
      </StudioPanel>

      <StudioPanel title="Camera Controls" subtitle="إعدادات التشغيل السريع">
        <div className="space-y-4">
          <ToggleRow
            label="Focus Peaking"
            active={technicalSettings.focusPeaking}
            onClick={toggleFocusPeaking}
          />
          <ToggleRow
            label="False Color"
            active={technicalSettings.falseColor}
            onClick={toggleFalseColor}
          />

          <div className="rounded-[10px] border border-[#262626] bg-[#070707] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-[#e5b54f]" />
                <span className="text-sm text-[#ddd2b8]">Color Temp</span>
              </div>
              <span className="font-mono text-sm text-white">
                {technicalSettings.colorTemp}K
              </span>
            </div>
            <Slider
              value={colorTempValue}
              onValueChange={setColorTempFromSlider}
              min={2000}
              max={10000}
              step={100}
              className="mt-4"
            />
            <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-[#7f7b71]">
              <span>2000K</span>
              <span className="text-[#e5b54f]">{recommendedColorTemp}K</span>
              <span>10000K</span>
            </div>
          </div>

          <StudioMetricCell label="Project Mood" value={mood} tone="white" />
        </div>
      </StudioPanel>
    </div>
  );
}
