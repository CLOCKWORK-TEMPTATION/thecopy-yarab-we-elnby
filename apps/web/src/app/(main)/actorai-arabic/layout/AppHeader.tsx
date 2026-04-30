"use client";

/**
 * الصفحة: actorai-arabic / AppHeader
 * الهوية: رأس تنقل داخلي بطابع تقني/أدائي متسق مع القشرة الموحدة
 * المتغيرات الخاصة المضافة: تعتمد على متغيرات ActorAiArabicStudioV2 المحقونة أعلى الشجرة
 * مكونات Aceternity المستخدمة: CardSpotlight
 */

import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { Button } from "@/components/ui/button";

import { useApp } from "../context/AppContext";

const NAV_ITEMS = [
  { view: "home", label: "🏠 الرئيسية" },
  { view: "studio", label: "🎬 الاستوديو" },
  { view: "vocal", label: "🎤 تمارين الصوت" },
  { view: "voicecoach", label: "🎙️ مدرب الصوت" },
  { view: "rhythm", label: "🎵 إيقاع المشهد" },
  { view: "webcam", label: "👁️ التحليل البصري" },
  { view: "ar", label: "🥽 تدريب AR/MR" },
  { view: "memorization", label: "🧠 اختبار الحفظ" },
] as const;

export function AppHeader() {
  const { currentView, user, theme, navigate, toggleTheme, handleLogout } =
    useApp();

  return (
    <div className="sticky top-0 z-40 p-4 md:p-6">
      <CardSpotlight className="overflow-hidden rounded-[26px] border border-white/8 bg-black/28 px-4 py-4 backdrop-blur-2xl md:px-6">
        <div className="container mx-auto">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3 text-white">
              <span className="text-4xl">🎭</span>
              <div>
                <h1 className="text-2xl font-bold md:text-3xl">الممثل الذكي</h1>
                <p className="text-sm text-white/55">
                  بيئة تدريب وأداء داخل هوية بصرية موحدة مع المنصة
                </p>
              </div>
            </div>

            <nav className="flex flex-wrap items-center justify-end gap-2">
              {NAV_ITEMS.map(({ view, label }) => (
                <Button
                  key={view}
                  onClick={() => navigate(view)}
                  variant={currentView === view ? "secondary" : "ghost"}
                  className={
                    currentView === view
                      ? "bg-white text-black hover:bg-white"
                      : "text-white hover:bg-white/10"
                  }
                >
                  {label}
                </Button>
              ))}

              {user ? (
                <>
                  <Button
                    onClick={() => navigate("dashboard")}
                    variant={
                      currentView === "dashboard" ? "secondary" : "ghost"
                    }
                    className={
                      currentView === "dashboard"
                        ? "bg-white text-black hover:bg-white"
                        : "text-white hover:bg-white/10"
                    }
                  >
                    📊 لوحة التحكم
                  </Button>
                  <Button
                    onClick={handleLogout}
                    variant="ghost"
                    className="text-white hover:bg-red-600/20 hover:text-red-100"
                  >
                    🚪 خروج
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={() => navigate("login")}
                    variant="ghost"
                    className="text-white hover:bg-white/10"
                  >
                    دخول
                  </Button>
                  <Button
                    onClick={() => navigate("register")}
                    className="bg-white text-black hover:bg-white/90"
                  >
                    ابدأ الآن
                  </Button>
                </>
              )}

              <Button
                onClick={toggleTheme}
                variant="ghost"
                className="text-white hover:bg-white/10"
                size="icon"
              >
                {theme === "light" ? "🌙" : "☀️"}
              </Button>
            </nav>
          </div>
        </div>
      </CardSpotlight>
    </div>
  );
}
