"use client";

/**
 * الصفحة: breakdown
 * الهوية: مساحة تفكيك إنتاجية بطابع صناعي/تشغيلي داخل قشرة موحدة مع المنصة
 * المتغيرات الخاصة المضافة: --page-accent, --page-accent-2, --page-bg, --page-border
 * مكونات Aceternity المستخدمة: BackgroundBeams, NoiseBackground, CardSpotlight
 */

import { Clapperboard, FileText, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { BackgroundBeams } from "@/components/aceternity/background-beams";
import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { NoiseBackground } from "@/components/aceternity/noise-background";
import { DottedGlowBackground } from "@/components/ui/dotted-glow-background";

import BreakdownApp from "./App";
import BreakdownContent from "./breakdown-content";
import { BreakdownLoadingState } from "./breakdown-ui";
import appMetadata from "./metadata.json";
import {
  ViewSwitcher,
  VIEW_CONFIG,
  type BreakdownView,
} from "./presentation/shared/view-switcher";
import { WorkspaceGlowCard } from "./presentation/shared/workspace-glow-card";

export default function BreakdownPage() {
  const [activeView, setActiveView] = useState<BreakdownView>("workspace");
  const [isClientReady, setIsClientReady] = useState(false);

  const activeViewConfig = useMemo(() => {
    const fallbackViewConfig = VIEW_CONFIG[0];
    if (!fallbackViewConfig) {
      return null;
    }
    return VIEW_CONFIG.find((v) => v.id === activeView) ?? fallbackViewConfig;
  }, [activeView]);

  useEffect(() => {
    setTimeout(() => { ; }, 0);
  }, []);

  if (!activeViewConfig) {
    return null;
  }

  return (
    <main
      dir="rtl"
      className="relative isolate min-h-screen overflow-hidden bg-[var(--background,oklch(0.145_0_0))]"
      style={{
        ["--page-accent" as string]: "var(--brand-bronze, #746842)",
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
      <div className="absolute inset-0 opacity-60 pointer-events-none">
        <BackgroundBeams />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(116,104,66,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(59,91,219,0.16),transparent_32%)]" />

      <div className="relative z-10 mx-auto max-w-[1600px] px-4 py-4 md:px-6 md:py-6">
        <div className="space-y-6">
          <CardSpotlight className="overflow-hidden rounded-[32px] border border-[var(--page-border)] bg-black/30 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.34)] backdrop-blur-2xl md:p-8">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,400px)] xl:items-start">
              <div className="space-y-4">
                <div className="space-y-3">
                  <p className="text-[11px] font-semibold tracking-[0.34em] text-white/38">
                    BREAKDOWN WORKSPACE
                  </p>
                  <h1 className="text-4xl font-bold leading-tight text-white md:text-5xl">
                    {appMetadata.name}
                  </h1>
                  <p className="max-w-3xl text-base leading-8 text-white/68 md:text-lg">
                    {appMetadata.description}
                  </p>
                  <p className="text-sm leading-7 text-white/55">
                    {activeViewConfig.description}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/8 bg-white/6 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-white/42">المسار</p>
                      <Clapperboard className="h-4 w-4 text-[var(--page-accent)]" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-white">
                      Production Workflow
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/6 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-white/42">الوضع الحالي</p>
                      <FileText className="h-4 w-4 text-[var(--page-accent-2)]" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-white">
                      {activeViewConfig.label}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/6 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-white/42">الهوية</p>
                      <Sparkles className="h-4 w-4 text-[var(--page-accent)]" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-white">
                      Unified Industrial Shell
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 xl:items-end">
                <ViewSwitcher
                  activeView={activeView}
                  onSelect={setActiveView}
                />
                <WorkspaceGlowCard />
              </div>
            </div>
          </CardSpotlight>

          <CardSpotlight className="overflow-hidden rounded-[32px] border border-[var(--page-border)] bg-black/24 shadow-[0_20px_80px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
            {!isClientReady ? (
              <div className="p-6 md:p-8">
                <BreakdownLoadingState />
              </div>
            ) : activeView === "workspace" ? (
              <BreakdownApp />
            ) : (
              <div className="p-6 md:p-8">
                <BreakdownContent />
              </div>
            )}
          </CardSpotlight>
        </div>
      </div>
    </main>
  );
}
