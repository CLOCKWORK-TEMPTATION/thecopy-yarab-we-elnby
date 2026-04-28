"use client";

import { Button } from "@/components/ui/button";

interface HomePageProps {
  onNavigate: (view: any) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => (
  <div className="text-center py-16">
    <div className="max-w-4xl mx-auto">
      <h2 className="text-5xl font-bold text-white/85 mb-6">
        طور مهاراتك التمثيلية بالذكاء الاصطناعي
      </h2>
      <p className="text-xl text-white/55 mb-8">
        أتقن فنك مع تحليل النصوص المدعوم بالذكاء الاصطناعي، وشركاء المشاهد
        الافتراضيين، وتحليلات الأداء
      </p>

      <div className="flex gap-4 justify-center mb-12 flex-wrap">
        <Button
          size="lg"
          onClick={() => onNavigate("demo")}
          className="bg-blue-600 hover:bg-blue-700"
        >
          🎬 جرب التطبيق
        </Button>
        <Button size="lg" variant="outline" onClick={() => onNavigate("vocal")}>
          🎤 تمارين الصوت
        </Button>
        <Button
          size="lg"
          onClick={() => onNavigate("voicecoach")}
          className="bg-purple-600 hover:bg-purple-700"
        >
          🎙️ مدرب الصوت
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={() => onNavigate("webcam")}
        >
          👁️ التحليل البصري
        </Button>
        <Button
          size="lg"
          onClick={() => onNavigate("rhythm")}
          className="bg-green-600 hover:bg-green-700"
        >
          🎵 إيقاع المشهد
        </Button>
        <Button size="lg" variant="outline" onClick={() => onNavigate("ar")}>
          🥽 تدريب AR/MR
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
          <div className="text-4xl mb-4">📝</div>
          <h3 className="text-xl font-bold text-white/85 mb-2">تحليل النصوص</h3>
          <p className="text-white/55">
            تحليل عميق للنصوص لفهم الأهداف والعقبات والقوس العاطفي
          </p>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
          <div className="text-4xl mb-4">🎭</div>
          <h3 className="text-xl font-bold text-white/85 mb-2">شريك المشهد</h3>
          <p className="text-white/55">
            تدرب مع شريك افتراضي ذكي يحاكي الشخصيات الحقيقية
          </p>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
          <div className="text-4xl mb-4">🎥</div>
          <h3 className="text-xl font-bold text-white/85 mb-2">تحليل الأداء</h3>
          <p className="text-white/55">
            تحليل بصري وصوتي لأدائك مع اقتراحات تحسين دقيقة
          </p>
        </div>
      </div>
    </div>
  </div>
);
