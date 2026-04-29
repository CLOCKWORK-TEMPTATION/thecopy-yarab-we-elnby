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

interface SectionNavHelpers {
  focusSectionButton: UseMenuNavigationReturn["focusSectionButton"];
  focusMenuItem: UseMenuNavigationReturn["focusMenuItem"];
  getSiblingSectionLabel: UseMenuNavigationReturn["getSiblingSectionLabel"];
  getFirstEnabledIndex: UseMenuNavigationReturn["getFirstEnabledIndex"];
  pendingFocusFirstItemRef: UseMenuNavigationReturn["pendingFocusFirstItemRef"];
}

function handleSectionArrowNavigation(
  event: React.KeyboardEvent<HTMLButtonElement>,
  key: string,
  sectionLabel: string,
  helpers: SectionNavHelpers
): boolean {
  if (key === "ArrowRight") {
    event.preventDefault();
    const target = helpers.getSiblingSectionLabel(sectionLabel, "prev");
    if (target) helpers.focusSectionButton(target);
    return true;
  }
  if (key === "ArrowLeft") {
    event.preventDefault();
    const target = helpers.getSiblingSectionLabel(sectionLabel, "next");
    if (target) helpers.focusSectionButton(target);
    return true;
  }
  if (key === "Home") {
    event.preventDefault();
    const target = helpers.getSiblingSectionLabel(sectionLabel, "first");
    if (target) helpers.focusSectionButton(target);
    return true;
  }
  if (key === "End") {
    event.preventDefault();
    const target = helpers.getSiblingSectionLabel(sectionLabel, "last");
    if (target) helpers.focusSectionButton(target);
    return true;
  }
  return false;
}

interface ItemNavHelpers {
  focusSectionButton: UseMenuNavigationReturn["focusSectionButton"];
  focusMenuItem: UseMenuNavigationReturn["focusMenuItem"];
  getSiblingSectionLabel: UseMenuNavigationReturn["getSiblingSectionLabel"];
  getFirstEnabledIndex: UseMenuNavigationReturn["getFirstEnabledIndex"];
  getLastEnabledIndex: UseMenuNavigationReturn["getLastEnabledIndex"];
  stepEnabledIndex: UseMenuNavigationReturn["stepEnabledIndex"];
  pendingFocusFirstItemRef: UseMenuNavigationReturn["pendingFocusFirstItemRef"];
}

function handleMenuItemVerticalNav(
  event: React.KeyboardEvent<HTMLButtonElement>,
  key: string,
  section: AppShellMenuSection,
  itemIndex: number,
  helpers: ItemNavHelpers
): boolean {
  if (key === "ArrowDown") {
    event.preventDefault();
    const next = helpers.stepEnabledIndex(section, itemIndex, 1);
    if (next >= 0) helpers.focusMenuItem(section.label, next);
    return true;
  }
  if (key === "ArrowUp") {
    event.preventDefault();
    const prev = helpers.stepEnabledIndex(section, itemIndex, -1);
    if (prev >= 0) helpers.focusMenuItem(section.label, prev);
    return true;
  }
  if (key === "Home") {
    event.preventDefault();
    const first = helpers.getFirstEnabledIndex(section);
    if (first >= 0) helpers.focusMenuItem(section.label, first);
    return true;
  }
  if (key === "End") {
    event.preventDefault();
    const last = helpers.getLastEnabledIndex(section);
    if (last >= 0) helpers.focusMenuItem(section.label, last);
    return true;
  }
  return false;
}

interface MenuItemHorizontalNavContext {
  sectionLabel: string;
  activeMenu: string | null;
  onToggleMenu: (label: string) => void;
}

function handleMenuItemHorizontalNav(
  event: React.KeyboardEvent<HTMLButtonElement>,
  key: string,
  context: MenuItemHorizontalNavContext,
  helpers: ItemNavHelpers
): boolean {
  const { sectionLabel, activeMenu, onToggleMenu } = context;
  if (key === "ArrowRight" || key === "ArrowLeft") {
    event.preventDefault();
    const direction = key === "ArrowRight" ? "prev" : "next";
    const target = helpers.getSiblingSectionLabel(sectionLabel, direction);
    if (!target) return true;
    if (activeMenu === sectionLabel) {
      onToggleMenu(sectionLabel);
    }
    helpers.pendingFocusFirstItemRef.current = target;
    onToggleMenu(target);
    return true;
  }
  return false;
}

interface KeyboardHandlerState {
  activeMenu: string | null;
  menuSections: readonly AppShellMenuSection[];
  onToggleMenu: (sectionLabel: string) => void;
  onAction: (actionId: string) => void;
  nav: UseMenuNavigationReturn;
}

function execSectionButtonKeyDown(
  event: React.KeyboardEvent<HTMLButtonElement>,
  sectionLabel: string,
  state: KeyboardHandlerState
): void {
  const key = event.key;
  const { nav, activeMenu, menuSections, onToggleMenu } = state;
  const navHelpers: SectionNavHelpers = {
    focusSectionButton: nav.focusSectionButton,
    focusMenuItem: nav.focusMenuItem,
    getSiblingSectionLabel: nav.getSiblingSectionLabel,
    getFirstEnabledIndex: nav.getFirstEnabledIndex,
    pendingFocusFirstItemRef: nav.pendingFocusFirstItemRef,
  };

  if (handleSectionArrowNavigation(event, key, sectionLabel, navHelpers)) {
    return;
  }

  if (key === "ArrowDown" || key === "Enter" || key === " ") {
    event.preventDefault();
    nav.pendingFocusFirstItemRef.current = sectionLabel;
    if (activeMenu !== sectionLabel) {
      onToggleMenu(sectionLabel);
    } else {
      const section = menuSections.find((item) => item.label === sectionLabel);
      if (section) {
        const firstIndex = nav.getFirstEnabledIndex(section);
        if (firstIndex >= 0) nav.focusMenuItem(sectionLabel, firstIndex);
      }
    }
    return;
  }
  if (key === "Escape" && activeMenu) {
    event.preventDefault();
    onToggleMenu(activeMenu);
  }
}

function execMenuItemKeyDown(
  event: React.KeyboardEvent<HTMLButtonElement>,
  sectionLabel: string,
  itemIndex: number,
  state: KeyboardHandlerState
): void {
  const key = event.key;
  const { nav, activeMenu, menuSections, onToggleMenu, onAction } = state;
  const section = menuSections.find((item) => item.label === sectionLabel);
  if (!section) return;

  const itemHelpers: ItemNavHelpers = {
    focusSectionButton: nav.focusSectionButton,
    focusMenuItem: nav.focusMenuItem,
    getSiblingSectionLabel: nav.getSiblingSectionLabel,
    getFirstEnabledIndex: nav.getFirstEnabledIndex,
    getLastEnabledIndex: nav.getLastEnabledIndex,
    stepEnabledIndex: nav.stepEnabledIndex,
    pendingFocusFirstItemRef: nav.pendingFocusFirstItemRef,
  };

  if (handleMenuItemVerticalNav(event, key, section, itemIndex, itemHelpers)) {
    return;
  }
  if (key === "Escape") {
    event.preventDefault();
    onToggleMenu(sectionLabel);
    nav.focusSectionButton(sectionLabel);
    return;
  }
  if (key === "Tab") {
    if (activeMenu === sectionLabel) onToggleMenu(sectionLabel);
    return;
  }
  if (
    handleMenuItemHorizontalNav(
      event,
      key,
      { sectionLabel, activeMenu, onToggleMenu },
      itemHelpers
    )
  ) {
    return;
  }
  if (key === "Enter" || key === " ") {
    event.preventDefault();
    const targetItem = section.items[itemIndex];
    if (targetItem && !targetItem.disabled) {
      onAction(targetItem.actionId);
    }
  }
}

export function useKeyboardHandlers({
  activeMenu,
  menuSections,
  onToggleMenu,
  onAction,
  menuNavigation,
}: UseKeyboardHandlersParams): UseKeyboardHandlersReturn {
  const state: KeyboardHandlerState = {
    activeMenu,
    menuSections,
    onToggleMenu,
    onAction,
    nav: menuNavigation,
  };

  const handleSectionButtonKeyDown = useCallback(
    (
      event: React.KeyboardEvent<HTMLButtonElement>,
      sectionLabel: string
    ): void => {
      execSectionButtonKeyDown(event, sectionLabel, state);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeMenu, menuSections, onToggleMenu, menuNavigation]
  );

  const handleMenuItemKeyDown = useCallback(
    (
      event: React.KeyboardEvent<HTMLButtonElement>,
      sectionLabel: string,
      itemIndex: number
    ): void => {
      execMenuItemKeyDown(event, sectionLabel, itemIndex, state);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeMenu, menuSections, onAction, onToggleMenu, menuNavigation]
  );

  return {
    handleSectionButtonKeyDown,
    handleMenuItemKeyDown,
  };
}
