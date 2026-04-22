/**
 * @module app/(main)/analysis/seven-stations
 * @description مكون وسيط لتحميل واجهة المحطات السبع
 *
 * السبب: يعمل كطبقة وسيطة بين الصفحة الرئيسية والمكون الفعلي،
 * مما يسمح بتحميل كسول إضافي وعرض حالة تحميل ملائمة.
 *
 * يستخدم React.lazy مع Suspense لتوفير تجربة تحميل سلسة
 * وتقليل حجم الحزمة الأولية.
 */

"use client";

import { lazy, Suspense } from "react";

/**
 * مكون المحطات السبع - يُحمّل بشكل كسول
 * السبب: تأخير تحميل المكون الثقيل حتى يُحتاج
 */
const SevenStationsComponent = lazy(() => import("./seven-stations-component"));

/**
 * مكون تحميل المحطات السبع
 * السبب: يعرض حالة التحميل أثناء انتظار المكون الرئيسي
 */
function LoadingFallback() {
  return (
    <div className="container mx-auto max-w-6xl p-6 space-y-6">
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"
            role="status"
            aria-label="جاري التحميل"
          />
          <p className="text-white/55">جاري تحميل واجهة المحطات السبع...</p>
        </div>
      </div>
    </div>
  );
}

/**
 * صفحة المحطات السبع
 *
 * السبب: تغليف المكون الرئيسي بـ Suspense لدعم التحميل الكسول
 * وتوفير تجربة مستخدم سلسة أثناء التحميل.
 *
 * @returns عنصر JSX يحتوي على مكون المحطات السبع مع Suspense
 */
export default function SevenStationsPage() {
  return (
    <main>
      <Suspense fallback={<LoadingFallback />}>
        <SevenStationsComponent />
      </Suspense>
    </main>
  );
}
