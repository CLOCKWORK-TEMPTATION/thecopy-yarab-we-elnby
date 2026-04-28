import React from "react";

import { Button } from "@/components/ui/button";

import type { User, ViewType } from "../../types";

interface NavItem {
  view: ViewType;
  label: string;
}

interface HeaderProps {
  currentView: ViewType;
  user: User | null;
  navigate: (view: ViewType) => void;
  handleLogout: () => void;
  toggleTheme: () => void;
  theme: "light" | "dark";
}

const PRIMARY_NAV_ITEMS: NavItem[] = [
  { view: "home", label: "🏠 الرئيسية" },
  { view: "demo", label: "🎬 التجربة" },
  { view: "vocal", label: "🎤 تمارين الصوت" },
  { view: "voicecoach", label: "🎙️ مدرب الصوت" },
  { view: "rhythm", label: "🎵 إيقاع المشهد" },
  { view: "webcam", label: "👁️ التحليل البصري" },
  { view: "ar", label: "🥽 تدريب AR/MR" },
  { view: "memorization", label: "🧠 اختبار الحفظ" },
];

function getNavButtonClass(isActive: boolean) {
  return isActive
    ? "bg-white/[0.04] text-indigo-400"
    : "text-white hover:bg-blue-800";
}

function HeaderNavButton({
  item,
  currentView,
  navigate,
}: {
  item: NavItem;
  currentView: ViewType;
  navigate: (view: ViewType) => void;
}) {
  const isActive = currentView === item.view;

  return (
    <Button
      onClick={() => navigate(item.view)}
      variant={isActive ? "secondary" : "ghost"}
      className={getNavButtonClass(isActive)}
    >
      {item.label}
    </Button>
  );
}

function AuthButtons({
  user,
  currentView,
  navigate,
  handleLogout,
}: {
  user: User | null;
  currentView: ViewType;
  navigate: (view: ViewType) => void;
  handleLogout: () => void;
}) {
  if (!user) {
    return (
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
    );
  }

  const isDashboard = currentView === "dashboard";

  return (
    <>
      <Button
        onClick={() => navigate("dashboard")}
        variant={isDashboard ? "secondary" : "ghost"}
        className={getNavButtonClass(isDashboard)}
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
  );
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
          {PRIMARY_NAV_ITEMS.map((item) => (
            <HeaderNavButton
              key={item.view}
              item={item}
              currentView={currentView}
              navigate={navigate}
            />
          ))}

          <AuthButtons
            user={user}
            currentView={currentView}
            navigate={navigate}
            handleLogout={handleLogout}
          />

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
