/**
 * ============================================================================
 * اختبارات — useCurrentUser
 * ============================================================================
 *
 * تغطي:
 *   - القراءة الأولى من JWT في الذاكرة
 *   - التحديث عند focus النافذة
 *   - الاستجابة لحدث breakapp:auth-expired بإعادة user إلى null
 *   - refresh اليدوي يُعيد القراءة
 * ============================================================================
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { removeToken, storeToken } from "../../src/lib/auth";
import { useCurrentUser } from "../../src/hooks/useCurrentUser";

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.sig`;
}

function validJwt(role = "crew"): string {
  return makeJwt({
    sub: "user_1",
    projectId: "project_x",
    role,
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
}

describe("useCurrentUser", () => {
  beforeEach(() => {
    removeToken();
  });

  afterEach(() => {
    removeToken();
  });

  it("returns null user when no token stored", async () => {
    const { result } = renderHook(() => useCurrentUser({ pollIntervalMs: 0 }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeNull();
  });

  it("reads user from JWT on mount", async () => {
    storeToken(validJwt("director"));

    const { result } = renderHook(() => useCurrentUser({ pollIntervalMs: 0 }));

    await waitFor(() => {
      expect(result.current.user).not.toBeNull();
    });

    expect(result.current.user).toEqual({
      userId: "user_1",
      projectId: "project_x",
      role: "director",
    });
  });

  it("updates on window focus when token changes", async () => {
    const { result } = renderHook(() => useCurrentUser({ pollIntervalMs: 0 }));
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.user).toBeNull();

    storeToken(validJwt("runner"));
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });

    await waitFor(() => {
      expect(result.current.user?.role).toBe("runner");
    });
  });

  it("clears user on breakapp:auth-expired event", async () => {
    storeToken(validJwt("crew"));
    const { result } = renderHook(() => useCurrentUser({ pollIntervalMs: 0 }));

    await waitFor(() => {
      expect(result.current.user).not.toBeNull();
    });

    act(() => {
      window.dispatchEvent(new CustomEvent("breakapp:auth-expired"));
    });

    await waitFor(() => {
      expect(result.current.user).toBeNull();
    });
  });

  it("refresh() triggers a re-read of current token", async () => {
    const { result } = renderHook(() => useCurrentUser({ pollIntervalMs: 0 }));
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    storeToken(validJwt("admin"));
    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.user?.role).toBe("admin");
  });
});
