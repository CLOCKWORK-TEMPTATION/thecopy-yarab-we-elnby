import React from "react";
import { HelpCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ConfidenceMeterProps {
  type: "cognitive" | "aleatoric";
  level: "low" | "mid" | "high";
  value?: number;
  showTooltip?: boolean;
}

const typeLabels = {
  cognitive: "ثقة معرفية",
  aleatoric: "ثقة عشوائية",
};

const typeDefinitions = {
  cognitive: "مدى معرفة النموذج بالموضوع (قابلة للتحسين بالتدريب)",
  aleatoric: "عدم اليقين الطبيعي في البيانات (غير قابلة للاختزال)",
};

const levelColors = {
  low: "var(--state-flagged)",
  mid: "var(--state-alt)",
  high: "var(--state-final)",
};

const levelValues = {
  low: 30,
  mid: 65,
  high: 90,
};

export function ConfidenceMeter({
  type,
  level,
  value,
  showTooltip = true,
}: ConfidenceMeterProps) {
  const displayValue = value !== undefined ? value : levelValues[level];
  const color = levelColors[level];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[var(--color-text)]" dir="rtl">
            {typeLabels[type]}
          </span>
          {showTooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors">
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  className="bg-[var(--color-panel)] border-[var(--color-surface)] text-[var(--color-text)] max-w-xs"
                  dir="rtl"
                >
                  <p>{typeDefinitions[type]}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <span className="text-[var(--color-muted)]">{displayValue}%</span>
      </div>

      <div className="relative">
        <Progress
          value={displayValue}
          className="h-3"
          style={
            {
              "--progress-color": color,
            } as React.CSSProperties
          }
        />
      </div>

      <div className="flex items-center justify-between text-[var(--color-muted)]">
        <span>منخفض</span>
        <span>متوسط</span>
        <span>عالي</span>
      </div>
    </div>
  );
}
