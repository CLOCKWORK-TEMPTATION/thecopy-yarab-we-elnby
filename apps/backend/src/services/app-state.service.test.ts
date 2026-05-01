import { access, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const dbMockState = vi.hoisted<{
  selectRows: unknown[];
  insertRows: unknown[];
  insertValues: unknown;
  conflictConfig: unknown;
}>(() => ({
  selectRows: [],
  insertRows: [],
  insertValues: undefined,
  conflictConfig: undefined,
}));

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve(dbMockState.selectRows)),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn((values: unknown) => {
        dbMockState.insertValues = values;
        return {
          onConflictDoUpdate: vi.fn((config: unknown) => {
            dbMockState.conflictConfig = config;
            return {
              returning: vi.fn(() => Promise.resolve(dbMockState.insertRows)),
            };
          }),
        };
      }),
    })),
  },
}));

import {
  clearAppState,
  readAppState,
  saveAppState,
} from "./app-state.service";

const storeRoot = path.join(tmpdir(), "the-copy-tests", "app-state-db");

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

describe("app state database persistence", () => {
  beforeEach(async () => {
    process.env["APP_STATE_STORE_DIR"] = storeRoot;
    dbMockState.selectRows = [];
    dbMockState.insertRows = [];
    dbMockState.insertValues = undefined;
    dbMockState.conflictConfig = undefined;
    await rm(storeRoot, { recursive: true, force: true });
  });

  afterEach(async () => {
    delete process.env["APP_STATE_STORE_DIR"];
    await rm(storeRoot, { recursive: true, force: true });
  });

  it("saves cinematography studio state in the unified database store", async () => {
    const updatedAt = new Date("2026-05-01T10:00:00.000Z");
    dbMockState.insertRows = [
      {
        appId: "cinematography-studio",
        payload: { phase: "post" },
        updatedAt,
      },
    ];

    const result = await saveAppState("cinematography-studio", {
      phase: "post",
    });

    expect(dbMockState.insertValues).toMatchObject({
      appId: "cinematography-studio",
      scope: "global",
      recordKey: "state",
      payload: { phase: "post" },
    });
    expect(dbMockState.conflictConfig).toBeTruthy();
    expect(result).toEqual({
      version: 1,
      app: "cinematography-studio",
      updatedAt: updatedAt.toISOString(),
      data: { phase: "post" },
    });
    await expect(
      exists(path.join(storeRoot, "cinematography-studio.json")),
    ).resolves.toBe(false);
  });

  it("reads development state from the unified database store", async () => {
    const updatedAt = new Date("2026-05-01T11:00:00.000Z");
    dbMockState.selectRows = [
      {
        appId: "development",
        payload: { textInput: "draft" },
        updatedAt,
      },
    ];

    await expect(readAppState("development")).resolves.toEqual({
      version: 1,
      app: "development",
      updatedAt: updatedAt.toISOString(),
      data: { textInput: "draft" },
    });
  });

  it("returns an empty database envelope for apps without saved rows", async () => {
    await expect(readAppState("BUDGET")).resolves.toMatchObject({
      version: 1,
      app: "BUDGET",
      data: {},
    });
    await expect(exists(path.join(storeRoot, "BUDGET.json"))).resolves.toBe(
      false,
    );
  });

  it("clears app state through the same unified database record", async () => {
    const updatedAt = new Date("2026-05-01T12:00:00.000Z");
    dbMockState.insertRows = [
      {
        appId: "analysis",
        payload: {},
        updatedAt,
      },
    ];

    const result = await clearAppState("analysis");

    expect(dbMockState.insertValues).toMatchObject({
      appId: "analysis",
      scope: "global",
      recordKey: "state",
      payload: {},
    });
    expect(result).toEqual({
      version: 1,
      app: "analysis",
      updatedAt: updatedAt.toISOString(),
      data: {},
    });
  });
});
