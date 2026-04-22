"use client";

import { Clapperboard, Layers3, Sparkles } from "lucide-react";
import { DottedGlowBackground } from "@/components/ui/dotted-glow-background";

export function WorkspaceGlowCard() {
  return (
    <div className="relative w-full max-w-[25rem] overflow-hidden rounded-[30px] border border-white/10 bg-black/30 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.32)] backdrop-blur-xl">
      <div className="relative z-20 flex min-h-[18rem] flex-col justify-between gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold tracking-[0.32em] text-white/38">
              واجهة تشغيل حية
            </p>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-white">
                طبقة توهج للبريكداون
              </h2>
              <p className="max-w-[18rem] text-sm leading-7 text-white/60">
                خلفية نقطية ديناميكية تؤكد أن مساحة العمل نشطة ومتصلة بالقشرة
                البصرية الموحدة للمسار.
              </p>
            </div>
          </div>

          <div className="flex size-14 items-center justify-center rounded-2xl border border-white/12 bg-white/10 text-[var(--page-accent)] backdrop-blur-md">
            <Clapperboard className="h-6 w-6" />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-black/25 p-4 backdrop-blur-sm">
            <div className="mb-3 flex size-10 items-center justify-center rounded-2xl bg-white/10 text-[var(--page-accent-2)]">
              <Layers3 className="h-4 w-4" />
            </div>
            <p className="text-sm font-semibold text-white">طبقة عرض إضافية</p>
            <p className="mt-2 text-xs leading-6 text-white/55">
              تندمج مع الهيدر من دون كسر البنية الحالية.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/25 p-4 backdrop-blur-sm">
            <div className="mb-3 flex size-10 items-center justify-center rounded-2xl bg-white/10 text-[var(--page-accent)]">
              <Sparkles className="h-4 w-4" />
            </div>
            <p className="text-sm font-semibold text-white">
              إشارة بصرية مباشرة
            </p>
            <p className="mt-2 text-xs leading-6 text-white/55">
              تعزز الإحساس بالحركة قبل الدخول إلى مساحة التفكيك.
            </p>
          </div>
        </div>
      </div>

      <DottedGlowBackground
        className="pointer-events-none mask-radial-at-center mask-radial-to-90pct"
        opacity={0.95}
        gap={10}
        radius={1.55}
        color="rgba(255,255,255,0.18)"
        darkColor="rgba(255,255,255,0.18)"
        glowColor="rgba(59,91,219,0.78)"
        darkGlowColor="rgba(116,104,66,0.88)"
        backgroundOpacity={0}
        speedMin={0.35}
        speedMax={1.45}
        speedScale={1}
      />
    </div>
  );
}
