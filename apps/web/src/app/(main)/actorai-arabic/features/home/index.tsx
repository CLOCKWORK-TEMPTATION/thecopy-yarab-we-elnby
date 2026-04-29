"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { useApp } from "../../context/AppContext";

import type { ViewType } from "../../types";

// ─── Sub-components ───

interface HeroActionsProps {
  onNavigate: (view: ViewType) => void;
}

function HeroActions({ onNavigate }: HeroActionsProps) {
  return (
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
      <Button size="lg" variant="outline" onClick={() => onNavigate("webcam")}>
        👁️ التحليل البصري
      </Button>
      <Button
        size="lg"
        className="bg-gradient-to-l from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white"
        onClick={() =>
          (window.location.href = "/actorai-arabic/self-tape-suite")
        }
      >
        🎥 Self-Tape Suite
      </Button>
      <Button
        size="lg"
        variant="outline"
        onClick={() => onNavigate("register")}
      >
        ابدأ الآن
      </Button>
    </div>
  );
}

interface FeatureGridProps {
  onNavigate: (view: ViewType) => void;
}

function FeatureGrid({ onNavigate }: FeatureGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mt-12">
      <Card className="hover:shadow-lg transition-shadow bg-white/[0.04] border-white/8">
        <CardContent className="p-6 text-center">
          <div className="text-5xl mb-4">🧠</div>
          <h3 className="text-xl font-semibold mb-2 text-white">
            تحليل النصوص
          </h3>
          <p className="text-white/68">
            تحليل عميق للأهداف والعقبات والمسارات العاطفية
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow bg-white/[0.04] border-white/8">
        <CardContent className="p-6 text-center">
          <div className="text-5xl mb-4">💬</div>
          <h3 className="text-xl font-semibold mb-2 text-white">
            شريك المشهد الذكي
          </h3>
          <p className="text-white/68">
            تدرب على المشاهد مع شريك ذكي يستجيب بطبيعية
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-purple-500/30">
        <CardContent className="p-6 text-center">
          <div className="text-5xl mb-4">🎙️</div>
          <h3 className="text-xl font-semibold mb-2 text-white">
            مدرب الصوت اللحظي
          </h3>
          <p className="text-white/85">
            تحليل فوري: طبقة الصوت، الشدة، السرعة، الوقفات، التنفس
          </p>
          <Badge className="mt-3 bg-purple-600">جديد ✨</Badge>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow bg-white/[0.04] border-white/8">
        <CardContent className="p-6 text-center">
          <div className="text-5xl mb-4">🎤</div>
          <h3 className="text-xl font-semibold mb-2 text-white">
            تمارين الصوت
          </h3>
          <p className="text-white/68">تمارين نطق وتنفس واسقاط صوتي احترافية</p>
        </CardContent>
      </Card>

      <Card
        className="hover:shadow-lg transition-shadow cursor-pointer bg-white/[0.04] border-white/8"
        onClick={() => onNavigate("webcam")}
      >
        <CardContent className="p-6 text-center">
          <div className="text-5xl mb-4">👁️</div>
          <h3 className="text-xl font-semibold mb-2 text-white">
            التحليل البصري
          </h3>
          <p className="text-white/68">
            تحليل اتجاه النظر والتعبيرات واستخدام المساحة
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow bg-white/[0.04] border-white/8">
        <CardContent className="p-6 text-center">
          <div className="text-5xl mb-4">📈</div>
          <h3 className="text-xl font-semibold mb-2 text-white">تتبع التقدم</h3>
          <p className="text-white/68">
            راقب نموك مع تحليلات شاملة ونصائح مخصصة
          </p>
        </CardContent>
      </Card>

      <Card
        className="hover:shadow-lg transition-shadow border-2 border-red-500/30 bg-gradient-to-br from-red-500/20 to-pink-500/20 cursor-pointer"
        onClick={() =>
          (window.location.href = "/actorai-arabic/self-tape-suite")
        }
      >
        <CardContent className="p-6 text-center">
          <div className="text-5xl mb-4">🎥</div>
          <h3 className="text-xl font-semibold mb-2 text-white">
            Self-Tape Suite
          </h3>
          <p className="text-white/68 text-sm">
            Teleprompter ذكي • تسجيل متعدد • مقارنة • ملاحظات AI • تصدير Casting
          </p>
          <Badge className="mt-2 bg-red-500">جديد - المرحلة 3</Badge>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-purple-500/30">
        <CardContent className="p-6 text-center">
          <div className="text-5xl mb-4">🥽</div>
          <h3 className="text-xl font-semibold mb-2 text-white">تدريب AR/MR</h3>
          <p className="text-white/85">
            تجربة غامرة مع Vision Pro للتدريب الاحترافي
          </p>
          <Badge className="mt-3 bg-purple-600">جديد</Badge>
        </CardContent>
      </Card>
    </div>
  );
}

function HowItWorks() {
  return (
    <div className="mt-16">
      <h3 className="text-3xl font-bold text-white mb-8">كيف يعمل</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
            1
          </div>
          <h4 className="text-xl font-semibold mb-2 text-white">ارفع نصك</h4>
          <p className="text-white/68">استورد أي نص بصيغة نصية</p>
        </div>
        <div className="text-center">
          <div className="w-16 h-16 bg-purple-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
            2
          </div>
          <h4 className="text-xl font-semibold mb-2 text-white">حلل وتدرب</h4>
          <p className="text-white/68">احصل على رؤى الذكاء الاصطناعي وتدرب</p>
        </div>
        <div className="text-center">
          <div className="w-16 h-16 bg-indigo-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
            3
          </div>
          <h4 className="text-xl font-semibold mb-2 text-white">تتبع التقدم</h4>
          <p className="text-white/68">راقب التحسينات وأتقن حرفتك</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───

export function HomeView() {
  const { navigate } = useApp();

  return (
    <div className="text-center py-16">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-5xl font-bold text-white mb-6">
          طور مهاراتك التمثيلية بالذكاء الاصطناعي
        </h2>
        <p className="text-xl text-white/68 mb-8">
          أتقن فنك مع تحليل النصوص المدعوم بالذكاء الاصطناعي، وشركاء المشاهد
          الافتراضيين، وتحليلات الأداء
        </p>

        <HeroActions onNavigate={navigate} />

        <div className="text-8xl opacity-30 mb-12">🎭</div>

        <FeatureGrid onNavigate={navigate} />

        <HowItWorks />
      </div>
    </div>
  );
}
