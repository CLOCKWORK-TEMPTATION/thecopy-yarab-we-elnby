/**
 * ============================================================================
 * إعداد بيئة الاختبار — vitest + jsdom
 * ============================================================================
 * يُضيف matchers الخاصة بـ jest-dom، ويُهيّئ كائنات المتصفح الناقصة في jsdom
 * (مثل isSecureContext وmediaDevices) لتسمح بمحاكاة سيناريوهات الكاميرا.
 * ============================================================================
 */

import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

/**
 * تنظيف DOM وكل mocks بعد كل اختبار
 */
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

/**
 * حالة افتراضية قبل كل اختبار: سياق آمن ومتصفح يدعم mediaDevices
 * يسمح للاختبارات الفردية بإلغاء هذه القيم لمحاكاة حالات الفشل
 */
beforeEach(() => {
  Object.defineProperty(window, "isSecureContext", {
    configurable: true,
    writable: true,
    value: true,
  });
});
