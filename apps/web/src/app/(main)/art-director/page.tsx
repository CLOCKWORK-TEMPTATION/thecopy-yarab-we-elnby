"use client";

/**
 * الصفحة: art-director
 * الهوية: استوديو مدير فن سينمائي بطبقة افتتاحية موحدة مع بقية المنصة
 * المتغيرات الخاصة المضافة: تعتمد على طبقة الصفحة الداخلية داخل art-director-studio.css
 * مكونات Aceternity المستخدمة: BackgroundBeams, NoiseBackground
 */

import dynamic from "next/dynamic";
import { BackgroundBeams } from "@/components/aceternity/background-beams";
import { NoiseBackground } from "@/components/aceternity/noise-background";
import { DottedGlowBackground } from "@/components/ui/dotted-glow-background";

const ArtDirectorStudio = dynamic(() => import("./art-director-studio"), {
  loading: () => (
    <main className="relative isolate min-h-screen overflow-hidden bg-[var(--background,oklch(0.145_0_0))] text-white">
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
      <div className="absolute inset-0 opacity-70">
        <BackgroundBeams />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(194,37,92,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(116,104,66,0.22),transparent_30%)]" />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-xl rounded-[28px] border border-white/10 bg-black/35 p-8 text-center shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
          <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-2 border-[var(--accent-creative,#c2255c)] border-t-transparent" />
          <h1 className="text-3xl font-bold tracking-tight">CineArchitect</h1>
          <p className="mt-3 text-sm leading-7 text-white/65">
            جارٍ تحميل استوديو مدير الفن داخل القشرة البصرية الموحدة للمنصة.
          </p>
        </div>
      </div>
    </main>
  ),
  ssr: false,
});

export default function ArtDirectorPage() {
  return <ArtDirectorStudio />;
}
