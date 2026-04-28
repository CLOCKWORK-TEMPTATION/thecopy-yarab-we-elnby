/**
 * @module app-header/utils
 * @description دوال مساعدة لمكون AppHeader
 */

import type { AppShellMenuItem, AppShellMenuSection } from "./types";

export const toTestId = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, "-");

export const isEnabled = (item: AppShellMenuItem): boolean => !item.disabled;

export const getFirstEnabledIndex = (section: AppShellMenuSection): number => {
  return section.items.findIndex(isEnabled);
};

export const getLastEnabledIndex = (section: AppShellMenuSection): number => {
  for (let i = section.items.length - 1; i >= 0; i -= 1) {
    const candidate = section.items[i];
    if (candidate && isEnabled(candidate)) return i;
  }
  return -1;
};

export const stepEnabledIndex = (
  section: AppShellMenuSection,
  fromIndex: number,
  direction: 1 | -1
): number => {
  const length = section.items.length;
  if (length === 0) return -1;
  let cursor = fromIndex;
  for (let step = 0; step < length; step += 1) {
    cursor = (cursor + direction + length) % length;
    const candidate = section.items[cursor];
    if (candidate && isEnabled(candidate)) return cursor;
  }
  return -1;
};
