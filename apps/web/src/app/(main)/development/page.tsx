"use client";

/**
 * الصفحة: development
 * الهوية: استوديو تطوير إبداعي بطابع مختبر/معالجة داخل قشرة موحدة
 * المتغيرات الخاصة المضافة: --page-accent, --page-accent-2, --page-border
 * مكونات Aceternity المستخدمة: BackgroundBeams, NoiseBackground, CardSpotlight
 */

import dynamic from "next/dynamic";

import { BackgroundBeams } from "@/components/aceternity/background-beams";
import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { NoiseBackground } from "@/components/aceternity/noise-background";
import { DottedGlowBackground } from "@/components/ui/dotted-glow-background";

const CreativeDevelopment = dynamic(() => import("./creative-development"), {
  loading: () => (
    <div className="flex items-center justify-center min-h-[520px] px-6 py-12">
      <CardSpotlight className="w-full max-w-2xl overflow-hidden rounded-[30px] border border-[var(--page-border)] bg-black/34 p-8 text-center shadow-[0_20px_80px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
        <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-2 border-[var(--page-accent)] border-t-transparent" />
        <h1 className="text-3xl font-bold text-white md:text-4xl">
          أدوات التطوير الإبداعي
        </h1>
        <p className="mt-3 text-sm leading-7 text-white/66 md:text-base">
          جارٍ تحميل بيئة التطوير الإبداعي داخل قشرة موحدة بالمنصة.
        </p>
      </CardSpotlight>
    </div>
  ),
  ssr: false,
});

export default function DevelopmentPage() {
  return (
    <main
      dir="rtl"
      className="relative isolate min-h-screen overflow-hidden bg-[var(--background,oklch(0.145_0_0))]"
      style={{
        ["--page-accent" as string]: "var(--accent-creative, #c2255c)",
        ["--page-accent-2" as string]: "var(--accent-technical, #3b5bdb)",
        ["--page-border" as string]: "rgba(255,255,255,0.08)",
      }}
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
      <div className="absolute inset-0 opacity-62 pointer-events-none">
        <BackgroundBeams />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(194,37,92,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(59,91,219,0.16),transparent_34%)]" />

      <div className="relative z-10 mx-auto max-w-[1600px] px-4 py-4 md:px-6 md:py-6">
        <div className="space-y-6">
          <CardSpotlight className="overflow-hidden rounded-[32px] border border-[var(--page-border)] bg-black/30 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.34)] backdrop-blur-2xl md:p-8">
            <div className="space-y-3 text-right">
              <p className="text-[11px] font-semibold tracking-[0.34em] text-white/38">
                CREATIVE DEVELOPMENT LAB
              </p>
              <h1 className="text-4xl font-bold leading-tight text-white md:text-5xl">
                مختبر تطوير النصوص الدرامية
              </h1>
              <p className="max-w-4xl text-base leading-8 text-white/68 md:text-lg">
                نفس نواة المنصة، لكن بنبرة مختبرية أدق مناسبة لتراكم التقارير
                والمهام والوكلاء ومعالجة النتائج الإبداعية.
              </p>
            </div>
          </CardSpotlight>

          <CardSpotlight className="overflow-hidden rounded-[32px] border border-[var(--page-border)] bg-black/24 shadow-[0_20px_80px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
            <div className="p-2 md:p-4">
              <CreativeDevelopment />
            </div>
          </CardSpotlight>
        </div>
      </div>
    </main>
  );
}
