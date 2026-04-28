import * as React from "react";

import { DEFAULT_GRADE, LUT_PRESETS } from "./constants";
import { buildPreviewFilter, buildPreviewOverlay } from "./helpers";

import type { ColorGrade } from "./types";

export function useColorGradingState(onGradeChange?: (grade: ColorGrade) => void) {
  const [grade, setGrade] = React.useState<ColorGrade>(DEFAULT_GRADE);
  const [selectedPreset, setSelectedPreset] = React.useState<string>("neutral");
  const [showOriginal, setShowOriginal] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const applyPreset = React.useCallback((presetId: string) => {
    const preset = LUT_PRESETS.find((item) => item.id === presetId);
    if (preset) {
      setGrade({ ...DEFAULT_GRADE, ...preset.grade });
      setSelectedPreset(presetId);
    }
  }, []);

  const updateGrade = React.useCallback((key: keyof ColorGrade, value: number) => {
    setGrade((previous) => ({ ...previous, [key]: value }));
    setSelectedPreset("");
  }, []);

  const resetGrade = React.useCallback(() => {
    setGrade(DEFAULT_GRADE);
    setSelectedPreset("neutral");
  }, []);

  const copySettings = React.useCallback(() => {
    const settings = JSON.stringify(grade, null, 2);
    navigator.clipboard
      .writeText(settings)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        setCopied(false);
      });
  }, [grade]);

  const previewFilter = React.useMemo(
    () => buildPreviewFilter(grade, showOriginal),
    [grade, showOriginal]
  );
  const previewOverlay = React.useMemo(
    () => buildPreviewOverlay(grade, showOriginal),
    [grade, showOriginal]
  );

  React.useEffect(() => {
    onGradeChange?.(grade);
  }, [grade, onGradeChange]);

  return {
    grade,
    selectedPreset,
    showOriginal,
    copied,
    previewFilter,
    previewOverlay,
    setShowOriginal,
    applyPreset,
    updateGrade,
    resetGrade,
    copySettings,
  };
}
