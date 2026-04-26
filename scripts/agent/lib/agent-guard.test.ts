import { describe, expect, test } from "vitest";

import {
  shouldIndexCodeMemory,
  validateLifecycleHooks,
  validatePackageManagerInvocation,
  type ToolGuardContract,
} from "./agent-guard";
import type { CodeMemoryHealth } from "./code-memory/types";

const baseContract: ToolGuardContract = {
  schemaVersion: 1,
  requiredPackageManager: "pnpm",
  autoIndexCodeMemory: true,
  autoIndexArgs: ["--from-legacy"],
  optionalQdrantSync: true,
  requiredLifecycleHooks: {
    predev: "pnpm agent:guard:step",
    "preagent:verify": "pnpm agent:guard:verify",
  },
  requiredGuardEntrypoints: [],
  requiredGuardCommands: [],
};

const currentHealth: CodeMemoryHealth = {
  exists: true,
  stale: false,
  generatedAt: "2026-04-26T00:00:00.000Z",
  totalFiles: 1,
  totalChunks: 1,
  embeddedChunks: 1,
  coverageRate: 1,
  missingChunks: 0,
  deletedChunks: 0,
  changedFiles: 0,
  storage: {
    local: "lancedb",
    qdrant: "not-configured",
  },
  qdrantCollection: null,
  message: "current",
};

describe("agent guard", () => {
  test("rejects non pnpm lifecycle invocations", () => {
    expect(
      validatePackageManagerInvocation(baseContract, {
        npm_config_user_agent: "npm/10.0.0",
      }),
    ).toEqual(["Package manager guard rejected invocation outside pnpm."]);
    expect(
      validatePackageManagerInvocation(baseContract, {
        npm_config_user_agent: "pnpm/10.32.1",
      }),
    ).toEqual([]);
  });

  test("detects missing lifecycle hooks", () => {
    const issues = validateLifecycleHooks(
      { predev: "pnpm agent:guard:step" },
      baseContract,
    );
    expect(issues).toEqual([
      "Lifecycle hook is missing or changed: preagent:verify",
    ]);
  });

  test("requires indexing when memory is missing, stale, or incomplete", () => {
    expect(shouldIndexCodeMemory(currentHealth)).toBe(false);
    expect(shouldIndexCodeMemory({ ...currentHealth, exists: false })).toBe(
      true,
    );
    expect(shouldIndexCodeMemory({ ...currentHealth, stale: true })).toBe(true);
    expect(shouldIndexCodeMemory({ ...currentHealth, coverageRate: 0.5 })).toBe(
      true,
    );
  });
});
