import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE, GET, PUT } from "@/app/api/app-state/[app]/route";

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

function buildContext(app: string) {
  return {
    params: Promise.resolve({ app }),
  };
}

describe("app-state route", () => {
  beforeEach(() => {
    proxyToBackend.mockReset();
    proxyToBackend.mockResolvedValue(
      NextResponse.json(
        {
          success: true,
          data: { draft: "نص" },
          updatedAt: "2026-04-02T00:00:00.000Z",
        },
        { status: 200 }
      )
    );
  });

  it("forwards GET for valid app identifiers", async () => {
    const request = new NextRequest("http://localhost/api/app-state/analysis");
    const response = await GET(request, buildContext("analysis"));

    expect(response.status).toBe(200);
    expect(proxyToBackend).toHaveBeenCalledWith(
      expect.any(NextRequest),
      "/api/app-state/analysis"
    );
  });

  it("forwards PUT payloads to backend for valid apps", async () => {
    const response = await PUT(
      new NextRequest("http://localhost/api/app-state/BUDGET", {
        method: "PUT",
        body: JSON.stringify({
          data: {
            totals: { aboveTheLine: 1000 },
          },
        }),
        headers: {
          "Content-Type": "application/json",
        },
      }),
      buildContext("BUDGET")
    );

    expect(response.status).toBe(200);
    expect(proxyToBackend).toHaveBeenCalledWith(
      expect.any(NextRequest),
      "/api/app-state/BUDGET",
      {
        body: JSON.stringify({
          data: {
            totals: { aboveTheLine: 1000 },
          },
        }),
        headers: { "content-type": "application/json" },
      }
    );
  });

  it("forwards DELETE for valid app identifiers", async () => {
    const response = await DELETE(
      new NextRequest("http://localhost/api/app-state/brain-storm-ai", {
        method: "DELETE",
      }),
      buildContext("brain-storm-ai")
    );

    expect(response.status).toBe(200);
    expect(proxyToBackend).toHaveBeenCalledWith(
      expect.any(NextRequest),
      "/api/app-state/brain-storm-ai"
    );
  });

  it("rejects invalid app identifiers before proxying", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/app-state/invalid-app"),
      buildContext("invalid-app")
    );

    expect(response.status).toBe(400);
    expect(proxyToBackend).not.toHaveBeenCalled();
  });

  it("rejects invalid payload roots", async () => {
    const response = await PUT(
      new NextRequest("http://localhost/api/app-state/analysis", {
        method: "PUT",
        body: JSON.stringify({
          data: ["not", "an", "object"],
        }),
        headers: {
          "Content-Type": "application/json",
        },
      }),
      buildContext("analysis")
    );

    expect(response.status).toBe(400);
    expect(proxyToBackend).not.toHaveBeenCalled();
  });
});
