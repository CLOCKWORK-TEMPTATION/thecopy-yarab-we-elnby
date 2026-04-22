"use client";

import { logger } from "@/lib/ai/utils/logger";
/**
 * حدود الخطأ على مستوى المسار — breakdown
 *
 * @description
 * يلتقط أي خطأ غير معالج داخل مسار التفكيك
 * ويعرض واجهة استرداد صديقة للمستخدم
 *
 * السبب: يمنع انهيار التطبيق بالكامل عند حدوث خطأ
 * ويوفر خيار إعادة المحاولة دون إعادة تحميل الصفحة
 */

import { useEffect } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function BreakdownError({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    // تسجيل الخطأ — يمكن استبداله بخدمة تسجيل خارجية
    if (process.env["NODE_ENV"] === "development") {
      logger.error("[breakdown] خطأ غير معالج:", error);
    }
  }, [error]);

  return (
    <div dir="rtl" className="space-y-6 pb-8">
      <section className="mx-auto max-w-7xl px-4 pt-6">
        <div className="rounded-[22px] border border-red-500/20 bg-white/[0.04] backdrop-blur-xl p-8">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="p-3 bg-red-500/10 rounded-full">
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white font-cairo">
                حدث خطأ في مساحة التفكيك
              </h2>
              <p className="text-white/55 max-w-md font-cairo">
                واجهنا مشكلة غير متوقعة أثناء تحميل مساحة التفكيك. يمكنك إعادة
                المحاولة أو العودة للصفحة الرئيسية.
              </p>
            </div>

            {process.env["NODE_ENV"] === "development" && (
              <details className="w-full max-w-lg text-right">
                <summary className="cursor-pointer text-sm text-white/55 hover:text-white/68 font-cairo">
                  تفاصيل الخطأ (وضع التطوير)
                </summary>
                <pre
                  className="mt-2 p-4 bg-white/6 rounded-lg text-xs text-white/55 overflow-auto max-h-40 text-left"
                  dir="ltr"
                >
                  {error.message}
                  {error.digest && `\nDigest: ${error.digest}`}
                </pre>
              </details>
            )}

            <div className="flex gap-3 mt-2">
              <button
                onClick={reset}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/8 text-white rounded-[22px] hover:bg-white/12 transition font-cairo text-sm font-medium border border-white/8"
              >
                <RotateCcw className="h-4 w-4" />
                إعادة المحاولة
              </button>
              <a
                href="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-white/8 bg-white/[0.04] text-white rounded-[22px] hover:bg-white/8 transition font-cairo text-sm font-medium"
              >
                <Home className="h-4 w-4" />
                الصفحة الرئيسية
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
