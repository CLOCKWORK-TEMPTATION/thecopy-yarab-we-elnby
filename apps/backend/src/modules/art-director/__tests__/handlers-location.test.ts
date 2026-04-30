import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  handleLocationAdd,
  handleLocationSearch,
} from "@/modules/art-director/handlers-location";
import { isRecord } from "@/modules/art-director/handlers-shared";
import { runPlugin } from "@/modules/art-director/plugin-executor";
import {
  readStore,
  resetStoreForTests,
  updateStore,
} from "@/modules/art-director/store";

import type { ArtDirectorHandlerResponse } from "@/modules/art-director/handlers-shared";
import type { StoredLocation } from "@/modules/art-director/store";
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
  "art-director-handlers-location.test.json",
);

function makeLocation(overrides: Partial<StoredLocation>): StoredLocation {
  return {
    id: "loc-1",
    name: "Nile Studio",
    nameAr: "استوديو النيل",
    type: "studio",
    address: "Cairo",
    features: ["Parking", "Rigging"],
    createdAt: "2026-04-29T00:00:00.000Z",
    updatedAt: "2026-04-29T00:00:00.000Z",
    ...overrides,
  };
}

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

function locationsFrom(
  response: ArtDirectorHandlerResponse,
): Record<string, unknown>[] {
  const data = recordField(response.body, "data");
  const locations = data["locations"];
  if (!Array.isArray(locations) || !locations.every(isRecord)) {
    throw new Error("Expected locations array.");
  }
  return locations;
}

function firstPluginInput(): Record<string, unknown> {
  const call = mockedRunPlugin.mock.calls[0];
  if (!call || !isRecord(call[1])) {
    throw new Error("Expected first plugin input.");
  }
  return call[1];
}

function pluginLocation(location: Record<string, unknown>): PluginOutput {
  return {
    success: true,
    data: { location },
  };
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

describe("art director location search handler", () => {
  it("filters stored locations by Arabic query, type, address, and features", async () => {
    await updateStore((store) => {
      store.locations = [
        makeLocation({ id: "loc-1" }),
        makeLocation({
          id: "loc-2",
          name: "Desert Camp",
          nameAr: "معسكر الصحراء",
          type: "outdoor",
          address: "Giza",
          features: ["Sand"],
        }),
      ];
    });

    const result = await handleLocationSearch({
      query: "النيل",
      type: "studio",
    });
    const locations = locationsFrom(result);

    expect(result.status).toBe(200);
    expect(recordField(result.body, "data")["count"]).toBe(1);
    expect(locations[0]).toMatchObject({
      id: "loc-1",
      nameAr: "استوديو النيل",
    });
  });

  it("returns every stored location when filters are missing", async () => {
    await updateStore((store) => {
      store.locations = [
        makeLocation({ id: "loc-1" }),
        makeLocation({ id: "loc-2", nameAr: "موقع آخر" }),
      ];
    });

    const result = await handleLocationSearch({});

    expect(result.status).toBe(200);
    expect(recordField(result.body, "data")["count"]).toBe(2);
    expect(locationsFrom(result)).toHaveLength(2);
  });
});

describe("art director location add handler", () => {
  it("rejects missing names before running the location plugin", async () => {
    const result = await handleLocationAdd({ type: "studio" });

    expect(result).toMatchObject({
      status: 400,
      body: { success: false, error: "اسم الموقع مطلوب" },
    });
    expect(mockedRunPlugin).not.toHaveBeenCalled();
  });

  it("runs the official location plugin and persists normalized locations", async () => {
    mockedRunPlugin.mockResolvedValueOnce(
      pluginLocation({
        id: "loc-3",
        name: "Nile Studio",
        nameAr: "استوديو النيل",
        type: "natural",
        address: "Cairo",
      }),
    );

    const result = await handleLocationAdd({
      name: "Nile Studio",
      nameAr: "استوديو النيل",
      type: "natural",
      address: "Cairo",
      features: "Parking, Rigging",
    });
    const stored = await readStore();
    const pluginInput = firstPluginInput();

    expect(result.status).toBe(200);
    expect(
      recordField(recordField(result.body, "data"), "location"),
    ).toMatchObject({
      id: "loc-3",
      type: "outdoor",
      features: ["Parking", "Rigging"],
    });
    expect(stored.locations).toHaveLength(1);
    expect(stored.locations[0]).toMatchObject({ id: "loc-3", type: "outdoor" });
    expect(pluginInput["type"]).toBe("add-location");
    expect(recordField(pluginInput, "data")).toMatchObject({
      name: "Nile Studio",
      nameAr: "استوديو النيل",
      type: "outdoor",
    });
  });

  it("maps plugin failures and malformed plugin data to strict errors", async () => {
    mockedRunPlugin
      .mockResolvedValueOnce({ success: false, error: "plugin offline" })
      .mockResolvedValueOnce({ success: true, data: { missing: true } });

    const pluginFailure = await handleLocationAdd({ name: "Nile Studio" });
    const malformedData = await handleLocationAdd({ name: "Nile Studio" });

    expect(pluginFailure).toMatchObject({
      status: 400,
      body: { success: false, error: "plugin offline" },
    });
    expect(malformedData).toMatchObject({
      status: 500,
      body: { success: false, error: "تعذر قراءة بيانات الموقع المُضاف" },
    });
    expect((await readStore()).locations).toHaveLength(0);
  });
});
