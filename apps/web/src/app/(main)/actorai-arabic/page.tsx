"use client";

/**
 * الصفحة: actorai-arabic
 * الهوية: نقطة دخول موحدة لاستوديو الممثل مع قشرة تحميل متسقة مع بقية المنصة
 * المتغيرات الخاصة المضافة: --page-accent, --page-accent-2, --page-bg, --page-border
 * مكونات Aceternity المستخدمة: BackgroundBeams, NoiseBackground, CardSpotlight
 */

import dynamic from "next/dynamic";
import { BackgroundBeams } from "@/components/aceternity/background-beams";
import { NoiseBackground } from "@/components/aceternity/noise-background";
import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { DottedGlowBackground } from "@/components/ui/dotted-glow-background";

const ActorAiArabicStudio = dynamic(
  () => import("./components/ActorAiArabicStudioV2"),
  {
    loading: () => (
      <main
        role="main"
        dir="rtl"
        className="relative isolate min-h-screen overflow-hidden bg-[var(--background,oklch(0.145_0_0))]"
        style={{
          ["--page-accent" as string]: "var(--accent-technical, #3b5bdb)",
          ["--page-accent-2" as string]: "var(--brand-teal, #40a5b3)",
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
        <div className="absolute inset-0 opacity-60 pointer-events-none">
          <BackgroundBeams />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,91,219,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(64,165,179,0.16),transparent_34%)]" />

        <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
          <CardSpotlight className="w-full max-w-2xl overflow-hidden rounded-[30px] border border-[var(--page-border)] bg-black/34 p-8 text-center shadow-[0_20px_80px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
            <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-2 border-[var(--page-accent)] border-t-transparent" />
            <h1 className="text-3xl font-bold text-white md:text-4xl">
              استوديو الممثل العربي
            </h1>
            <p className="mt-3 text-sm leading-7 text-white/66 md:text-base">
              جارٍ تحميل بيئة التدريب والأداء داخل قشرة بصرية موحدة مع المنصة.
            </p>
          </CardSpotlight>
        </div>
      </main>
    ),
    ssr: false,
  }
);

export default function ActoraiArabicPage() {
  return <ActorAiArabicStudio />;
}
