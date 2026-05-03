// اختبار صارم لمحوّل ألوان التصدير — مرتبط بفشل PDF الموثَّق:
//   "Attempting to parse an unsupported color function 'oklch'".

import { describe, expect, it } from "vitest";

import { toExportSafeColor } from "../color.js";

describe("toExportSafeColor", () => {
  it("يحوّل oklch إلى rgb()", () => {
    const result = toExportSafeColor("oklch(0.7 0.1 200)");
    expect(result.startsWith("rgb(") || result.startsWith("rgba(")).toBe(true);
    expect(/oklch/i.test(result)).toBe(false);
  });

  it("يحوّل oklab إلى rgb()", () => {
    const result = toExportSafeColor("oklab(0.5 0.05 -0.05)");
    expect(result.startsWith("rgb(") || result.startsWith("rgba(")).toBe(true);
    expect(/oklab/i.test(result)).toBe(false);
  });

  it("يبقي على hex/rgb/hsl كما هي", () => {
    expect(toExportSafeColor("#fff")).toBe("#fff");
    expect(toExportSafeColor("rgb(0, 0, 0)")).toBe("rgb(0, 0, 0)");
    expect(toExportSafeColor("hsl(120, 100%, 50%)")).toBe("hsl(120, 100%, 50%)");
  });

  it("يستبدل color-mix بـ fallback آمن", () => {
    const result = toExportSafeColor("color-mix(in oklch, red, blue)");
    expect(/color-mix/i.test(result)).toBe(false);
    expect(result.startsWith("rgb")).toBe(true);
  });

  it("يستخدم fallback أبيض للخلفية الفارغة", () => {
    expect(toExportSafeColor("", "background")).toBe("rgb(255, 255, 255)");
  });

  it("يستخدم fallback أسود للنص الفارغ", () => {
    expect(toExportSafeColor("", "foreground")).toBe("rgb(0, 0, 0)");
  });
});
