"use client";

/**
 * حدود الخطأ لمنصة العصف الذهني
 * يُعرض عند حدوث خطأ غير متوقع
 */
export default function BrainStormError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center bg-white/[0.04] backdrop-blur-xl border border-white/8 rounded-[22px] p-8 max-w-md">
          <h2 className="text-2xl font-bold text-red-400 mb-4">حدث خطأ</h2>
          <p className="text-white/55 mb-6">
            {error.message || "حدث خطأ غير متوقع في منصة العصف الذهني."}
          </p>
          <button
            onClick={() => reset()}
            className="px-6 py-3 bg-white/8 text-white rounded-[22px] hover:bg-white/12 transition border border-white/8"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    </div>
  );
}
