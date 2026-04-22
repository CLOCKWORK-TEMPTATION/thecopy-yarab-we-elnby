"use client";

/**
 * حدود الخطأ لتطبيق Break Break
 * يُعرض عند حدوث خطأ غير متوقع في أي صفحة فرعية
 */
export default function BreakAppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black/8 backdrop-blur-xl">
      <div className="text-center max-w-md bg-white/[0.04] backdrop-blur-xl border border-white/8 rounded-[22px] p-8">
        <h2 className="text-2xl font-bold text-white mb-4">حدث خطأ</h2>
        <p className="text-white/55 mb-6">
          {error.message || "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى."}
        </p>
        <button
          onClick={() => reset()}
          className="px-6 py-3 bg-white/8 text-white rounded-[22px] hover:bg-white/12 font-medium transition"
        >
          إعادة المحاولة
        </button>
      </div>
    </div>
  );
}
