import { Button } from "@/components/ui/button";
import React from "react";

interface HeaderProps {
  currentView: string;
  user: any;
  navigate: (view: string) => void;
  handleLogout: () => void;
  toggleTheme: () => void;
  theme: "light" | "dark";
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  user,
  navigate,
  handleLogout,
  toggleTheme,
  theme,
}) => (
  <header className="bg-gradient-to-l from-blue-900 to-purple-900 text-white p-6 sticky top-0 z-40">
    <div className="container mx-auto">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="text-4xl">🎭</span>
          <h1 className="text-3xl font-bold">الممثل الذكي</h1>
        </div>

        <nav className="flex items-center gap-2">
          <Button
            onClick={() => navigate("home")}
            variant={currentView === "home" ? "secondary" : "ghost"}
            className={
              currentView === "home"
                ? "bg-white/[0.04] text-indigo-400"
                : "text-white hover:bg-blue-800"
            }
          >
            🏠 الرئيسية
          </Button>
          <Button
            onClick={() => navigate("demo")}
            variant={currentView === "demo" ? "secondary" : "ghost"}
            className={
              currentView === "demo"
                ? "bg-white/[0.04] text-indigo-400"
                : "text-white hover:bg-blue-800"
            }
          >
            🎬 التجربة
          </Button>
          <Button
            onClick={() => navigate("vocal")}
            variant={currentView === "vocal" ? "secondary" : "ghost"}
            className={
              currentView === "vocal"
                ? "bg-white/[0.04] text-indigo-400"
                : "text-white hover:bg-blue-800"
            }
          >
            🎤 تمارين الصوت
          </Button>
          <Button
            onClick={() => navigate("voicecoach")}
            variant={currentView === "voicecoach" ? "secondary" : "ghost"}
            className={
              currentView === "voicecoach"
                ? "bg-white/[0.04] text-indigo-400"
                : "text-white hover:bg-blue-800"
            }
          >
            🎙️ مدرب الصوت
          </Button>
          <Button
            onClick={() => navigate("rhythm")}
            variant={currentView === "rhythm" ? "secondary" : "ghost"}
            className={
              currentView === "rhythm"
                ? "bg-white/[0.04] text-indigo-400"
                : "text-white hover:bg-blue-800"
            }
          >
            🎵 إيقاع المشهد
          </Button>
          <Button
            onClick={() => navigate("webcam")}
            variant={currentView === "webcam" ? "secondary" : "ghost"}
            className={
              currentView === "webcam"
                ? "bg-white/[0.04] text-indigo-400"
                : "text-white hover:bg-blue-800"
            }
          >
            👁️ التحليل البصري
          </Button>
          <Button
            onClick={() => navigate("ar")}
            variant={currentView === "ar" ? "secondary" : "ghost"}
            className={
              currentView === "ar"
                ? "bg-white/[0.04] text-indigo-400"
                : "text-white hover:bg-blue-800"
            }
          >
            🥽 تدريب AR/MR
          </Button>
          <Button
            onClick={() => navigate("memorization")}
            variant={currentView === "memorization" ? "secondary" : "ghost"}
            className={
              currentView === "memorization"
                ? "bg-white/[0.04] text-indigo-400"
                : "text-white hover:bg-blue-800"
            }
          >
            🧠 اختبار الحفظ
          </Button>

          {user ? (
            <>
              <Button
                onClick={() => navigate("dashboard")}
                variant={currentView === "dashboard" ? "secondary" : "ghost"}
                className={
                  currentView === "dashboard"
                    ? "bg-white/[0.04] text-indigo-400"
                    : "text-white hover:bg-blue-800"
                }
              >
                📊 لوحة التحكم
              </Button>
              <Button
                onClick={handleLogout}
                variant="ghost"
                className="text-white hover:bg-red-600"
              >
                🚪 خروج
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => navigate("login")}
                variant="ghost"
                className="text-white hover:bg-blue-800"
              >
                دخول
              </Button>
              <Button
                onClick={() => navigate("register")}
                className="bg-white/[0.04] text-indigo-400 hover:bg-white/6"
              >
                ابدأ الآن
              </Button>
            </>
          )}

          <Button
            onClick={toggleTheme}
            variant="ghost"
            className="text-white hover:bg-blue-800"
            size="icon"
          >
            {theme === "light" ? "🌙" : "☀️"}
          </Button>
        </nav>
      </div>
    </div>
  </header>
);
