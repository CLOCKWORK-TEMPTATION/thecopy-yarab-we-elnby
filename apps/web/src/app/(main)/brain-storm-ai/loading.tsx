/**
 * مؤشر تحميل منصة العصف الذهني
 * يُعرض أثناء تحميل المكونات الديناميكية
 */
export default function BrainStormLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-white/55">جاري تحميل منصة العصف الذهني...</p>
        </div>
      </div>
    </div>
  );
}
