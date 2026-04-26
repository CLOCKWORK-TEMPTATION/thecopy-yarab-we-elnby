"use client";

import { logger } from "@/lib/ai/utils/logger";
/**
 * الصفحة: styleIST
 * الهوية: استوديو أزياء/ملابس سينمائية بطابع editorial داكن ولمسة ذهبية موحدة مع المنصة
 * المتغيرات الخاصة المضافة: --page-accent, --page-accent-2, --page-bg, --page-border
 * مكونات Aceternity المستخدمة: BackgroundBeams, NoiseBackground, CardSpotlight
 */

import dynamic from "next/dynamic";
import {
  Component,
  type ErrorInfo,
  type ReactNode,
  type CSSProperties,
} from "react";

import "./cinefit.css";
import { BackgroundBeams } from "@/components/aceternity/background-beams";
import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { NoiseBackground } from "@/components/aceternity/noise-background";

const shellStyle: CSSProperties = {
  ["--page-accent" as string]: "var(--brand-bronze, #746842)",
  ["--page-accent-2" as string]: "var(--accent-creative, #c2255c)",
  ["--page-bg" as string]: "var(--background, #09090b)",
  ["--page-border" as string]: "rgba(255,255,255,0.1)",
};

const CineFitApp = dynamic(() => import("./cinefit-app"), {
  ssr: false,
  loading: () => (
    <main
      style={shellStyle}
      className="relative isolate min-h-screen overflow-hidden bg-[var(--page-bg)]"
    >
      <NoiseBackground />
      <div className="absolute inset-0 opacity-70">
        <BackgroundBeams />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(116,104,66,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(194,37,92,0.14),transparent_30%)]" />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
        <CardSpotlight className="w-full max-w-2xl overflow-hidden rounded-[30px] border border-[var(--page-border)] bg-black/35 p-8 text-center shadow-[0_20px_80px_rgba(0,0,0,0.42)] backdrop-blur-2xl">
          <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-2 border-[var(--page-accent)] border-t-transparent" />
          <h1 className="text-3xl font-bold text-white">CineFit Pro</h1>
          <p className="mt-3 text-sm leading-7 text-white/65">
            جارٍ تحميل استوديو التصميم والقياس داخل القشرة البصرية الموحدة.
          </p>
        </CardSpotlight>
      </div>
    </main>
  ),
});

interface WebGLErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface WebGLErrorBoundaryState {
  hasError: boolean;
}

class WebGLErrorBoundary extends Component<
  WebGLErrorBoundaryProps,
  WebGLErrorBoundaryState
> {
  public constructor(props: WebGLErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError(): WebGLErrorBoundaryState {
    return { hasError: true };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error("WebGL Error caught", { error, errorInfo });
  }

  public override render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }

    return this.props.children;
  }
}

export default function StyleISTPage() {
  return (
    <WebGLErrorBoundary
      fallback={
        <main
          style={shellStyle}
          className="relative isolate min-h-screen overflow-hidden bg-[var(--page-bg)]"
        >
          <NoiseBackground />
          <div className="absolute inset-0 opacity-60">
            <BackgroundBeams />
          </div>
          <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
            <CardSpotlight className="w-full max-w-2xl overflow-hidden rounded-[30px] border border-[var(--page-border)] bg-black/40 p-10 text-center shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
              <div className="mx-auto mb-6 text-6xl">🎬</div>
              <h2 className="text-2xl font-semibold text-white">CineFit Pro</h2>
              <p className="mt-3 text-sm leading-7 text-white/68">
                بعض مزايا العرض ثلاثي الأبعاد تحتاج إلى دعم WebGL. يمكنك إعادة
                المحاولة أو متابعة العمل من بيئة تدعم العرض الرسومي الكامل.
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-6 inline-flex items-center justify-center rounded-full border border-white/12 bg-white/6 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
              >
                إعادة المحاولة
              </button>
            </CardSpotlight>
          </div>
        </main>
      }
    >
      <CineFitApp />
    </WebGLErrorBoundary>
  );
}
