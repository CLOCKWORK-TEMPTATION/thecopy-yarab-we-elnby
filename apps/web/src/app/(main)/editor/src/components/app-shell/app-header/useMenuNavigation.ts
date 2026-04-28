/**
 * @module app-header/useMenuNavigation
 * @description Hook للتنقل في قائمة الهيدر
 */

import { useCallback, useMemo, useRef, useEffect, useId } from "react";

import {
  getFirstEnabledIndex,
  getLastEnabledIndex,
  stepEnabledIndex,
} from "./utils";

import type { AppShellMenuSection } from "./types";

export interface UseMenuNavigationReturn {
  menubarId: string;
  menubarButtonRefs: React.MutableRefObject<
    Record<string, HTMLButtonElement | null>
  >;
  menuItemRefs: React.MutableRefObject<
    Record<string, HTMLButtonElement | null>
  >;
  previouslyActiveMenuRef: React.MutableRefObject<string | null>;
  pendingFocusFirstItemRef: React.MutableRefObject<string | null>;
  sectionIndex: Map<string, number>;
  focusSectionButton: (sectionLabel: string) => void;
  focusMenuItem: (sectionLabel: string, itemIndex: number) => void;
  getFirstEnabledIndex: (section: AppShellMenuSection) => number;
  getLastEnabledIndex: (section: AppShellMenuSection) => number;
  stepEnabledIndex: (
    section: AppShellMenuSection,
    fromIndex: number,
    direction: 1 | -1
  ) => number;
  getSiblingSectionLabel: (
    fromLabel: string,
    direction: "next" | "prev" | "first" | "last"
  ) => string | null;
}

export function useMenuNavigation(
  menuSections: readonly AppShellMenuSection[],
  activeMenu: string | null
): UseMenuNavigationReturn {
  const menubarId = useId();
  const menubarButtonRefs = useRef<Record<string, HTMLButtonElement | null>>(
    {}
  );
  const menuItemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const previouslyActiveMenuRef = useRef<string | null>(null);
  const pendingFocusFirstItemRef = useRef<string | null>(null);

  const sectionIndex = useMemo(() => {
    const map = new Map<string, number>();
    menuSections.forEach((section, index) => map.set(section.label, index));
    return map;
  }, [menuSections]);

  const getSiblingSectionLabel = useCallback(
    (
      fromLabel: string,
      direction: "next" | "prev" | "first" | "last"
    ): string | null => {
      if (menuSections.length === 0) return null;
      if (direction === "first") return menuSections[0]?.label ?? null;
      if (direction === "last")
        return menuSections[menuSections.length - 1]?.label ?? null;
      const currentIndex = sectionIndex.get(fromLabel);
      if (currentIndex === undefined) return null;
      const delta = direction === "next" ? 1 : -1;
      const nextIndex =
        (currentIndex + delta + menuSections.length) % menuSections.length;
      return menuSections[nextIndex]?.label ?? null;
    },
    [menuSections, sectionIndex]
  );

  const focusSectionButton = useCallback((sectionLabel: string): void => {
    const target = menubarButtonRefs.current[sectionLabel];
    if (target) {
      target.focus();
    }
  }, []);

  const focusMenuItem = useCallback(
    (sectionLabel: string, itemIndex: number): void => {
      const key = `${sectionLabel}::${itemIndex}`;
      const target = menuItemRefs.current[key];
      if (target) {
        target.focus();
      }
    },
    []
  );

  const getFirstEnabledIndexCallback = useCallback(
    (section: AppShellMenuSection): number => getFirstEnabledIndex(section),
    []
  );

  const getLastEnabledIndexCallback = useCallback(
    (section: AppShellMenuSection): number => getLastEnabledIndex(section),
    []
  );

  const stepEnabledIndexCallback = useCallback(
    (
      section: AppShellMenuSection,
      fromIndex: number,
      direction: 1 | -1
    ): number => stepEnabledIndex(section, fromIndex, direction),
    []
  );

  useEffect(() => {
    if (activeMenu && previouslyActiveMenuRef.current !== activeMenu) {
      const section = menuSections.find((item) => item.label === activeMenu);
      if (section) {
        const targetIndex =
          pendingFocusFirstItemRef.current === activeMenu
            ? getFirstEnabledIndex(section)
            : getFirstEnabledIndex(section);
        if (targetIndex >= 0) {
          requestAnimationFrame(() => {
            focusMenuItem(activeMenu, targetIndex);
          });
        }
      }
      pendingFocusFirstItemRef.current = null;
    }

    if (!activeMenu && previouslyActiveMenuRef.current) {
      const lastLabel = previouslyActiveMenuRef.current;
      requestAnimationFrame(() => {
        focusSectionButton(lastLabel);
      });
    }

    previouslyActiveMenuRef.current = activeMenu;
  }, [activeMenu, menuSections, focusMenuItem, focusSectionButton]);

  return {
    menubarId,
    menubarButtonRefs,
    menuItemRefs,
    previouslyActiveMenuRef,
    pendingFocusFirstItemRef,
    sectionIndex,
    focusSectionButton,
    focusMenuItem,
    getFirstEnabledIndex: getFirstEnabledIndexCallback,
    getLastEnabledIndex: getLastEnabledIndexCallback,
    stepEnabledIndex: stepEnabledIndexCallback,
    getSiblingSectionLabel,
  };
}
