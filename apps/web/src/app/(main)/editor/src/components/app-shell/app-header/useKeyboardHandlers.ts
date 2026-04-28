/**
 * @module app-header/useKeyboardHandlers
 * @description Hook للتعامل مع أحداث لوحة المفاتيح في AppHeader
 */

import { useCallback } from "react";
import type { AppShellMenuSection } from "./types";
import type { UseMenuNavigationReturn } from "./useMenuNavigation";

export interface UseKeyboardHandlersParams {
  activeMenu: string | null;
  menuSections: readonly AppShellMenuSection[];
  onToggleMenu: (sectionLabel: string) => void;
  onAction: (actionId: string) => void;
  menuNavigation: UseMenuNavigationReturn;
}

export interface UseKeyboardHandlersReturn {
  handleSectionButtonKeyDown: (
    event: React.KeyboardEvent<HTMLButtonElement>,
    sectionLabel: string
  ) => void;
  handleMenuItemKeyDown: (
    event: React.KeyboardEvent<HTMLButtonElement>,
    sectionLabel: string,
    itemIndex: number
  ) => void;
}

export function useKeyboardHandlers({
  activeMenu,
  menuSections,
  onToggleMenu,
  onAction,
  menuNavigation,
}: UseKeyboardHandlersParams): UseKeyboardHandlersReturn {
  const {
    focusSectionButton,
    focusMenuItem,
    getSiblingSectionLabel,
    getFirstEnabledIndex,
    getLastEnabledIndex,
    stepEnabledIndex,
    pendingFocusFirstItemRef,
  } = menuNavigation;

  const handleSectionButtonKeyDown = useCallback(
    (
      event: React.KeyboardEvent<HTMLButtonElement>,
      sectionLabel: string
    ): void => {
      const key = event.key;
      if (key === "ArrowRight") {
        event.preventDefault();
        const target = getSiblingSectionLabel(sectionLabel, "prev");
        if (target) focusSectionButton(target);
        return;
      }
      if (key === "ArrowLeft") {
        event.preventDefault();
        const target = getSiblingSectionLabel(sectionLabel, "next");
        if (target) focusSectionButton(target);
        return;
      }
      if (key === "Home") {
        event.preventDefault();
        const target = getSiblingSectionLabel(sectionLabel, "first");
        if (target) focusSectionButton(target);
        return;
      }
      if (key === "End") {
        event.preventDefault();
        const target = getSiblingSectionLabel(sectionLabel, "last");
        if (target) focusSectionButton(target);
        return;
      }
      if (key === "ArrowDown" || key === "Enter" || key === " ") {
        event.preventDefault();
        pendingFocusFirstItemRef.current = sectionLabel;
        if (activeMenu !== sectionLabel) {
          onToggleMenu(sectionLabel);
        } else {
          const section = menuSections.find(
            (item) => item.label === sectionLabel
          );
          if (section) {
            const firstIndex = getFirstEnabledIndex(section);
            if (firstIndex >= 0) focusMenuItem(sectionLabel, firstIndex);
          }
        }
        return;
      }
      if (key === "Escape") {
        if (activeMenu) {
          event.preventDefault();
          onToggleMenu(activeMenu);
        }
      }
    },
    [
      activeMenu,
      onToggleMenu,
      menuSections,
      focusMenuItem,
      focusSectionButton,
      getFirstEnabledIndex,
      getSiblingSectionLabel,
      pendingFocusFirstItemRef,
    ]
  );

  const handleMenuItemKeyDown = useCallback(
    (
      event: React.KeyboardEvent<HTMLButtonElement>,
      sectionLabel: string,
      itemIndex: number
    ): void => {
      const key = event.key;
      const section = menuSections.find((item) => item.label === sectionLabel);
      if (!section) return;

      if (key === "ArrowDown") {
        event.preventDefault();
        const next = stepEnabledIndex(section, itemIndex, 1);
        if (next >= 0) focusMenuItem(sectionLabel, next);
        return;
      }
      if (key === "ArrowUp") {
        event.preventDefault();
        const prev = stepEnabledIndex(section, itemIndex, -1);
        if (prev >= 0) focusMenuItem(sectionLabel, prev);
        return;
      }
      if (key === "Home") {
        event.preventDefault();
        const first = getFirstEnabledIndex(section);
        if (first >= 0) focusMenuItem(sectionLabel, first);
        return;
      }
      if (key === "End") {
        event.preventDefault();
        const last = getLastEnabledIndex(section);
        if (last >= 0) focusMenuItem(sectionLabel, last);
        return;
      }
      if (key === "Escape") {
        event.preventDefault();
        onToggleMenu(sectionLabel);
        focusSectionButton(sectionLabel);
        return;
      }
      if (key === "Tab") {
        if (activeMenu === sectionLabel) {
          onToggleMenu(sectionLabel);
        }
        return;
      }
      if (key === "ArrowRight" || key === "ArrowLeft") {
        event.preventDefault();
        const direction = key === "ArrowRight" ? "prev" : "next";
        const target = getSiblingSectionLabel(sectionLabel, direction);
        if (!target) return;
        if (activeMenu === sectionLabel) {
          onToggleMenu(sectionLabel);
        }
        pendingFocusFirstItemRef.current = target;
        onToggleMenu(target);
        return;
      }
      if (key === "Enter" || key === " ") {
        event.preventDefault();
        const targetItem = section.items[itemIndex];
        if (targetItem && !targetItem.disabled) {
          onAction(targetItem.actionId);
        }
      }
    },
    [
      activeMenu,
      menuSections,
      onAction,
      onToggleMenu,
      focusMenuItem,
      focusSectionButton,
      getFirstEnabledIndex,
      getLastEnabledIndex,
      getSiblingSectionLabel,
      stepEnabledIndex,
      pendingFocusFirstItemRef,
    ]
  );

  return {
    handleSectionButtonKeyDown,
    handleMenuItemKeyDown,
  };
}
