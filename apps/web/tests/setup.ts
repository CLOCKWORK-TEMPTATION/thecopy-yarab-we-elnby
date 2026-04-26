/**
 * ملف إعداد Vitest
 * يوفر البيئة الأساسية لتشغيل اختبارات React و DOM
 */

import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";
import React from "react";
import { expect, afterEach, vi } from "vitest";

expect.extend(matchers);

vi.mock("@/components/aceternity/noise-background", () => ({
  NoiseBackground: ({ className }: { className?: string }) =>
    React.createElement("div", {
      "data-testid": "noise-background",
      className,
    }),
}));

// تنظيف DOM بعد كل اختبار
afterEach(() => {
  cleanup();
  if (typeof window !== "undefined") {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.history.replaceState({}, "", "/");
    document.documentElement.removeAttribute("data-theme");
  }
});

// محاكاة matchMedia للمكونات التي تستخدم media queries
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

Object.defineProperty(window, "scrollTo", {
  writable: true,
  value: vi.fn(),
});

class MockResizeObserver implements ResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);

  constructor(_callback: ResizeObserverCallback) {}
}

Object.defineProperty(window, "ResizeObserver", {
  configurable: true,
  writable: true,
  value: MockResizeObserver,
});

Object.defineProperty(globalThis, "ResizeObserver", {
  configurable: true,
  writable: true,
  value: MockResizeObserver,
});

// محاكاة IntersectionObserver
class MockIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds = [];
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);

  constructor(_callback: IntersectionObserverCallback) {}
}

Object.defineProperty(window, "IntersectionObserver", {
  configurable: true,
  writable: true,
  value: MockIntersectionObserver,
});

Object.defineProperty(globalThis, "IntersectionObserver", {
  configurable: true,
  writable: true,
  value: MockIntersectionObserver,
});
