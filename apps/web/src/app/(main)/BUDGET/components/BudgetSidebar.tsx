"use client";

import { Save, Search, Trash2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import type { SavedBudget, UserPreferences } from "../lib/types";

interface BudgetSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  filteredBudgets: SavedBudget[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onLoad: (saved: SavedBudget) => void;
  onDelete: (id: string) => void;
  preferences: UserPreferences;
}

/**
 * @description الشريط الجانبي المنزلق (يمين) لعرض الميزانيات المحفوظة
 * مع إمكانية البحث والتحميل والحذف.
 */
export const BudgetSidebar: React.FC<BudgetSidebarProps> = ({
  isOpen,
  onClose,
  filteredBudgets,
  searchTerm,
  onSearchChange,
  onLoad,
  onDelete,
  preferences,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25 }}
          className={`fixed inset-y-0 right-0 w-96 shadow-2xl z-50 ${
            preferences.theme === "dark"
              ? "bg-black/18 border-l border-white/8"
              : "bg-white/[0.04] border-l border-white/8"
          }`}
        >
          <div className="p-6 h-full overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3
                className={`text-lg font-semibold ${
                  preferences.theme === "dark" ? "text-white" : "text-white"
                }`}
              >
                Saved Budgets
              </h3>
              <button
                onClick={onClose}
                className={`p-1 rounded-lg transition-colors ${
                  preferences.theme === "dark"
                    ? "text-white/55 hover:text-white hover:bg-black/22"
                    : "text-white/55 hover:text-white hover:bg-white/8/6"
                }`}
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-4">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/55"
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search budgets..."
                  className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                    preferences.theme === "dark"
                      ? "bg-black/22 border-white/8 text-white"
                      : "border-white/8"
                  }`}
                />
              </div>
            </div>

            <div className="space-y-3">
              {filteredBudgets.length === 0 ? (
                <div
                  className={`text-center py-8 ${
                    preferences.theme === "dark"
                      ? "text-white/55"
                      : "text-white/45"
                  }`}
                >
                  <Save size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No saved budgets yet</p>
                  <p className="text-sm">Create and save your first budget!</p>
                </div>
              ) : (
                filteredBudgets.map((saved) => (
                  <motion.div
                    key={saved.id}
                    whileHover={{ scale: 1.02 }}
                    className={`p-4 rounded-[22px] border cursor-pointer transition-colors ${
                      preferences.theme === "dark"
                        ? "bg-black/22 border-white/8 hover:bg-black/28"
                        : "bg-white/[0.04]/[0.04] border-white/8 hover:bg-white/8/6"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4
                        className={`font-medium truncate flex-1 ${
                          preferences.theme === "dark"
                            ? "text-white"
                            : "text-white"
                        }`}
                      >
                        {saved.name}
                      </h4>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(saved.id);
                        }}
                        className={`ml-2 p-1 rounded transition-colors ${
                          preferences.theme === "dark"
                            ? "text-white/55 hover:text-red-400 hover:bg-black/28"
                            : "text-white/55 hover:text-red-500 hover:bg-white/8/6"
                        }`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p
                      className={`text-sm mb-2 line-clamp-2 ${
                        preferences.theme === "dark"
                          ? "text-white/68"
                          : "text-white/55"
                      }`}
                    >
                      {saved.script.substring(0, 100)}...
                    </p>
                    <div className="flex justify-between items-center">
                      <span
                        className={`text-xs ${
                          preferences.theme === "dark"
                            ? "text-white/55"
                            : "text-white/45"
                        }`}
                      >
                        {new Date(saved.date).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => onLoad(saved)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        Load
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
