import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { handleArtDirectorRequest } from "@/modules/art-director/handlers";
import { isRecord } from "@/modules/art-director/handlers-shared";
import { runPlugin } from "@/modules/art-director/plugin-executor";
import { resetStoreForTests, updateStore } from "@/modules/art-director/store";

import type { ArtDirectorHandlerResponse } from "@/modules/art-director/handlers";
import type { PluginOutput } from "@/modules/art-director/types";

type RunPluginMock = ReturnType<
  typeof vi.fn<(plugin: unknown, input: unknown) => Promise<PluginOutput>>
>;

vi.mock("@/modules/art-director/plugin-executor", () => ({
  runPlugin: vi.fn(),
}));

const mockedRunPlugin = runPlugin as RunPluginMock;
const storePath = path.join(
  tmpdir(),
  "the-copy-tests",
  "art-director-handlers-router.test.json",
);

function recordField(
  source: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  const value = source[key];
  if (!isRecord(value)) {
    throw new Error(`Expected ${key} to be a record.`);
  }
  return value;
}

function arrayField(
  source: Record<string, unknown>,
  key: string,
): Record<string, unknown>[] {
  const value = source[key];
  if (!Array.isArray(value) || !value.every(isRecord)) {
    throw new Error(`Expected ${key} to be a record array.`);
  }
  return value;
}

function dataFrom(
  response: ArtDirectorHandlerResponse,
): Record<string, unknown> {
  return recordField(response.body, "data");
}

function firstPluginInput(): Record<string, unknown> {
  const call = mockedRunPlugin.mock.calls[0];
  if (!call || !isRecord(call[1])) {
    throw new Error("Expected first plugin input.");
  }
  return call[1];
}

function pluginData(data: Record<string, unknown>): PluginOutput {
  return { success: true, data };
}

beforeEach(async () => {
  process.env["ART_DIRECTOR_STORE_PATH"] = storePath;
  await rm(storePath, { force: true });
  mockedRunPlugin.mockReset();
  await resetStoreForTests();
});

afterEach(async () => {
  delete process.env["ART_DIRECTOR_STORE_PATH"];
  vi.clearAllMocks();
  await rm(storePath, { force: true });
});

describe("art director GET router", () => {
  it("serves health, plugin catalog, dashboard summary, and unknown paths", async () => {
    await updateStore((store) => {
      store.locations = [
        {
          id: "loc-1",
          name: "Nile Studio",
          nameAr: "استوديو النيل",
          type: "studio",
          address: "Cairo",
          features: [],
          createdAt: "2026-04-29T00:00:00.000Z",
          updatedAt: "2026-04-29T00:00:00.000Z",
        },
      ];
    });

    const health = await handleArtDirectorRequest({
      method: "GET",
      path: ["health"],
    });
    const plugins = await handleArtDirectorRequest({
      method: "GET",
      path: ["plugins"],
    });
    const dashboard = await handleArtDirectorRequest({
      method: "GET",
      path: ["dashboard", "summary"],
    });
    const unknown = await handleArtDirectorRequest({
      method: "GET",
      path: ["missing"],
    });

    expect(health.status).toBe(200);
    expect(health.body["status"]).toBe("ok");
    expect(recordField(health.body, "summary")["locationsCount"]).toBe(1);
    expect(plugins.body["count"]).toBeGreaterThan(0);
    expect(recordField(dashboard.body, "summary")["locationsCount"]).toBe(1);
    expect(unknown).toMatchObject({
      status: 404,
      body: { success: false, error: "المسار غير مدعوم: missing" },
    });
  });
});

describe("art director POST router for locations", () => {
  it("merges search params with body and lets body values drive search", async () => {
    await updateStore((store) => {
      store.locations = [
        {
          id: "loc-1",
          name: "Nile Studio",
          nameAr: "استوديو النيل",
          type: "studio",
          address: "Cairo",
          features: ["Rigging"],
          createdAt: "2026-04-29T00:00:00.000Z",
          updatedAt: "2026-04-29T00:00:00.000Z",
        },
      ];
    });

    const result = await handleArtDirectorRequest({
      method: "POST",
      path: ["locations", "search"],
      searchParams: new URLSearchParams({ query: "missing" }),
      body: { query: "النيل", type: "studio" },
    });
    const locations = arrayField(dataFrom(result), "locations");

    expect(result.status).toBe(200);
    expect(dataFrom(result)["count"]).toBe(1);
    expect(locations[0]).toMatchObject({ id: "loc-1" });
  });

  it("routes location creation through the plugin-backed handler", async () => {
    mockedRunPlugin.mockResolvedValueOnce(
      pluginData({
        location: {
          id: "loc-2",
          name: "Backlot",
          nameAr: "ساحة تصوير",
          type: "studio",
          address: "Giza",
        },
      }),
    );

    const result = await handleArtDirectorRequest({
      method: "POST",
      path: ["locations", "add"],
      body: { nameAr: "ساحة تصوير", features: ["Outdoor"] },
    });

    expect(result.status).toBe(200);
    expect(recordField(dataFrom(result), "location")).toMatchObject({
      id: "loc-2",
      nameAr: "ساحة تصوير",
    });
    expect(mockedRunPlugin).toHaveBeenCalledTimes(1);
  });
});

describe("art director POST router for plugin-backed analysis", () => {
  it("routes visual analysis and returns plugin data without flattening it", async () => {
    mockedRunPlugin.mockResolvedValueOnce(
      pluginData({ score: 88, recommendations: ["match lighting"] }),
    );

    const result = await handleArtDirectorRequest({
      method: "POST",
      path: ["analyze", "visual-consistency"],
      body: {
        sceneId: "scene-1",
        referenceColors: "#111,#222,#333",
        lightingCondition: "night",
      },
    });
    const pluginInput = firstPluginInput();

    expect(result.status).toBe(200);
    expect(dataFrom(result)).toEqual({
      score: 88,
      recommendations: ["match lighting"],
    });
    expect(pluginInput["type"]).toBe("analyze");
    expect(recordField(pluginInput, "data")["referenceScene"]).toBe(
      "scene-1-reference",
    );
  });

  it("covers missing body validation, dependency failure, and unknown routes", async () => {
    mockedRunPlugin.mockResolvedValueOnce({
      success: false,
      error: "budget service unavailable",
    });

    const missingBody = await handleArtDirectorRequest({
      method: "POST",
      path: ["inspiration", "analyze"],
    });
    const pluginFailure = await handleArtDirectorRequest({
      method: "POST",
      path: ["optimize", "budget"],
      body: { totalBudget: 10_000, categories: ["ديكور"] },
    });
    const unknown = await handleArtDirectorRequest({
      method: "POST",
      path: ["unknown"],
    });

    expect(missingBody).toMatchObject({
      status: 400,
      body: { success: false, error: "وصف المشهد مطلوب" },
    });
    expect(pluginFailure).toMatchObject({
      status: 400,
      body: { success: false, error: "budget service unavailable" },
    });
    expect(unknown).toMatchObject({
      status: 404,
      body: { success: false, error: "المسار غير مدعوم: unknown" },
    });
  });
});
