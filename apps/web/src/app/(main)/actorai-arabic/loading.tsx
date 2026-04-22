/**
 * مؤشر تحميل استوديو الممثل الذكي
 * يُعرض أثناء تحميل المكونات الديناميكية
 */
export default function ActorAiLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-white/55">جاري تحميل استوديو الممثل...</p>
      </div>
    </div>
  );
}
