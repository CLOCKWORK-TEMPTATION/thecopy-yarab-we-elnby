"use client";

/**
 * @module KeyboardShortcutsHelp
 * @description نافذة عرض اختصارات لوحة المفاتيح
 */

import { useCallback, useEffect } from "react";

import { SHORTCUT_LIST } from "../../hooks/useKeyboardShortcuts";

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsHelp({
  isOpen,
  onClose,
}: KeyboardShortcutsHelpProps) {
  /** إغلاق بـ Escape */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* الخلفية */}
      <button
        type="button"
        aria-label="إغلاق نافذة الاختصارات"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* المحتوى */}
      <div
        dir="rtl"
        className="relative bg-background border border-border rounded-xl shadow-xl p-6 w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-foreground font-cairo">
            اختصارات لوحة المفاتيح
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-white/55 hover:text-foreground transition"
            aria-label="إغلاق"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-2">
          {SHORTCUT_LIST.map((shortcut) => (
            <div
              key={shortcut.keys}
              className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
            >
              <span className="text-sm text-foreground font-cairo">
                {shortcut.description}
              </span>
              <kbd className="px-2 py-1 text-xs bg-white/6 border border-border rounded font-mono">
                {shortcut.keys}
              </kbd>
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-white/55 text-center font-cairo">
          اضغط Ctrl+/ لإظهار هذه النافذة في أي وقت
        </p>
      </div>
    </div>
  );
}
