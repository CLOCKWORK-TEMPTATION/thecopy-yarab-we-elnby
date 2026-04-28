"use client";

import { motion } from "framer-motion";
import { Download, Film, Menu, Moon, Sun } from "lucide-react";

import type { UserPreferences } from "../lib/types";

interface BudgetHeaderProps {
  preferences: UserPreferences;
  onToggleTheme: () => void;
  onOpenExport: () => void;
  onOpenSidebar: () => void;
}

/**
 * @description الرأسية الثابتة لتطبيق الميزانية: شعار + بدّال المظهر +
 * زر التصدير + زر فتح الشريط الجانبي.
 */
export const BudgetHeader: React.FC<BudgetHeaderProps> = ({
  preferences,
  onToggleTheme,
  onOpenExport,
  onOpenSidebar,
}) => {
  return (
    <header
      className={`sticky top-0 z-50 border-b ${
        preferences.theme === "dark"
          ? "bg-black/18 border-white/8"
          : "bg-white/[0.04] border-white/8"
      } shadow-sm backdrop-blur-sm bg-black/95`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            className="bg-gradient-to-r from-indigo-600 to-purple-600 p-2 rounded-lg text-white shadow-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Film size={20} />
          </motion.div>
          <h1
            className={`text-xl font-bold ${
              preferences.theme === "dark" ? "text-white" : "text-white"
            }`}
          >
            FilmBudget
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Pro
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleTheme}
            className={`p-2 rounded-lg transition-colors ${
              preferences.theme === "dark"
                ? "text-white/55 hover:text-white hover:bg-black/22"
                : "text-white/55 hover:text-white hover:bg-white/8/6"
            }`}
          >
            {preferences.theme === "dark" ? (
              <Sun size={18} />
            ) : (
              <Moon size={18} />
            )}
          </button>

          <button
            onClick={onOpenExport}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Download size={16} />
            Export
          </button>

          <button
            onClick={onOpenSidebar}
            className={`p-2 rounded-lg transition-colors ${
              preferences.theme === "dark"
                ? "text-white/55 hover:text-white hover:bg-black/22"
                : "text-white/55 hover:text-white hover:bg-white/8/6"
            }`}
          >
            <Menu size={20} />
          </button>
        </div>
      </div>
    </header>
  );
};
