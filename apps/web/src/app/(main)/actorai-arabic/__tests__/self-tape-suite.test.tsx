import React from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import { SelfTapeSuite } from "../self-tape-suite/components/SelfTapeSuite";
import { act, fireEvent, renderWithApp, screen } from "../test-utils";

const trackStop = vi.fn();
const mockStream = {
  getTracks: () => [{ stop: trackStop }, { stop: trackStop }],
} as unknown as MediaStream;

class MockMediaRecorder {
  static isTypeSupported = vi.fn(() => true);

  public mimeType: string;
  public state: RecordingState = "inactive";
  public ondataavailable: ((event: BlobEvent) => void) | null = null;
  public onstop: (() => void) | null = null;
  public onerror: (() => void) | null = null;

  constructor(_stream: MediaStream, options?: MediaRecorderOptions) {
    this.mimeType = options?.mimeType ?? "video/webm";
  }

  start = vi.fn(() => {
    this.state = "recording";
  });

  stop = vi.fn(() => {
    this.state = "inactive";
    const blob = new Blob(["fake-video"], { type: this.mimeType });
    this.ondataavailable?.({ data: blob } as BlobEvent);
    this.onstop?.();
  });

  pause = vi.fn();
  resume = vi.fn();
  requestData = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  dispatchEvent = vi.fn();
}

async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve();
  });
}

async function advanceTimers(milliseconds: number) {
  await act(async () => {
    vi.advanceTimersByTime(milliseconds);
    await Promise.resolve();
  });
}

async function createRecordedTake() {
  renderWithApp(<SelfTapeSuite />);

  fireEvent.click(screen.getByRole("button", { name: /التسجيل/ }));
  await flushMicrotasks();
  expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: /بدء التسجيل/ }));
  await flushMicrotasks();

  await advanceTimers(3000);

  fireEvent.click(screen.getByRole("button", { name: /إنهاء التسجيل/ }));
  await flushMicrotasks();
  expect(
    screen.getByText("تم حفظ Take 1 وتوليد تقييمه المحلي بنجاح.")
  ).toBeInTheDocument();
}

describe("SelfTapeSuite", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    trackStop.mockClear();

    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream),
      },
    });

    Object.defineProperty(HTMLMediaElement.prototype, "srcObject", {
      configurable: true,
      get() {
        return null;
      },
      set(_value) {
        return undefined;
      },
    });

    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn(() => "blob:session-take"),
    });

    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });

    vi.stubGlobal(
      "MediaRecorder",
      MockMediaRecorder
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("ينشئ تسجيلاً حياً قابلاً للتصدير بعد إكمال التسجيل", async () => {
    await createRecordedTake();

    expect(screen.getByText("جلسة حيّة")).toBeInTheDocument();
    expect(screen.getByText("Take 1")).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "📤 تصدير" }).length
    ).toBeGreaterThan(0);
  });

  it("ينزل الملف عند طلب التصدير للتسجيل الحي", async () => {
    await createRecordedTake();

    fireEvent.click(screen.getByRole("button", { name: /التصدير/ }));
    await flushMicrotasks();
    fireEvent.click(screen.getByRole("button", { name: "📤 تنزيل" }));
    await advanceTimers(80);
    await advanceTimers(80);
    await advanceTimers(120);
    expect(screen.getByText(/تم تنزيل Take 1/)).toBeInTheDocument();

    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
  });
});
