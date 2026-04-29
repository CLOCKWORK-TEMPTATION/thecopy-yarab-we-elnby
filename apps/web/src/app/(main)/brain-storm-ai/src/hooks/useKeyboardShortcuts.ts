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

interface ShortcutBinding {
  matches: (event: KeyboardEvent, isCtrl: boolean) => boolean;
  run: (actions: ShortcutActions) => void;
}

const SHORTCUT_BINDINGS: ShortcutBinding[] = [
  {
    matches: (event, isCtrl) => isCtrl && event.key === "Enter",
    run: (actions) => actions.onStartSession?.(),
  },
  {
    matches: (event, isCtrl) => isCtrl && event.key === "s",
    run: (actions) => actions.onSaveSession?.(),
  },
  {
    matches: (event, isCtrl) => isCtrl && event.shiftKey && event.key === "E",
    run: (actions) => actions.onExportMarkdown?.(),
  },
  {
    matches: (event, isCtrl) => isCtrl && !event.shiftKey && event.key === "e",
    run: (actions) => actions.onExportJSON?.(),
  },
  {
    matches: (event) => event.key === "Escape",
    run: (actions) => actions.onStopSession?.(),
  },
  {
    matches: (event, isCtrl) => isCtrl && event.key === "n",
    run: (actions) => actions.onAdvancePhase?.(),
  },
  {
    matches: (event, isCtrl) => isCtrl && event.key === "/",
    run: (actions) => actions.onToggleHelp?.(),
  },
];

export function useKeyboardShortcuts(actions: ShortcutActions): void {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const isCtrl = event.ctrlKey || event.metaKey;
      const binding = SHORTCUT_BINDINGS.find((item) =>
        item.matches(event, isCtrl)
      );

      if (!binding) {
        return;
      }

      event.preventDefault();
      binding.run(actions);
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
