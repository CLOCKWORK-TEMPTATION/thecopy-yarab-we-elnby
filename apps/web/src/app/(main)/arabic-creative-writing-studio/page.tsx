"use client";

/**
 * الصفحة: arabic-creative-writing-studio
 * الهوية: بوابة استوديو كتابة إبداعية بطابع أدبي/إلهامي داخل قشرة موحدة
 * المتغيرات الخاصة المضافة: --page-accent, --page-accent-2, --page-border
 * مكونات Aceternity المستخدمة: BackgroundBeams, NoiseBackground, CardSpotlight
 */

import dynamic from "next/dynamic";
import { BackgroundBeams } from "@/components/aceternity/background-beams";
import { NoiseBackground } from "@/components/aceternity/noise-background";
import { CardSpotlight } from "@/components/aceternity/card-spotlight";

const CreativeWritingStudio = dynamic(
  () =>
    import("./components/CreativeWritingStudio").then((mod) => ({
      default: mod.CreativeWritingStudio,
    })),
  {
    loading: () => (
      <div className="flex items-center justify-center min-h-[520px] px-6 py-12">
        <CardSpotlight className="w-full max-w-2xl overflow-hidden rounded-[30px] border border-[var(--page-border)] bg-black/34 p-8 text-center shadow-[0_20px_80px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
          <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-2 border-[var(--page-accent)] border-t-transparent" />
          <h1 className="text-3xl font-bold text-white md:text-4xl">
            استوديو الكتابة الإبداعية
          </h1>
          <p className="mt-3 text-sm leading-7 text-white/66 md:text-base">
            جارٍ تحميل بيئة الكتابة الإبداعية داخل قشرة بصرية موحدة مع المنصة.
          </p>
        </CardSpotlight>
      </div>
    ),
    ssr: false,
  }
);

export default function ArabicCreativeWritingStudioPage() {
  return (
    <main
      dir="rtl"
      className="relative isolate min-h-screen overflow-hidden bg-[var(--background,oklch(0.145_0_0))]"
      style={{
        ["--page-accent" as string]: "var(--accent-creative, #c2255c)",
        ["--page-accent-2" as string]: "var(--brand-teal, #40a5b3)",
        ["--page-border" as string]: "rgba(255,255,255,0.08)",
      }}
    >
      <NoiseBackground />
      <div className="absolute inset-0 opacity-60 pointer-events-none">
        <BackgroundBeams />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(194,37,92,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(64,165,179,0.16),transparent_34%)]" />

      <div className="relative z-10 mx-auto max-w-[1600px] px-4 py-4 md:px-6 md:py-6">
        <div className="space-y-6">
          <CardSpotlight className="overflow-hidden rounded-[32px] border border-[var(--page-border)] bg-black/30 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.34)] backdrop-blur-2xl md:p-8">
            <div className="space-y-3 text-right">
              <p className="text-[11px] font-semibold tracking-[0.34em] text-white/38">
                CREATIVE WRITING STUDIO
              </p>
              <h1 className="text-4xl font-bold leading-tight text-white md:text-5xl">
                مساحة كتابة موحدة بنبرة إبداعية
              </h1>
              <p className="max-w-4xl text-base leading-8 text-white/68 md:text-lg">
                قشرة موحدة تمنح الاستوديو طابعًا أدبيًا واضحًا مع الحفاظ على نفس
                نواة المنصة اللونية والحركية المستمدة من مرجع المحرر.
              </p>
            </div>
          </CardSpotlight>

          <CardSpotlight className="overflow-hidden rounded-[32px] border border-[var(--page-border)] bg-black/24 shadow-[0_20px_80px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
            <CreativeWritingStudio />
          </CardSpotlight>
        </div>
      </div>
    </main>
  );
}
