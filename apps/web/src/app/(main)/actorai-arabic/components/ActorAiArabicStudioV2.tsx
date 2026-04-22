"use client";

/**
 * الصفحة: actorai-arabic / ActorAiArabicStudioV2
 * الهوية: استوديو أداء وتدريب بطابع تقني/أدائي ضمن نظام بصري موحد
 * المتغيرات الخاصة المضافة: --page-accent, --page-accent-2, --page-bg, --page-surface, --page-border
 * مكونات Aceternity المستخدمة: BackgroundBeams, NoiseBackground, CardSpotlight
 */

import React, { lazy, Suspense, useMemo } from "react";
import { AppProvider, useApp } from "../context/AppContext";
import { AppHeader } from "../layout/AppHeader";
import { AppFooter } from "../layout/AppFooter";
import { NotificationBanner } from "../layout/NotificationBanner";
import type { ViewType } from "../types";
import { BackgroundBeams } from "@/components/aceternity/background-beams";
import { NoiseBackground } from "@/components/aceternity/noise-background";
import { CardSpotlight } from "@/components/aceternity/card-spotlight";

const HomeView = lazy(() =>
  import("../features/home").then((m) => ({ default: m.HomeView }))
);
const DemoView = lazy(() =>
  import("../features/demo").then((m) => ({ default: m.DemoView }))
);
const LoginForm = lazy(() =>
  import("../features/auth").then((m) => ({ default: m.LoginForm }))
);
const RegisterForm = lazy(() =>
  import("../features/auth").then((m) => ({ default: m.RegisterForm }))
);
const VocalExercisesView = lazy(() =>
  import("../features/vocal").then((m) => ({
    default: m.VocalExercisesView,
  }))
);
const VoiceCoachView = lazy(() =>
  import("../features/voicecoach").then((m) => ({
    default: m.VoiceCoachView,
  }))
);
const SceneRhythmView = lazy(() =>
  import("../features/rhythm").then((m) => ({
    default: m.SceneRhythmView,
  }))
);
const WebcamAnalysisView = lazy(() =>
  import("../features/webcam").then((m) => ({
    default: m.WebcamAnalysisView,
  }))
);
const ARTrainingView = lazy(() =>
  import("../features/ar").then((m) => ({ default: m.ARTrainingView }))
);
const DashboardView = lazy(() =>
  import("../features/dashboard").then((m) => ({
    default: m.DashboardView,
  }))
);
const MemorizationView = lazy(() =>
  import("../features/memorization").then((m) => ({
    default: m.MemorizationView,
  }))
);

const VIEW_MAP: Record<
  ViewType,
  React.LazyExoticComponent<React.ComponentType>
> = {
  home: HomeView,
  demo: DemoView,
  login: LoginForm,
  register: RegisterForm,
  vocal: VocalExercisesView,
  voicecoach: VoiceCoachView,
  rhythm: SceneRhythmView,
  webcam: WebcamAnalysisView,
  ar: ARTrainingView,
  dashboard: DashboardView,
  memorization: MemorizationView,
};

function ViewSkeleton() {
  return (
    <div className="space-y-5 py-6 animate-pulse">
      <div className="h-8 w-1/3 rounded-xl bg-white/8" />
      <div className="h-72 rounded-[24px] bg-white/6" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-32 rounded-[20px] bg-white/6" />
        <div className="h-32 rounded-[20px] bg-white/6" />
        <div className="h-32 rounded-[20px] bg-white/6" />
      </div>
    </div>
  );
}

function AppShell() {
  const { currentView, theme } = useApp();
  const ViewComponent = useMemo(() => VIEW_MAP[currentView], [currentView]);

  return (
    <div
      dir="rtl"
      className={`relative isolate min-h-screen overflow-hidden ${theme === "dark" ? "dark" : ""}`}
      style={{
        ["--page-accent" as string]: "var(--accent-technical, #3b5bdb)",
        ["--page-accent-2" as string]: "var(--brand-teal, #40a5b3)",
        ["--page-bg" as string]: "var(--background, oklch(0.145 0 0))",
        ["--page-surface" as string]: "rgba(9, 14, 24, 0.74)",
        ["--page-border" as string]: "rgba(255,255,255,0.08)",
      }}
    >
      <NoiseBackground />
      <div className="absolute inset-0 opacity-60 pointer-events-none">
        <BackgroundBeams />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,91,219,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(64,165,179,0.14),transparent_32%)]" />

      <div className="relative z-10 mx-auto max-w-[1600px] px-4 py-4 md:px-6 md:py-6">
        <CardSpotlight className="overflow-hidden rounded-[32px] border border-[var(--page-border)] bg-black/24 shadow-[0_20px_80px_rgba(0,0,0,0.34)] backdrop-blur-2xl">
          <AppHeader />
          <NotificationBanner />

          <div className="px-4 pb-4 md:px-6 md:pb-6">
            <CardSpotlight className="overflow-hidden rounded-[28px] border border-white/8 bg-[var(--page-surface)] p-4 backdrop-blur-xl md:p-6">
              <main className="container mx-auto px-1 py-2 md:px-2 md:py-4">
                <Suspense fallback={<ViewSkeleton />}>
                  <ViewComponent />
                </Suspense>
              </main>
            </CardSpotlight>
          </div>

          <div className="px-4 pb-4 md:px-6 md:pb-6">
            <AppFooter />
          </div>
        </CardSpotlight>
      </div>
    </div>
  );
}

export default function ActorAiArabicStudioV2() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}

export { ActorAiArabicStudioV2 as ActorAiArabicStudio };
