/**
 * اختبارات تكامل للمحلل المحلي البديل.
 *
 * الهدف:
 * - التأكد من أن مسار الطوارئ ينتج مخرجات صالحة.
 * - التأكد من ثبات العقد عند غياب الخدمة الخلفية.
 */

import { describe, expect, it, vi, beforeAll } from "vitest";
import {
  createLocalFootageSummary,
  createLocalShotAnalysis,
} from "../local-shot-analysis";

// jsdom لا يدعم URL.createObjectURL — نُعيد تعريفه بحيث يُرجع URL وهمي.
// HTMLImageElement في jsdom لا يُطلق onload للـ blob URLs، لذا نستبدله
// بإصدار يُطلق onload كـ microtask فور تعيين المعالج، مما يسمح للـ Promise
// بالتهيؤ قبل الاستدعاء.
beforeAll(() => {
  // محاكاة createObjectURL / revokeObjectURL
  Object.defineProperty(URL, "createObjectURL", {
    writable: true,
    value: vi.fn(() => "blob:mock-url"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    writable: true,
    value: vi.fn(),
  });

  // استبدال Image بنسخة تُطلق onload كـ microtask بعد تعيينه
  vi.stubGlobal(
    "Image",
    class MockImage {
      naturalWidth = 320;
      naturalHeight = 180;
      src = "";
      private _onload: (() => void) | null = null;
      private _onerror: ((e: unknown) => void) | null = null;

      set onload(fn: (() => void) | null) {
        this._onload = fn;
        if (fn) {
          // يُطلق المعالج كـ microtask بعد تعيينه مباشرةً
          void Promise.resolve().then(() => fn());
        }
      }
      get onload() {
        return this._onload;
      }

      set onerror(fn: ((e: unknown) => void) | null) {
        this._onerror = fn;
      }
      get onerror() {
        return this._onerror;
      }
    }
  );
});

/** ينشئ ملف PNG وهمي ضمن الذاكرة — لا يعتمد على ملفات fixture خارجية */
function createInMemoryImageFile(): File {
  // أصغر PNG صالح: 1×1 بكسل أبيض مشفّر يدويًا
  const pngBytes = new Uint8Array([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a, // PNG signature
    0x00,
    0x00,
    0x00,
    0x0d,
    0x49,
    0x48,
    0x44,
    0x52, // IHDR chunk length + type
    0x00,
    0x00,
    0x00,
    0x01,
    0x00,
    0x00,
    0x00,
    0x01, // width=1, height=1
    0x08,
    0x02,
    0x00,
    0x00,
    0x00,
    0x90,
    0x77,
    0x53, // bit depth=8, colorType=2(RGB)
    0xde,
    0x00,
    0x00,
    0x00,
    0x0c,
    0x49,
    0x44,
    0x41, // IDAT chunk
    0x54,
    0x08,
    0xd7,
    0x63,
    0xf8,
    0xcf,
    0xc0,
    0x00, // compressed image data
    0x00,
    0x00,
    0x02,
    0x00,
    0x01,
    0xe2,
    0x21,
    0xbc, // more data
    0x33,
    0x00,
    0x00,
    0x00,
    0x00,
    0x49,
    0x45,
    0x4e, // IEND chunk
    0x44,
    0xae,
    0x42,
    0x60,
    0x82, // IEND CRC
  ]);
  return new File([pngBytes], "sample-shot.png", { type: "image/png" });
}

describe("local-shot-analysis integration", () => {
  it("ينتج تحليل لقطة صالحًا بعقد ثابت", async () => {
    const file = createInMemoryImageFile();
    const analysis = await createLocalShotAnalysis(file, "noir");

    expect(analysis.score).toBeGreaterThanOrEqual(0);
    expect(analysis.score).toBeLessThanOrEqual(100);
    expect(analysis.exposure).toBeGreaterThanOrEqual(0);
    expect(analysis.exposure).toBeLessThanOrEqual(100);
    expect(typeof analysis.dynamicRange).toBe("string");
    expect(typeof analysis.grainLevel).toBe("string");
    expect(Array.isArray(analysis.issues)).toBe(true);
    expect(analysis.issues.length).toBeGreaterThan(0);
  });

  it("ينتج ملخص مشاهد صالحًا للاستهلاك في الواجهة", async () => {
    const file = createInMemoryImageFile();
    const summary = await createLocalFootageSummary(file, "vintage");

    expect(summary.score).toBeGreaterThanOrEqual(0);
    expect(summary.score).toBeLessThanOrEqual(100);
    expect(typeof summary.status).toBe("string");
    expect(typeof summary.exposure).toBe("string");
    expect(typeof summary.colorBalance).toBe("string");
    expect(typeof summary.focus).toBe("string");
    expect(Array.isArray(summary.suggestions)).toBe(true);
  });
});
