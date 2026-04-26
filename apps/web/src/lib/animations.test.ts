import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createIntersectionObserver } from "./animations";

/**
 * vi.fn() في vitest v4 لا يكشف [[Construct]] بصورة قابلة للاستدعاء عبر `new`،
 * فأي محاولة `new IntersectionObserverMock(...)` كانت تفشل بـ
 * "TypeError: ... is not a constructor". الحل: استخدام class حقيقية مع spies
 * مرفقة كـ static/instance fields. هذا يحفظ نفس مستوى التأكيد (تتبع الاستدعاءات
 * + التحقق من الوسائط) مع توافق كامل مع `new`.
 */

describe("createIntersectionObserver", () => {
  const originalIntersectionObserver = window.IntersectionObserver;

  // spy مشترك لتتبّع المُنشِئ ووسائطه
  let constructorCalls: Array<{
    callback: IntersectionObserverCallback;
    options: IntersectionObserverInit | undefined;
  }> = [];
  let lastObserver: {
    observe: ReturnType<typeof vi.fn>;
    unobserve: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  } | null = null;

  class IntersectionObserverMock {
    public observe = vi.fn();
    public unobserve = vi.fn();
    public disconnect = vi.fn();
    public takeRecords = vi.fn(() => []);
    public root: Element | null = null;
    public rootMargin = "";
    public thresholds: ReadonlyArray<number> = [];
    public callback: IntersectionObserverCallback;

    constructor(
      cb: IntersectionObserverCallback,
      options?: IntersectionObserverInit
    ) {
      this.callback = cb;
      constructorCalls.push({ callback: cb, options });
      lastObserver = {
        observe: this.observe,
        unobserve: this.unobserve,
        disconnect: this.disconnect,
      };
    }
  }

  beforeEach(() => {
    constructorCalls = [];
    lastObserver = null;
    vi.clearAllMocks();
    (
      window as unknown as {
        IntersectionObserver: typeof IntersectionObserverMock;
      }
    ).IntersectionObserver = IntersectionObserverMock;
  });

  afterEach(() => {
    window.IntersectionObserver = originalIntersectionObserver;
  });

  it("should create an IntersectionObserver with default options", () => {
    const myCallback = vi.fn();
    const observer = createIntersectionObserver(myCallback);

    expect(constructorCalls).toHaveLength(1);
    expect(constructorCalls[0].options).toEqual({ threshold: 0.1 });
    expect(typeof constructorCalls[0].callback).toBe("function");
    expect(observer).toBeInstanceOf(IntersectionObserverMock);
  });

  it("should create an IntersectionObserver with merged custom options", () => {
    const myCallback = vi.fn();
    const customOptions = { threshold: 0.5, rootMargin: "10px" };
    createIntersectionObserver(myCallback, customOptions);

    expect(constructorCalls).toHaveLength(1);
    expect(constructorCalls[0].options).toEqual({
      threshold: 0.5,
      rootMargin: "10px",
    });
  });

  it("should trigger the callback for each entry when intersection occurs", () => {
    const myCallback = vi.fn();
    createIntersectionObserver(myCallback);

    expect(constructorCalls).toHaveLength(1);
    const observerCallback = constructorCalls[0].callback;

    const entries = [
      { isIntersecting: true, target: document.createElement("div") },
      { isIntersecting: false, target: document.createElement("span") },
    ] as unknown as IntersectionObserverEntry[];

    observerCallback(entries, {} as IntersectionObserver);

    expect(myCallback).toHaveBeenCalledTimes(2);
    expect(myCallback).toHaveBeenNthCalledWith(1, entries[0], 0, entries);
    expect(myCallback).toHaveBeenNthCalledWith(2, entries[1], 1, entries);
  });
});
