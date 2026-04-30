import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "./route";

const { proxyToBackend } = vi.hoisted(() => ({
  proxyToBackend: vi.fn(),
}));

vi.mock("@/lib/server/backend-proxy", () => ({
  proxyToBackend,
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

function buildContext(path: string[]) {
  return {
    params: Promise.resolve({ path }),
  };
}

describe("public analysis catch-all route", () => {
  beforeEach(() => {
    proxyToBackend.mockReset();
    proxyToBackend.mockResolvedValue(
      NextResponse.json({ success: true }, { status: 200 })
    );
  });

  it("proxies public stream subscriptions to the backend", async () => {
    const request = new NextRequest(
      "http://localhost/api/public/analysis/seven-stations/stream/analysis-1"
    );

    const response = await GET(request, buildContext(["stream", "analysis-1"]));

    expect(response.status).toBe(200);
    expect(proxyToBackend).toHaveBeenCalledWith(
      expect.any(NextRequest),
      "/api/public/analysis/seven-stations/stream/analysis-1",
      expect.objectContaining({ timeoutMs: expect.any(Number) as number })
    );
  });

  it("proxies public export requests to the backend", async () => {
    const request = new NextRequest(
      "http://localhost/api/public/analysis/seven-stations/analysis-1/export",
      {
        method: "POST",
        body: JSON.stringify({ format: "docx" }),
        headers: { "Content-Type": "application/json" },
      }
    );

    const response = await POST(
      request,
      buildContext(["analysis-1", "export"])
    );

    expect(response.status).toBe(200);
    expect(proxyToBackend).toHaveBeenCalledWith(
      expect.any(NextRequest),
      "/api/public/analysis/seven-stations/analysis-1/export",
      expect.objectContaining({ timeoutMs: expect.any(Number) as number })
    );
  });
});
