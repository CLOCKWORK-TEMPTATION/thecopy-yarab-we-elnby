"use client";

/**
 * الصفحة: BREAKAPP
 * الهوية: نقطة دخول تشغيلية سريعة بتوجيه فوري مع طبقة بصرية موحدة مع المنصة
 * المتغيرات الخاصة المضافة: --page-accent, --page-accent-2, --page-bg, --page-surface, --page-border
 * مكونات Aceternity المستخدمة: BackgroundBeams, NoiseBackground, CardSpotlight
 */

import {
  getCurrentUser,
  isAuthenticated,
} from "@the-copy/breakapp/lib/auth";
import {
  getDefaultRedirect,
  isValidRole,
} from "@the-copy/breakapp/lib/roles";
import { useEffect, type CSSProperties } from "react";

import { BackgroundBeams } from "@/components/aceternity/background-beams";
import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { NoiseBackground } from "@/components/aceternity/noise-background";
import { DottedGlowBackground } from "@/components/ui/dotted-glow-background";

const shellStyle: CSSProperties = {
  ["--page-accent" as string]: "var(--accent-technical, #3b5bdb)",
  ["--page-accent-2" as string]: "var(--brand, #029784)",
  ["--page-bg" as string]: "var(--background, oklch(0.145 0 0))",
  ["--page-surface" as string]: "rgba(12, 18, 32, 0.74)",
  ["--page-border" as string]: "rgba(64, 165, 179, 0.22)",
};

export default function BREAKAPPHome() {
  useEffect(() => {
    let target = "/BREAKAPP/dashboard";

    if (!isAuthenticated()) {
      target = "/BREAKAPP/login/qr";
    } else {
      const user = getCurrentUser();
      if (user && isValidRole(user.role)) {
        target = getDefaultRedirect(user.role);
      }
    }

    window.location.replace(target);
  }, []);

  return (
    <main
      dir="rtl"
      style={shellStyle}
      className="relative isolate min-h-screen overflow-hidden bg-[var(--page-bg)] text-[var(--foreground,white)]"
      role="main"
      aria-label="تهيئة BREAKAPP"
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
      <div className="absolute inset-0 opacity-70">
        <BackgroundBeams />
      </div>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,91,219,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(2,151,132,0.16),transparent_32%)]" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
        <CardSpotlight className="w-full max-w-xl overflow-hidden rounded-[28px] border border-[var(--page-border)] bg-[var(--page-surface)] p-8 shadow-[0_18px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
          <div className="space-y-6 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/5">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--page-accent)] border-t-transparent" />
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-[0.35em] text-white/45">
                BREAKAPP GATEWAY
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-white">
                جارٍ تجهيز المسار المناسب
              </h1>
              <p className="mx-auto max-w-md text-sm leading-7 text-white/68">
                يتم الآن فحص حالة الجلسة وتوجيهك تلقائيًا إلى لوحة التحكم أو إلى
                مسار تسجيل الدخول.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-white/5 p-4 text-right">
                <p className="text-xs text-white/45">الهوية البصرية</p>
                <p className="mt-2 text-sm font-medium text-white/90">
                  متسقة مع نواة المنصة
                </p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/5 p-4 text-right">
                <p className="text-xs text-white/45">الحالة</p>
                <p className="mt-2 text-sm font-medium text-white/90">
                  Redirect in progress
                </p>
              </div>
            </div>
          </div>
        </CardSpotlight>
      </div>
    </main>
  );
}
