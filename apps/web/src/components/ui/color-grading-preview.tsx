"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { BasicAdjustmentsCard } from "./color-grading-preview/BasicAdjustmentsCard";
import { ColorWheelsCard } from "./color-grading-preview/ColorWheelsCard";
import { PresetsCard } from "./color-grading-preview/PresetsCard";
import { PreviewCanvas } from "./color-grading-preview/PreviewCanvas";
import { PreviewHeader } from "./color-grading-preview/PreviewHeader";
import { useColorGradingState } from "./color-grading-preview/use-color-grading-state";

import type { ColorGradingPreviewProps } from "./color-grading-preview/types";

export function ColorGradingPreview({
  className,
  onGradeChange,
}: ColorGradingPreviewProps) {
  const {
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
  } = useColorGradingState(onGradeChange);

  return (
    <TooltipProvider>
      <div className={cn("color-grading-preview space-y-6", className)}>
        <PreviewHeader
          showOriginal={showOriginal}
          copied={copied}
          onToggleOriginal={() => setShowOriginal((previous) => !previous)}
          onCopy={copySettings}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <PreviewCanvas
            grade={grade}
            selectedPreset={selectedPreset}
            showOriginal={showOriginal}
            previewFilter={previewFilter}
            previewOverlay={previewOverlay}
          />

          <div className="space-y-4">
            <PresetsCard
              selectedPreset={selectedPreset}
              onApplyPreset={applyPreset}
            />
            <BasicAdjustmentsCard
              grade={grade}
              onReset={resetGrade}
              onUpdate={updateGrade}
            />
            <ColorWheelsCard grade={grade} onUpdate={updateGrade} />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default ColorGradingPreview;
