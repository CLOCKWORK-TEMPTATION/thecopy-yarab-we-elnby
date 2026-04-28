import { Circle } from "lucide-react";

import { cn } from "@/lib/utils";

import type { LensSettings } from "./types";

interface LensViewportProps {
  title: string;
  titleAr: string;
  aspectClassName: string;
  settings: LensSettings;
  fov: number;
  distortion: number;
  highlighted?: boolean;
}

export function LensViewport({
  title,
  titleAr,
  aspectClassName,
  settings,
  fov,
  distortion,
  highlighted = false,
}: LensViewportProps) {
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
