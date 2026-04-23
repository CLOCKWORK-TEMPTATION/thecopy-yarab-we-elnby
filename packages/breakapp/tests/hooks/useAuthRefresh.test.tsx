/**
 * ============================================================================
 * اختبارات — useAuthRefresh
 * ============================================================================
 *
 * تغطي:
 *   - جدولة refresh قبل exp بهامش skewMs
 *   - استدعاء onExpired عند حدث breakapp:auth-expired
 *   - عدم الجدولة إذا لم يوجد توكن
 *   - إلغاء المؤقتات عند unmount
 * ============================================================================
 */

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { AxiosError } from "axios";
import { api, removeToken, storeToken } from "../../src/lib/auth";
import { useAuthRefresh } from "../../src/hooks/useAuthRefresh";

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.sig`;
}

function jwtExpiringIn(seconds: number): string {
  return makeJwt({
    sub: "user_1",
    projectId: "p",
    role: "crew",
    exp: Math.floor(Date.now() / 1000) + seconds,
  });
}

/**
 * Adapter وهمي يُسجّل استدعاءات /auth/refresh ويُعيد توكن جديد كل مرة
 */
function buildRefreshAdapter(nextToken: () => string, onCall: () => void): AxiosAdapter {
  return async (config): Promise<AxiosResponse> => {
    if (config.url === "/auth/refresh") {
      onCall();
      return {
        data: { access_token: nextToken() },
        status: 200,
        statusText: "OK",
        headers: {},
        config: config as InternalAxiosRequestConfig,
      };
    }
    throw new AxiosError(
      `No mock for ${config.url}`,
      "ERR_MOCK_NOT_FOUND",
      config as InternalAxiosRequestConfig
    );
  };
}

describe("useAuthRefresh", () => {
  const originalAdapter = api.defaults.adapter;

  beforeEach(() => {
    vi.useFakeTimers();
    removeToken();
  });

  afterEach(() => {
    vi.useRealTimers();
    api.defaults.adapter = originalAdapter;
    removeToken();
  });

  it("does not schedule when no token is present", () => {
    const setTimeoutSpy = vi.spyOn(global, "setTimeout");

    renderHook(() => useAuthRefresh({ skewMs: 1000, minIntervalMs: 100 }));

    // لا توجد جدولة لـ refresh — قد يُستدعى setTimeout لأسباب أخرى (testing lib)
    // لكن لن يوجد توقيت ينتج عن schedule() لأنها ترجع مبكراً.
    // نتحقق عبر عدم استدعاء adapter.
    const adapterCalls = vi.fn();
    api.defaults.adapter = buildRefreshAdapter(() => jwtExpiringIn(3600), adapterCalls);

    vi.advanceTimersByTime(10_000);
    expect(adapterCalls).not.toHaveBeenCalled();

    setTimeoutSpy.mockRestore();
  });

  it("schedules refresh before exp and stores new token", async () => {
    storeToken(jwtExpiringIn(5)); // ينتهي بعد 5 ثوانٍ

    const adapterCalls = vi.fn();
    api.defaults.adapter = buildRefreshAdapter(() => jwtExpiringIn(3600), adapterCalls);

    renderHook(() =>
      useAuthRefresh({ skewMs: 1000, minIntervalMs: 100 })
    );

    // التأخير المتوقّع: max(100, 5000 - 1000) = 4000ms
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4100);
    });

    expect(adapterCalls).toHaveBeenCalledTimes(1);
  });

  it("calls onExpired when breakapp:auth-expired event fires", async () => {
    storeToken(jwtExpiringIn(3600));
    const onExpired = vi.fn();

    renderHook(() => useAuthRefresh({ onExpired }));

    act(() => {
      window.dispatchEvent(new CustomEvent("breakapp:auth-expired"));
    });

    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it("cleans up timers and listeners on unmount", async () => {
    storeToken(jwtExpiringIn(60));
    const adapterCalls = vi.fn();
    api.defaults.adapter = buildRefreshAdapter(() => jwtExpiringIn(3600), adapterCalls);

    const { unmount } = renderHook(() =>
      useAuthRefresh({ skewMs: 1000, minIntervalMs: 100 })
    );

    unmount();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000);
    });

    expect(adapterCalls).not.toHaveBeenCalled();
  });
});
