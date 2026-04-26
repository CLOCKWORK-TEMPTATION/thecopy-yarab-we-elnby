import { access, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  clearNextDirectory,
  removeNestedNextDirs,
} from "../../scripts/clean-source-build-artifacts.ts";

const temporaryDirectories: string[] = [];

const createDirectoryEntry = (
  name: string,
  isDirectory: boolean
): import("node:fs").Dirent =>
  ({
    name,
    isDirectory: () => isDirectory,
  }) as unknown as import("node:fs").Dirent;

const createBusyError = (code: "EBUSY" | "ENOTEMPTY"): Error =>
  Object.assign(new Error(code === "EBUSY" ? "busy" : "not empty"), { code });

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directoryPath) =>
        rm(directoryPath, { recursive: true, force: true })
      )
  );
});

describe("clearNextDirectory", () => {
  registerClearNextDirectoryRemovalTests();
  registerClearNextDirectoryBusyTests();
});

describe("removeNestedNextDirs", () => {
  registerRemoveNestedNextDirsTests();
});

function registerClearNextDirectoryRemovalTests(): void {
  it("removes the full directory when no cache mount blocks deletion", async () => {
    const rootDirectory = await mkdir(
      path.join(os.tmpdir(), `clean-build-${Date.now()}`),
      { recursive: true }
    );
    temporaryDirectories.push(rootDirectory);

    const nextDirectory = path.join(rootDirectory, ".next");
    await mkdir(path.join(nextDirectory, "static"), { recursive: true });
    await writeFile(path.join(nextDirectory, "static", "page.js"), "content");

    const removedPaths = await clearNextDirectory(nextDirectory);

    expect(removedPaths).toEqual([nextDirectory]);
    await expect(access(nextDirectory)).rejects.toThrow();
  });

  it("treats ENOTEMPTY like a transient Windows cleanup error", async () => {
    const nextDirectory = "C:\\app\\apps\\web\\.next";
    const removedTargets: string[] = [];
    const removePath = vi.fn((targetPath: string) => {
      if (targetPath === nextDirectory) {
        return Promise.reject(createBusyError("ENOTEMPTY"));
      }

      removedTargets.push(targetPath);
      return Promise.resolve();
    });

    const removedPaths = await clearNextDirectory(nextDirectory, {
      pathExists: () => true,
      readDirectory: () =>
        Promise.resolve([createDirectoryEntry("_events_33376.json", false)]),
      removePath,
    });

    expect(removedTargets).toEqual([
      path.join(nextDirectory, "_events_33376.json"),
    ]);
    expect(removedPaths).toEqual([
      path.join(nextDirectory, "_events_33376.json"),
    ]);
  });
}

function registerClearNextDirectoryBusyTests(): void {
  it("preserves cache when the directory cannot be removed because it is busy", async () => {
    const nextDirectory = "/app/apps/web/.next";
    const removedTargets: string[] = [];
    const removePath = vi.fn((targetPath: string) => {
      if (
        targetPath === nextDirectory ||
        targetPath === path.join(nextDirectory, "cache")
      ) {
        return Promise.reject(createBusyError("EBUSY"));
      }

      removedTargets.push(targetPath);
      return Promise.resolve();
    });

    const removedPaths = await clearNextDirectory(nextDirectory, {
      pathExists: () => true,
      readDirectory: () =>
        Promise.resolve([
          createDirectoryEntry("cache", true),
          createDirectoryEntry("server", true),
          createDirectoryEntry("trace", false),
        ]),
      removePath,
    });

    expect(removedTargets).toEqual([
      path.join(nextDirectory, "server"),
      path.join(nextDirectory, "trace"),
    ]);
    expect(removedPaths).toEqual([
      `${path.join(nextDirectory, "cache")} (preserved: busy)`,
      path.join(nextDirectory, "server"),
      path.join(nextDirectory, "trace"),
    ]);
  });

  it("skips busy entries gracefully in Docker overlay filesystem", async () => {
    const nextDirectory = "/app/apps/web/.next";
    const removedTargets: string[] = [];
    const removePath = vi.fn((targetPath: string) => {
      if (
        targetPath === nextDirectory ||
        targetPath === path.join(nextDirectory, "cache") ||
        targetPath === path.join(nextDirectory, "server")
      ) {
        return Promise.reject(createBusyError("EBUSY"));
      }

      removedTargets.push(targetPath);
      return Promise.resolve();
    });

    const removedPaths = await clearNextDirectory(nextDirectory, {
      pathExists: () => true,
      readDirectory: () =>
        Promise.resolve([
          createDirectoryEntry("cache", true),
          createDirectoryEntry("server", true),
          createDirectoryEntry("trace", false),
        ]),
      removePath,
    });

    expect(removedTargets).toEqual([path.join(nextDirectory, "trace")]);
    expect(removedPaths).toEqual([
      `${path.join(nextDirectory, "cache")} (preserved: busy)`,
      `${path.join(nextDirectory, "server")} (preserved: busy)`,
      path.join(nextDirectory, "trace"),
    ]);
  });

  it("treats a busy directory listing as non-fatal and preserves the root", async () => {
    const nextDirectory = "/app/apps/web/.next";

    const removedPaths = await clearNextDirectory(nextDirectory, {
      pathExists: () => true,
      readDirectory: () => Promise.reject(createBusyError("EBUSY")),
      removePath: () => Promise.reject(createBusyError("EBUSY")),
    });

    expect(removedPaths).toEqual([`${nextDirectory} (preserved: busy)`]);
  });
}

function registerRemoveNestedNextDirsTests(): void {
  it("cleans nested build artifacts below the source root", async () => {
    const rootDirectory = await mkdir(
      path.join(os.tmpdir(), `nested-build-${Date.now()}`),
      { recursive: true }
    );
    temporaryDirectories.push(rootDirectory);

    const nestedNextDirectory = path.join(
      rootDirectory,
      "feature",
      "component",
      ".next"
    );
    await mkdir(nestedNextDirectory, { recursive: true });
    await writeFile(path.join(nestedNextDirectory, "manifest.json"), "{}");

    const removedPaths = await removeNestedNextDirs(rootDirectory);

    expect(removedPaths).toEqual([nestedNextDirectory]);
    await expect(access(nestedNextDirectory)).rejects.toThrow();
  });

  it("skips directories that become unreadable while traversing", async () => {
    const rootDirectory = "/app/apps/web/src";

    const removedPaths = await removeNestedNextDirs(rootDirectory, {
      pathExists: () => true,
      readDirectory: (targetPath) => {
        if (targetPath === rootDirectory) {
          return Promise.resolve([createDirectoryEntry("feature", true)]);
        }

        return Promise.reject(createBusyError("EBUSY"));
      },
      removePath: () => Promise.resolve(),
    });

    expect(removedPaths).toEqual([]);
  });
}
