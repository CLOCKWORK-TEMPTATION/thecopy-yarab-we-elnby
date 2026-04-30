import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearRemoteAppState,
  loadRemoteAppState,
  persistRemoteAppState,
} from "./app-state-client";

const APP_ID = "actorai-arabic";

describe("app-state-client remote fallback", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.stubEnv("NEXT_PUBLIC_ENABLE_REMOTE_APP_STATE", undefined);
    vi.stubEnv("NEXT_PUBLIC_APP_STATE_BASE_URL", undefined);
    vi.stubEnv("NEXT_PUBLIC_BACKEND_URL", undefined);
    vi.stubEnv("NEXT_PUBLIC_API_URL", undefined);
    vi.stubEnv("BACKEND_URL", undefined);
  });

  it("does not call remote endpoints when remote app state is not configured", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("network should not be used"));

    await expect(loadRemoteAppState(APP_ID)).resolves.toBeNull();
    await expect(persistRemoteAppState(APP_ID, { currentView: "home" }))
      .resolves.toEqual({ currentView: "home" });
    await expect(clearRemoteAppState(APP_ID)).resolves.toBeUndefined();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("does not treat the generic backend URL as remote app-state configuration", async () => {
    vi.stubEnv("NEXT_PUBLIC_BACKEND_URL", "http://localhost:3001");
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("network should not be used"));

    await expect(loadRemoteAppState(APP_ID)).resolves.toBeNull();
    await expect(persistRemoteAppState(APP_ID, { currentView: "demo" }))
      .resolves.toEqual({ currentView: "demo" });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("uses the configured remote endpoint when explicitly enabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_REMOTE_APP_STATE", "true");
    vi.stubEnv("NEXT_PUBLIC_APP_STATE_BASE_URL", "https://state.example.test");

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: { currentView: "demo" },
          updatedAt: new Date().toISOString(),
        }),
        { status: 200 }
      )
    );

    await expect(loadRemoteAppState(APP_ID)).resolves.toEqual({
      currentView: "demo",
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      "http://localhost:3000/api/app-state/actorai-arabic",
      expect.objectContaining({ method: "GET" })
    );
  });
});
