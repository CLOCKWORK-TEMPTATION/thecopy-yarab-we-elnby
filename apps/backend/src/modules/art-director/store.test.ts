import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const persistenceMockState = vi.hoisted<{
  readResult: unknown;
  readCalls: unknown[][];
  saveCalls: unknown[][];
}>(() => ({
  readResult: null,
  readCalls: [],
  saveCalls: [],
}));

vi.mock("@/services/app-persistence.service", () => ({
  readAppPersistenceRecord: (...args: unknown[]) => {
    persistenceMockState.readCalls.push(args);
    return Promise.resolve(persistenceMockState.readResult);
  },
  saveAppPersistenceRecord: (...args: unknown[]) => {
    persistenceMockState.saveCalls.push(args);
    return Promise.resolve({
      version: 1,
      app: args[0],
      updatedAt: "2026-05-01T10:00:00.000Z",
      data: args[1],
    });
  },
}));

import { createEmptyStore, readStore, saveStore } from "./store";

const storePath = path.join(
  tmpdir(),
  "the-copy-tests",
  "art-director-db-store.test.json",
);

describe("art director database store", () => {
  beforeEach(async () => {
    process.env["ART_DIRECTOR_STORE_PATH"] = storePath;
    persistenceMockState.readResult = null;
    persistenceMockState.readCalls = [];
    persistenceMockState.saveCalls = [];
    await rm(storePath, { force: true });
  });

  afterEach(async () => {
    delete process.env["ART_DIRECTOR_STORE_PATH"];
    await rm(storePath, { force: true });
  });

  it("reads the art director store from the unified database record", async () => {
    const stored = createEmptyStore();
    stored.locations = [
      {
        id: "loc-1",
        name: "Nile Studio",
        nameAr: "استوديو النيل",
        type: "studio",
        address: "Cairo",
        features: ["Parking"],
        createdAt: "2026-05-01T00:00:00.000Z",
        updatedAt: "2026-05-01T00:00:00.000Z",
      },
    ];
    persistenceMockState.readResult = {
      version: 1,
      app: "art-director",
      updatedAt: "2026-05-01T10:00:00.000Z",
      data: stored,
    };

    await expect(readStore()).resolves.toMatchObject({
      locations: [{ id: "loc-1", nameAr: "استوديو النيل" }],
    });
    expect(persistenceMockState.readCalls[0]).toEqual([
      "art-director",
      { recordKey: "store" },
    ]);
  });

  it("saves the art director store into the unified database record", async () => {
    const store = createEmptyStore();
    store.decisions = [
      {
        id: "decision-1",
        productionId: "production-1",
        decision: "Use practical set",
        decisionAr: "استخدام ديكور عملي",
        rationale: "Safer schedule",
        rationaleAr: "جدول أكثر أمانًا",
        madeBy: "director",
        madeAt: "2026-05-01T00:00:00.000Z",
        category: "set",
        status: "approved",
        relatedDecisions: [],
      },
    ];

    await saveStore(store);

    expect(persistenceMockState.saveCalls).toHaveLength(1);
    expect(persistenceMockState.saveCalls[0]?.[0]).toBe("art-director");
    expect(persistenceMockState.saveCalls[0]?.[1]).toMatchObject({
      decisions: [{ id: "decision-1" }],
    });
    expect(persistenceMockState.saveCalls[0]?.[2]).toEqual({
      recordKey: "store",
    });
  });
});
