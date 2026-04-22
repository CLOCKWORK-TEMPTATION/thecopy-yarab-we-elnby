import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "@/app/api/brainstorm/route";

const { proxyToBackend } = vi.hoisted(() => ({
  proxyToBackend: vi.fn(),
}));

vi.mock("@/lib/server/backend-proxy", () => ({
  proxyToBackend,
  getBackendBaseUrl: vi.fn(() => "http://localhost:3001"),
  buildProxyErrorResponse: vi.fn((error: unknown, fallbackMessage: string) =>
    NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : fallbackMessage,
      },
      { status: 500 }
    )
  ),
}));

describe("brainstorm route", () => {
  beforeEach(() => {
    proxyToBackend.mockReset();
    proxyToBackend.mockResolvedValue(
      NextResponse.json({ success: true, data: {} }, { status: 200 })
    );
  });

  it("proxies GET catalog requests to backend", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/brainstorm", {
        method: "GET",
      })
    );

    expect(response.status).toBe(200);
    expect(proxyToBackend).toHaveBeenCalledWith(
      expect.any(NextRequest),
      "/api/brainstorm"
    );
  });

  it("proxies POST debate requests to backend", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/brainstorm", {
        method: "POST",
        body: JSON.stringify({
          task: "اختبر الفكرة",
          agentIds: ["analysis", "creative"],
        }),
        headers: {
          "Content-Type": "application/json",
        },
      })
    );

    expect(response.status).toBe(200);
    expect(proxyToBackend).toHaveBeenCalledWith(
      expect.any(NextRequest),
      "/api/brainstorm"
    );
  });
});
