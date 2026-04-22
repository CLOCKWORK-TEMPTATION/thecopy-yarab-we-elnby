"use client";

/**
 * الصفحة: analysis
 * الهوية: خط أنابيب تحليل درامي بطابع تشخيصي صارم داخل قشرة موحدة
 * المتغيرات الخاصة المضافة: --page-accent, --page-accent-2, --page-bg, --page-border
 * مكونات Aceternity المستخدمة: BackgroundBeams, NoiseBackground, CardSpotlight
 */

import SevenStations from "./seven-stations";
import { BackgroundBeams } from "@/components/aceternity/background-beams";
import { NoiseBackground } from "@/components/aceternity/noise-background";
import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { DottedGlowBackground } from "@/components/ui/dotted-glow-background";
import { AreaChart, BrainCircuit, Gauge, Network } from "lucide-react";

const METRICS = [
  { label: "محطات التحليل", value: "7", icon: AreaChart },
  { label: "الطابع", value: "Diagnostic", icon: Gauge },
  { label: "البنية", value: "Pipeline", icon: Network },
  { label: "المنهج", value: "Deep Analysis", icon: BrainCircuit },
] as const;

export default function AnalysisPage() {
  return (
    <main
      dir="rtl"
      className="relative isolate min-h-screen overflow-hidden bg-[var(--background,oklch(0.145_0_0))]"
      style={{
        ["--page-accent" as string]: "var(--accent-technical, #3b5bdb)",
        ["--page-accent-2" as string]: "var(--brand, #029784)",
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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,91,219,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(2,151,132,0.16),transparent_34%)]" />

      <div className="relative z-10 mx-auto max-w-[1600px] px-4 py-4 md:px-6 md:py-6">
        <div className="space-y-6">
          <CardSpotlight className="overflow-hidden rounded-[32px] border border-[var(--page-border)] bg-black/30 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.34)] backdrop-blur-2xl md:p-8">
            <div className="space-y-5 text-right">
              <div className="space-y-3">
                <p className="text-[11px] font-semibold tracking-[0.34em] text-white/38">
                  ANALYSIS PIPELINE
                </p>
                <h1 className="text-4xl font-bold leading-tight text-white md:text-5xl">
                  المحطات السبع للتحليل الدرامي
                </h1>
                <p className="max-w-4xl text-base leading-8 text-white/68 md:text-lg">
                  قشرة تحليل موحدة داخل المنصة، تحافظ على الجدية التشخيصية
                  للواجهة وتضع خط الأنابيب داخل بيئة بصرية أدق وأكثر اتساقًا مع
                  هوية المحرر المرجعي.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                {METRICS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-white/8 bg-white/6 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs text-white/42">{item.label}</p>
                        <Icon className="h-4 w-4 text-[var(--page-accent)]" />
                      </div>
                      <p className="mt-3 text-sm font-semibold text-white">
                        {item.value}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardSpotlight>

          <CardSpotlight className="overflow-hidden rounded-[32px] border border-[var(--page-border)] bg-black/24 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.32)] backdrop-blur-2xl md:p-6">
            <SevenStations />
          </CardSpotlight>
        </div>
      </div>
    </main>
  );
}
