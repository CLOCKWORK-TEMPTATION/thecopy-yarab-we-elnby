/**
 * @module utils
 * @description أدوات مساعدة لتطبيق العصف الذهني
 */

import { BookOpen, Sparkles, Shield, Trophy, Target } from "lucide-react";
import React from "react";

import type { BrainstormPhase } from "../types";

/** أيقونات المراحل */
export function getPhaseIcon(phaseId: BrainstormPhase): React.ReactNode {
  const icons: Record<BrainstormPhase, React.ReactNode> = {
    1: React.createElement(BookOpen, { className: "w-5 h-5" }),
    2: React.createElement(Sparkles, { className: "w-5 h-5" }),
    3: React.createElement(Shield, { className: "w-5 h-5" }),
    4: React.createElement(Trophy, { className: "w-5 h-5" }),
    5: React.createElement(Target, { className: "w-5 h-5" }),
  };
  return icons[phaseId];
}

/** ألوان المراحل */
export function getPhaseColor(phaseId: BrainstormPhase): string {
  const colors: Record<BrainstormPhase, string> = {
    1: "bg-blue-500 hover:bg-blue-600",
    2: "bg-purple-500 hover:bg-purple-600",
    3: "bg-green-500 hover:bg-green-600",
    4: "bg-yellow-500 hover:bg-yellow-600",
    5: "bg-red-500 hover:bg-red-600",
  };
  return colors[phaseId];
}
