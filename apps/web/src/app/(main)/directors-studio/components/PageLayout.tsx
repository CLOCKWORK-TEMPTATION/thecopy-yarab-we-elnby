"use client";

/**
 * الصفحة: directors-studio / PageLayout
 * الهوية: إطار إخراجي تنفيذي موحد مع Hero سينمائي ومحتوى داخل قشرة زجاجية داكنة
 * المتغيرات الخاصة المضافة: --page-accent, --page-accent-2, --page-bg, --page-surface, --page-border
 * مكونات Aceternity المستخدمة: BackgroundBeams, NoiseBackground, CardSpotlight
 */

import type { CSSProperties, ReactNode } from "react";
import DashboardHero from "./DashboardHero";
import { BackgroundBeams } from "@/components/aceternity/background-beams";
import { NoiseBackground } from "@/components/aceternity/noise-background";
import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { DottedGlowBackground } from "@/components/ui/dotted-glow-background";

interface PageLayoutProps {
  children: ReactNode;
}

const layoutStyle: CSSProperties = {
  ["--page-accent" as string]: "var(--brand-bronze, #746842)",
  ["--page-accent-2" as string]: "var(--brand, #029784)",
  ["--page-bg" as string]: "var(--background, oklch(0.145 0 0))",
  ["--page-surface" as string]: "rgba(10, 14, 22, 0.76)",
  ["--page-border" as string]: "rgba(255,255,255,0.08)",
};

export function PageLayout({ children }: PageLayoutProps) {
  return (
    <div
      style={layoutStyle}
      className="relative isolate min-h-screen overflow-hidden bg-[var(--page-bg)] text-[var(--foreground,white)]"
    >
      <NoiseBackground />
      <DottedGlowBackground
        className="pointer-events-none mask-radial-to-90pct mask-radial-at-center"
        opacity={1}
        gap={10}
        radius={1.6}
        colorLightVar="--color-neutral-500"
        glowColorLightVar="--color-neutral-600"
        colorDarkVar="--color-neutral-500"
        glowColorDarkVar="--color-sky-800"
        backgroundOpacity={0}
        speedMin={0.3}
        speedMax={1.6}
        speedScale={1}
      />
      <div className="absolute inset-0 opacity-70 pointer-events-none">
        <BackgroundBeams />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(116,104,66,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(2,151,132,0.18),transparent_34%)] pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
        <div className="space-y-8">
          <CardSpotlight className="overflow-hidden rounded-[28px] border border-[var(--page-border)] bg-[var(--page-surface)] shadow-[0_18px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
            <DashboardHero />
          </CardSpotlight>

          <CardSpotlight className="overflow-hidden rounded-[28px] border border-[var(--page-border)] bg-[color:rgba(9,12,18,0.72)] p-5 shadow-[0_18px_80px_rgba(0,0,0,0.32)] backdrop-blur-2xl md:p-6">
            {children}
          </CardSpotlight>
        </div>
      </div>
    </div>
  );
}
