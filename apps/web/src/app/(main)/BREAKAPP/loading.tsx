/**
 * مؤشر تحميل تطبيق Break Break
 * يُعرض أثناء تحميل الصفحات الفرعية
 */
export default function BreakAppLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black/8 backdrop-blur-xl">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white/40 mb-4"></div>
        <p className="text-white/55">جارٍ التحميل...</p>
      </div>
    </div>
  );
}
