"use client";

/**
 * حدود الخطأ لـ Self-Tape Suite
 */
export default function SelfTapeSuiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-black/8 backdrop-blur-xl flex items-center justify-center">
      <div className="text-center max-w-md bg-white/[0.04] backdrop-blur-xl border border-white/8 rounded-[22px] p-8">
        <h2 className="text-2xl font-bold text-red-400 mb-4">حدث خطأ</h2>
        <p className="text-white/55 mb-6">
          {error.message || "حدث خطأ غير متوقع في Self-Tape Suite."}
        </p>
        <button
          onClick={() => reset()}
          className="px-6 py-3 bg-white/8 text-white rounded-[22px] hover:bg-white/12 transition border border-white/8"
        >
          إعادة المحاولة
        </button>
      </div>
    </div>
  );
}
