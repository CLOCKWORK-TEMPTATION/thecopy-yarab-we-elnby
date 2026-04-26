import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { createIntersectionObserver } from "./animations";

describe("createIntersectionObserver", () => {
  const originalIntersectionObserver = window.IntersectionObserver;

  beforeEach(() => {
    // Reset vi mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original
    window.IntersectionObserver = originalIntersectionObserver;
  });

  it("should create an IntersectionObserver with default options", () => {
    // Mock the global IntersectionObserver
    const mockCallback = vi.fn();
    const mockObserver = {
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    };

    // Assign mock directly to window
    const IntersectionObserverMock = vi
      .fn()
      .mockImplementation(() => mockObserver);
    window.IntersectionObserver = IntersectionObserverMock;

    const observer = createIntersectionObserver(mockCallback);

    expect(IntersectionObserverMock).toHaveBeenCalledWith(
      expect.any(Function),
      { threshold: 0.1 } // Default options
    );
    expect(observer).toBe(mockObserver);
  });

  it("should create an IntersectionObserver with merged custom options", () => {
    // Mock the global IntersectionObserver
    const mockCallback = vi.fn();
    const mockObserver = {
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    };

    // Assign mock directly to window
    const IntersectionObserverMock = vi
      .fn()
      .mockImplementation(() => mockObserver);
    window.IntersectionObserver = IntersectionObserverMock;

    const customOptions = { threshold: 0.5, rootMargin: "10px" };
    createIntersectionObserver(mockCallback, customOptions);

    expect(IntersectionObserverMock).toHaveBeenCalledWith(
      expect.any(Function),
      { threshold: 0.5, rootMargin: "10px" } // Merged options
    );
  });

  it("should trigger the callback for each entry when intersection occurs", () => {
    let observerCallback: IntersectionObserverCallback | null = null;

    // Mock the global IntersectionObserver and capture the callback
    const IntersectionObserverMock = vi.fn().mockImplementation((cb) => {
      observerCallback = cb;
      return {
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
      };
    });
    window.IntersectionObserver = IntersectionObserverMock;

    const myCallback = vi.fn();
    createIntersectionObserver(myCallback);

    // Make sure we captured the callback
    expect(observerCallback).not.toBeNull();

    // Create some fake entries
    const entries = [
      { isIntersecting: true, target: document.createElement("div") },
      { isIntersecting: false, target: document.createElement("span") },
    ] as unknown as IntersectionObserverEntry[];

    // Trigger the callback manually
    if (observerCallback) {
      observerCallback(entries, {});
    }

    // Verify our custom callback was called for each entry
    expect(myCallback).toHaveBeenCalledTimes(2);
    expect(myCallback).toHaveBeenNthCalledWith(1, entries[0], 0, entries);
    expect(myCallback).toHaveBeenNthCalledWith(2, entries[1], 1, entries);
  });
});
