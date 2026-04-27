"use client";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { Button } from "@/components/ui/button";
import type { StudioView } from "../../types/studio";

interface StudioHeaderProps {
  currentView: StudioView;
  onViewChange: (view: StudioView) => void;
}

export function StudioHeader({ currentView, onViewChange }: StudioHeaderProps) {
  return (
    <div className="p-4 md:p-6">
      <CardSpotlight className="overflow-hidden rounded-[28px] border border-white/8 bg-black/30 p-5 backdrop-blur-2xl md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between text-white">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.34em] text-white/38">
              CREATIVE WRITING SHELL
            </p>
            <h1 className="mt-2 text-3xl font-bold md:text-4xl">
              استوديو الكتابة الإبداعية
            </h1>
            <p className="mt-3 max-w-3xl text-white/62 leading-7">
              مساحة كتابة وإلهام وتحليل داخل هوية بصرية داكنة موحدة مع المنصة.
            </p>
          </div>

          <nav className="flex flex-wrap gap-2 justify-end">
            <Button
              onClick={() => onViewChange("home")}
              variant={currentView === "home" ? "secondary" : "ghost"}
              className={
                currentView === "home"
                  ? "bg-white text-black hover:bg-white"
                  : "text-white hover:bg-white/10"
              }
            >
              🏠 الرئيسية
            </Button>
            <Button
              onClick={() => onViewChange("library")}
              variant={currentView === "library" ? "secondary" : "ghost"}
              className={
                currentView === "library"
                  ? "bg-white text-black hover:bg-white"
                  : "text-white hover:bg-white/10"
              }
            >
              📚 مكتبة المحفزات
            </Button>
            <Button
              onClick={() => onViewChange("editor")}
              variant={currentView === "editor" ? "secondary" : "ghost"}
              className={
                currentView === "editor"
                  ? "bg-white text-black hover:bg-white"
                  : "text-white hover:bg-white/10"
              }
            >
              ✍️ المحرر
            </Button>
            <Button
              onClick={() => onViewChange("settings")}
              variant={currentView === "settings" ? "secondary" : "ghost"}
              className={
                currentView === "settings"
                  ? "bg-white text-black hover:bg-white"
                  : "text-white hover:bg-white/10"
              }
            >
              ⚙️ الإعدادات
            </Button>
          </nav>
        </div>
      </CardSpotlight>
    </div>
  );
}
