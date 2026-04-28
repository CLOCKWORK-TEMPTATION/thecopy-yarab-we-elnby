import { Wand2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { LUT_PRESETS } from "./constants";

interface PresetsCardProps {
  selectedPreset: string;
  onApplyPreset: (presetId: string) => void;
}

export function PresetsCard({ selectedPreset, onApplyPreset }: PresetsCardProps) {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-amber-500 flex items-center gap-2">
          <Wand2 className="h-4 w-4" />
          قوالب الأفلام الشهيرة
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {LUT_PRESETS.map((preset) => (
            <Tooltip key={preset.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onApplyPreset(preset.id)}
                  className={cn(
                    "p-2 rounded-lg border text-left transition-all",
                    selectedPreset === preset.id
                      ? "bg-amber-500/20 border-amber-500"
                      : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ background: preset.primaryColor }}
                    />
                    <span className="text-xs text-zinc-200 truncate">{preset.nameAr}</span>
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <div className="space-y-1">
                  <p className="font-medium">{preset.name}</p>
                  {preset.film ? (
                    <p className="text-xs text-muted-foreground">{preset.film}</p>
                  ) : null}
                  <p className="text-xs">{preset.description}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
