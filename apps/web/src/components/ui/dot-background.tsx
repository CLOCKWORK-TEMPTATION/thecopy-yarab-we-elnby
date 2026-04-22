"use client";

import { cn } from "@/lib/utils";

/**
 * Dot-background pattern from Aceternity UI.
 * Renders a subtle radial-dot grid that adapts to the current theme.
 * Intended as an ambient background layer behind content.
 */
export function DotBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div
        className={cn(
          "absolute inset-0",
          "[background-size:20px_20px]",
          "[background-image:radial-gradient(#d4d4d4_1px,transparent_1px)]",
          "dark:[background-image:radial-gradient(#404040_1px,transparent_1px)]"
        )}
      />
      {/* Radial fade mask — softens the centre where the white page sits */}
      <div
        className="absolute inset-0"
        style={{
          maskImage:
            "radial-gradient(ellipse at center, transparent 20%, black)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, transparent 20%, black)",
        }}
      />
    </div>
  );
}
