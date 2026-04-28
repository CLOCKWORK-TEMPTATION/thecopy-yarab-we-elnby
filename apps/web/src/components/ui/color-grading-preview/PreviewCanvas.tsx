import { Film } from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

import { LUT_PRESETS } from "./constants";
import { seededAmplitude } from "./helpers";

import type { ColorGrade } from "./types";

interface PreviewCanvasProps {
  grade: ColorGrade;
  selectedPreset: string;
  showOriginal: boolean;
  previewFilter: string;
  previewOverlay: React.CSSProperties;
}

export function PreviewCanvas({
  grade,
  selectedPreset,
  showOriginal,
  previewFilter,
  previewOverlay,
}: PreviewCanvasProps) {
  return (
    <Card className="lg:col-span-2 bg-zinc-900 border-zinc-800 overflow-hidden">
      <CardContent className="p-0">
        <div className="relative aspect-video bg-black overflow-hidden">
          <div
            className="absolute inset-0 transition-all duration-300"
            style={{
              background: `
                linear-gradient(135deg,
                  hsl(${200 + grade.temperature}, 40%, 30%) 0%,
                  hsl(${30 + grade.temperature}, 50%, 40%) 50%,
                  hsl(${280 + grade.temperature}, 30%, 20%) 100%
                )
              `,
              filter: previewFilter,
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="grid grid-cols-3 gap-4 p-8 w-full max-w-2xl">
                <div className="aspect-square rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-900 shadow-lg" />
                <div className="aspect-square rounded-lg bg-gradient-to-br from-zinc-500 to-zinc-600 shadow-lg" />
                <div className="aspect-square rounded-lg bg-gradient-to-br from-zinc-200 to-zinc-100 shadow-lg" />

                <div
                  className="aspect-square rounded-full shadow-lg col-start-2"
                  style={{
                    background: `linear-gradient(135deg,
                      hsl(${25 + grade.highlightHue * 0.2}, ${50 + grade.saturation * 0.2}%, 70%) 0%,
                      hsl(${20 + grade.shadowHue * 0.1}, ${40 + grade.saturation * 0.1}%, 50%) 100%
                    )`,
                  }}
                />
              </div>
            </div>

            <div className="absolute inset-0" style={previewOverlay} />
          </div>

          {showOriginal ? (
            <div className="absolute inset-0 flex">
              <div className="w-1/2 overflow-hidden border-r-2 border-white/50">
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-600 via-amber-700/30 to-zinc-800" />
              </div>
              <div
                className="w-1/2 overflow-hidden"
                style={{
                  background: `linear-gradient(135deg,
                    hsl(${200 + grade.temperature}, 40%, 30%) 0%,
                    hsl(${30 + grade.temperature}, 50%, 40%) 50%,
                    hsl(${280 + grade.temperature}, 30%, 20%) 100%
                  )`,
                  filter: previewFilter,
                }}
              />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 px-3 py-1 rounded-full text-xs text-white">
                قبل / بعد
              </div>
            </div>
          ) : null}

          <div className="absolute bottom-4 right-4 w-32 h-16 bg-black/60 rounded border border-white/10 overflow-hidden">
            <svg className="w-full h-full" viewBox="0 0 100 40">
              <path
                d={`M 0 40 ${Array.from(
                  { length: 20 },
                  (_, index) =>
                    `L ${index * 5} ${40 - seededAmplitude(index, 12.9898, 20) - grade.highlights * 0.1}`
                ).join(" ")} L 100 40 Z`}
                fill="rgba(255,0,0,0.3)"
              />
              <path
                d={`M 0 40 ${Array.from(
                  { length: 20 },
                  (_, index) =>
                    `L ${index * 5} ${40 - seededAmplitude(index, 78.233, 25) - grade.shadows * 0.1}`
                ).join(" ")} L 100 40 Z`}
                fill="rgba(0,255,0,0.3)"
              />
              <path
                d={`M 0 40 ${Array.from(
                  { length: 20 },
                  (_, index) => `L ${index * 5} ${40 - seededAmplitude(index, 37.719, 22)}`
                ).join(" ")} L 100 40 Z`}
                fill="rgba(0,0,255,0.3)"
              />
            </svg>
          </div>

          <div className="absolute top-4 left-4">
            {selectedPreset ? (
              <Badge className="bg-black/60 text-white border-0">
                <Film className="h-3 w-3 ml-1" />
                {LUT_PRESETS.find((preset) => preset.id === selectedPreset)?.nameAr}
              </Badge>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
