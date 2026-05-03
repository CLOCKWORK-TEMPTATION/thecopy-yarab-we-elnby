// ============================================================================
// اختبار أمني صارم: لا يجوز وجود توكن JWT/access/refresh في التخزين المحلي
// ============================================================================
// قاعدة منع إضعاف الفحوصات: هذا الاختبار يفشل في كل الحالات الموثَّقة
// لتسرّب التوكنات. لا يُسمح بتخفيفه أو تضييق نطاقه.

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  assertNoClientTokenStorage,
  auditClientTokenStorage,
  bootstrapClientStorageGuard,
} from "../client.js";

class MemoryStorage implements Storage {
  private store: Map<string, string> = new Map();

  public get length(): number {
    return this.store.size;
  }

  public clear(): void {
    this.store.clear();
  }

  public getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) ?? null) : null;
  }

  public key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] ?? null;
  }

  public removeItem(key: string): void {
    this.store.delete(key);
  }

  public setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

beforeEach(() => {
  const local = new MemoryStorage();
  const session = new MemoryStorage();
  Object.defineProperty(globalThis, "window", {
    value: { localStorage: local, sessionStorage: session },
    configurable: true,
    writable: true,
  });
});

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

describe("auditClientTokenStorage", () => {
  it("يكتشف ويمسح JWT بصيغة header.payload.signature", () => {
    const jwt =
      "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTYifQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
    window.localStorage.setItem("user_token", jwt);

    const report = auditClientTokenStorage({ clear: true });

    expect(report.findings).toHaveLength(1);
    expect(report.findings[0]?.reason).toBe("value_pattern_jwt");
    expect(report.cleared).toBe(1);
    expect(window.localStorage.getItem("user_token")).toBeNull();
  });

  it("يكتشف مفاتيح بأنماط محظورة بصرف النظر عن القيمة", () => {
    window.localStorage.setItem("jwt", "x");
    window.localStorage.setItem("access_token", "x");
    window.localStorage.setItem("refresh_token", "x");
    window.sessionStorage.setItem("authorization", "x");

    const report = auditClientTokenStorage({ clear: true });

    expect(report.findings.length).toBeGreaterThanOrEqual(4);
    expect(report.cleared).toBeGreaterThanOrEqual(4);
  });

  it("يكتشف Bearer token في القيمة", () => {
    window.localStorage.setItem("auth", "Bearer abcdef.ghijkl-mnopq");

    const report = auditClientTokenStorage({ clear: true });
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0]?.reason).toBe("value_pattern_bearer");
  });

  it("يستثني XSRF-TOKEN لأنه ليس توكن جلسة سرّياً", () => {
    window.localStorage.setItem("XSRF-TOKEN", "csrf-value");

    const report = auditClientTokenStorage({ clear: false });
    expect(report.findings).toHaveLength(0);
  });

  it("لا يكسر التطبيق عند غياب window (SSR)", () => {
    delete (globalThis as { window?: unknown }).window;
    const report = auditClientTokenStorage();
    expect(report.findings).toHaveLength(0);
    expect(report.scannedKeys).toBe(0);
  });
});

describe("assertNoClientTokenStorage", () => {
  it("ينجح عندما لا يوجد توكن", () => {
    window.localStorage.setItem("the-copy.editor.v1.draft.text", "محتوى");
    expect(() => {
      assertNoClientTokenStorage();
    }).not.toThrow();
  });

  it("يفشل بصرامة عند وجود JWT", () => {
    window.localStorage.setItem(
      "session_jwt",
      "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature",
    );
    expect(() => {
      assertNoClientTokenStorage();
    }).toThrow(/sensitive token detected/);
  });

  it("يفشل عند وجود access_token حتى بقيمة قصيرة", () => {
    window.localStorage.setItem("access_token", "abc");
    expect(() => {
      assertNoClientTokenStorage();
    }).toThrow(/sensitive token detected/);
  });
});

describe("bootstrapClientStorageGuard", () => {
  it("يمسح التوكنات الموجودة عند التشغيل", () => {
    window.localStorage.setItem("jwt", "x");
    window.localStorage.setItem("the-copy.app.v1.draft.text", "نص");

    const report = bootstrapClientStorageGuard();

    expect(report.cleared).toBeGreaterThanOrEqual(1);
    expect(window.localStorage.getItem("jwt")).toBeNull();
    expect(window.localStorage.getItem("the-copy.app.v1.draft.text")).toBe("نص");
  });
});
