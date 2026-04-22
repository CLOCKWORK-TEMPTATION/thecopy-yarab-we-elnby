"use client";

/**
 * الصفحة: brain-storm-ai
 * الهوية: قشرة مناظرة/شبكة أفكار متعددة الوكلاء داخل طبقة موحدة زجاجية داكنة
 * المتغيرات الخاصة المضافة: --page-accent, --page-accent-2, --page-bg, --page-border
 * مكونات Aceternity المستخدمة: BackgroundBeams, NoiseBackground, CardSpotlight
 */

import dynamic from "next/dynamic";
import type { CSSProperties } from "react";
import { BackgroundBeams } from "@/components/aceternity/background-beams";
import { NoiseBackground } from "@/components/aceternity/noise-background";
import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { DottedGlowBackground } from "@/components/ui/dotted-glow-background";

const shellStyle: CSSProperties = {
  ["--page-accent" as string]: "var(--accent-technical, #3b5bdb)",
  ["--page-accent-2" as string]: "var(--accent-creative, #c2255c)",
  ["--page-bg" as string]: "var(--background, oklch(0.145 0 0))",
  ["--page-border" as string]: "rgba(255,255,255,0.08)",
};

const BrainStormContent = dynamic(
  () => import("./src/components/BrainStormContent"),
  {
    loading: () => (
      <div className="flex items-center justify-center min-h-[520px] px-6 py-10">
        <CardSpotlight className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-[var(--page-border)] bg-black/34 p-8 text-center shadow-[0_20px_80px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
          <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-2 border-[var(--page-accent)] border-t-transparent" />
          <h1 className="text-3xl font-bold text-white md:text-4xl">
            منصة العصف الذهني الذكي
          </h1>
          <p className="mt-3 text-sm leading-7 text-white/66 md:text-base">
            جاري تحميل شبكة الوكلاء، أطوار الجلسة، ولوحة النقاش داخل القشرة
            البصرية الموحدة.
          </p>
        </CardSpotlight>
      </div>
    ),
    ssr: false,
  }
);

export default function BrainStormPage() {
  return (
    <main
      style={shellStyle}
      className="relative isolate min-h-screen overflow-hidden bg-[var(--page-bg)]"
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
      <div className="absolute inset-0 opacity-60 pointer-events-none">
        <BackgroundBeams />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,91,219,0.18),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(194,37,92,0.16),transparent_32%)] pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-[1600px] px-4 py-4 md:px-6 md:py-6">
        <CardSpotlight className="overflow-hidden rounded-[32px] border border-[var(--page-border)] bg-black/24 shadow-[0_20px_80px_rgba(0,0,0,0.34)] backdrop-blur-2xl">
          <BrainStormContent />
        </CardSpotlight>
      </div>
    </main>
  );
}
