/**
 * مؤشر تحميل Self-Tape Suite
 */
export default function SelfTapeSuiteLoading() {
  return (
    <div className="min-h-screen bg-black/8 backdrop-blur-xl flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-white/40 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-white text-xl">جاري تحميل Self-Tape Suite...</p>
      </div>
    </div>
  );
}
