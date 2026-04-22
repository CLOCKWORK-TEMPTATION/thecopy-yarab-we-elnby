"use client";

/**
 * الصفحة: directors-studio / LoadingSection
 * الهوية: حالة تحميل داخلية متسقة مع shell الإخراجي السينمائي
 * المتغيرات الخاصة المضافة: تعتمد على متغيرات PageLayout المحقونة أعلى الشجرة
 * مكونات Aceternity المستخدمة: CardSpotlight
 */

import { CardSpotlight } from "@/components/aceternity/card-spotlight";

function SkeletonBlock({ className }: { className: string }) {
  return (
    <div className={`animate-pulse rounded-2xl bg-white/8 ${className}`} />
  );
}

export function LoadingSection() {
  return (
    <div className="space-y-6">
      <CardSpotlight className="overflow-hidden rounded-[28px] border border-white/8 bg-black/24 p-5 backdrop-blur-xl">
        <div className="space-y-4">
          <div className="space-y-2">
            <SkeletonBlock className="h-5 w-44" />
            <SkeletonBlock className="h-4 w-72 max-w-full" />
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <SkeletonBlock className="h-28 w-full" />
            <SkeletonBlock className="h-28 w-full" />
            <SkeletonBlock className="h-28 w-full" />
            <SkeletonBlock className="h-28 w-full" />
          </div>
        </div>
      </CardSpotlight>

      <CardSpotlight className="overflow-hidden rounded-[28px] border border-white/8 bg-black/24 p-5 backdrop-blur-xl">
        <div className="space-y-4">
          <SkeletonBlock className="h-10 w-64 max-w-full" />
          <SkeletonBlock className="h-72 w-full" />
        </div>
      </CardSpotlight>
    </div>
  );
}
