/**
 * حالة التحميل على مستوى المسار — breakdown
 *
 * @description
 * يُعرض تلقائياً بواسطة Next.js أثناء تحميل صفحة التفكيك
 * يوفر تجربة مستخدم سلسة دون شاشة بيضاء
 */

export default function BreakdownLoading() {
  return (
    <div dir="rtl" className="space-y-6 pb-8 animate-pulse">
      <section className="mx-auto max-w-7xl px-4 pt-6">
        <div className="rounded-2xl border border-border/70 bg-background/80 p-5 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3 flex-1">
              <div className="h-4 w-24 bg-white/6 rounded" />
              <div className="h-7 w-64 bg-white/6 rounded" />
              <div className="h-4 w-96 bg-white/6 rounded" />
            </div>
            <div className="flex gap-3">
              <div className="h-10 w-32 bg-white/6 rounded-full" />
              <div className="h-10 w-24 bg-white/6 rounded-full" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4">
        <div className="rounded-2xl border border-border/50 bg-background p-8">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
              <p className="text-white/55 font-cairo">
                جارٍ تحميل مساحة التفكيك...
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
