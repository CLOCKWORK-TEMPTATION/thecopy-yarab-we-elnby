"use client";

/**
 * @module useKeyboardShortcuts
 * @description هوك اختصارات لوحة المفاتيح لتطبيق العصف الذهني
 *
 * السبب: تسريع سير العمل للمستخدمين المحترفين
 * عبر اختصارات لوحة مفاتيح مألوفة
 *
 * الاختصارات المدعومة:
 * - Ctrl+Enter: بدء جلسة جديدة
 * - Ctrl+S: حفظ الجلسة الحالية
 * - Ctrl+E: تصدير النتائج (JSON)
 * - Ctrl+Shift+E: تصدير النتائج (Markdown)
 * - Escape: إيقاف الجلسة
 * - Ctrl+N: تنقل للمرحلة التالية
 * - Ctrl+?: عرض مرجع الاختصارات
 */

import { useEffect, useCallback } from "react";

export interface ShortcutActions {
  onStartSession?: () => void;
  onSaveSession?: () => void;
  onExportJSON?: () => void;
  onExportMarkdown?: () => void;
  onStopSession?: () => void;
  onAdvancePhase?: () => void;
  onToggleHelp?: () => void;
}

/**
 * قائمة الاختصارات للعرض في مرجع المساعدة
 */
export const SHORTCUT_LIST = [
  { keys: "Ctrl+Enter", description: "بدء جلسة جديدة" },
  { keys: "Ctrl+S", description: "حفظ الجلسة الحالية" },
  { keys: "Ctrl+E", description: "تصدير JSON" },
  { keys: "Ctrl+Shift+E", description: "تصدير Markdown" },
  { keys: "Escape", description: "إيقاف الجلسة" },
  { keys: "Ctrl+N", description: "المرحلة التالية" },
  { keys: "Ctrl+/", description: "عرض الاختصارات" },
];

export function useKeyboardShortcuts(actions: ShortcutActions): void {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const isCtrl = event.ctrlKey || event.metaKey;

      // Ctrl+Enter: بدء جلسة
      if (isCtrl && event.key === "Enter") {
        event.preventDefault();
        actions.onStartSession?.();
        return;
      }

      // Ctrl+S: حفظ
      if (isCtrl && event.key === "s") {
        event.preventDefault();
        actions.onSaveSession?.();
        return;
      }

      // Ctrl+Shift+E: تصدير Markdown
      if (isCtrl && event.shiftKey && event.key === "E") {
        event.preventDefault();
        actions.onExportMarkdown?.();
        return;
      }

      // Ctrl+E: تصدير JSON
      if (isCtrl && !event.shiftKey && event.key === "e") {
        event.preventDefault();
        actions.onExportJSON?.();
        return;
      }

      // Escape: إيقاف
      if (event.key === "Escape") {
        event.preventDefault();
        actions.onStopSession?.();
        return;
      }

      // Ctrl+N: المرحلة التالية
      if (isCtrl && event.key === "n") {
        event.preventDefault();
        actions.onAdvancePhase?.();
        return;
      }

      // Ctrl+/: عرض الاختصارات
      if (isCtrl && event.key === "/") {
        event.preventDefault();
        actions.onToggleHelp?.();
        return;
      }
    },
    [actions]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);
}
