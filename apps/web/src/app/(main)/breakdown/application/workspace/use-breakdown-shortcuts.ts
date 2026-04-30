"use client";

/**
 * @module use-breakdown-shortcuts
 * @description اختصارات لوحة المفاتيح لمساحة التفكيك
 *
 * الاختصارات المدعومة:
 * - Ctrl+S  : حفظ الجلسة الحالية فورًا
 * - Ctrl+Z  : التراجع عن آخر تعديل (استعادة آخر نسخة محفوظة)
 * - Ctrl+/  : عرض/إخفاء مرجع الاختصارات
 */

import { useCallback, useEffect } from "react";

export interface BreakdownShortcutActions {
  onSave?: () => void;
  onUndo?: () => void;
  onToggleHelp?: () => void;
}

export const BREAKDOWN_SHORTCUT_LIST = [
  { keys: "Ctrl+S",  description: "حفظ الجلسة الحالية"       },
  { keys: "Ctrl+Z",  description: "التراجع عن آخر تعديل"     },
  { keys: "Ctrl+/",  description: "عرض اختصارات لوحة المفاتيح" },
] as const;

interface Binding {
  matches: (e: KeyboardEvent, ctrl: boolean) => boolean;
  run: (actions: BreakdownShortcutActions) => void;
}

const BINDINGS: Binding[] = [
  {
    matches: (_e, ctrl) => ctrl && _e.key === "s",
    run: (a) => a.onSave?.(),
  },
  {
    matches: (_e, ctrl) => ctrl && _e.key === "z" && !_e.shiftKey,
    run: (a) => a.onUndo?.(),
  },
  {
    matches: (_e, ctrl) => ctrl && _e.key === "/",
    run: (a) => a.onToggleHelp?.(),
  },
];

/**
 * يُعلّق مستمعي لوحة المفاتيح على مستوى الـ document.
 * يُنظَّف تلقائيًا عند إزالة المكوّن من الشجرة.
 */
export function useBreakdownShortcuts(
  actions: BreakdownShortcutActions,
): void {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // تجاهل الاختصارات داخل حقول الإدخال لتفادي التداخل
      const target = event.target as HTMLElement;
      if (
        target.tagName === "TEXTAREA" ||
        target.tagName === "INPUT" ||
        target.isContentEditable
      ) {
        // Ctrl+S داخل textarea مسموح به استثناءً (حفظ)
        if (!(event.ctrlKey || event.metaKey) || event.key !== "s") {
          return;
        }
      }

      const ctrl = event.ctrlKey || event.metaKey;
      const binding = BINDINGS.find((b) => b.matches(event, ctrl));
      if (!binding) return;

      event.preventDefault();
      binding.run(actions);
    },
    [actions],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
