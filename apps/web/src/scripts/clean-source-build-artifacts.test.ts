import { access, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  clearNextDirectory,
  removeNestedNextDirs,
} from "../../scripts/clean-source-build-artifacts.ts";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map(async (directoryPath) =>
        rm(directoryPath, { recursive: true, force: true })
      )
  );
});

describe("clearNextDirectory", () => {
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

  it("preserves cache when the directory cannot be removed because it is busy", async () => {
    const nextDirectory = "/app/apps/web/.next";
    const removedTargets: string[] = [];
    const removePath = vi.fn(async (targetPath: string) => {
      if (
        targetPath === nextDirectory ||
        targetPath === path.join(nextDirectory, "cache")
      ) {
        const error = new Error("busy");
        Object.assign(error, { code: "EBUSY" });
        throw error;
      }

      removedTargets.push(targetPath);
    });

    const removedPaths = await clearNextDirectory(nextDirectory, {
      pathExists: () => true,
      readDirectory: async () =>
        [
          {
            name: "cache",
            isDirectory: () => true,
          },
          {
            name: "server",
            isDirectory: () => true,
          },
          {
            name: "trace",
            isDirectory: () => false,
          },
        ] as unknown as import("node:fs").Dirent[],
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
    const removePath = vi.fn(async (targetPath: string) => {
      if (
        targetPath === nextDirectory ||
        targetPath === path.join(nextDirectory, "cache") ||
        targetPath === path.join(nextDirectory, "server")
      ) {
        const error = new Error("busy");
        Object.assign(error, { code: "EBUSY" });
        throw error;
      }

      removedTargets.push(targetPath);
    });

    const removedPaths = await clearNextDirectory(nextDirectory, {
      pathExists: () => true,
      readDirectory: async () =>
        [
          {
            name: "cache",
            isDirectory: () => true,
          },
          {
            name: "server",
            isDirectory: () => true,
          },
          {
            name: "trace",
            isDirectory: () => false,
          },
        ] as unknown as import("node:fs").Dirent[],
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
      readDirectory: async () => {
        const error = new Error("busy");
        Object.assign(error, { code: "EBUSY" });
        throw error;
      },
      removePath: async () => {
        const error = new Error("busy");
        Object.assign(error, { code: "EBUSY" });
        throw error;
      },
    });

    expect(removedPaths).toEqual([`${nextDirectory} (preserved: busy)`]);
  });

  it("treats ENOTEMPTY like a transient Windows cleanup error", async () => {
    const nextDirectory = "C:\\app\\apps\\web\\.next";
    const removedTargets: string[] = [];
    const removePath = vi.fn(async (targetPath: string) => {
      if (targetPath === nextDirectory) {
        const error = new Error("not empty");
        Object.assign(error, { code: "ENOTEMPTY" });
        throw error;
      }

      removedTargets.push(targetPath);
    });

    const removedPaths = await clearNextDirectory(nextDirectory, {
      pathExists: () => true,
      readDirectory: async () =>
        [
          {
            name: "_events_33376.json",
            isDirectory: () => false,
          },
        ] as unknown as import("node:fs").Dirent[],
      removePath,
    });

    expect(removedTargets).toEqual([
      path.join(nextDirectory, "_events_33376.json"),
    ]);
    expect(removedPaths).toEqual([
      path.join(nextDirectory, "_events_33376.json"),
    ]);
  });
});

describe("removeNestedNextDirs", () => {
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
      readDirectory: async (targetPath) => {
        if (targetPath === rootDirectory) {
          return [
            {
              name: "feature",
              isDirectory: () => true,
            },
          ] as unknown as import("node:fs").Dirent[];
        }

        const error = new Error("busy");
        Object.assign(error, { code: "EBUSY" });
        throw error;
      },
      removePath: async () => undefined,
    });

    expect(removedPaths).toEqual([]);
  });
});
