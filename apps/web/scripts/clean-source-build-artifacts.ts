import { Dirent, existsSync } from "node:fs";
import { readdir, rm } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

type RemovePath = (targetPath: string) => Promise<void>;
type ReadDirectory = (targetPath: string) => Promise<Dirent[]>;
type PathExists = (targetPath: string) => boolean;

interface CleanerDependencies {
  pathExists: PathExists;
  readDirectory: ReadDirectory;
  removePath: RemovePath;
}

const defaultDependencies: CleanerDependencies = {
  pathExists: existsSync,
  readDirectory: async (targetPath) =>
    readdir(targetPath, { withFileTypes: true }),
  removePath: async (targetPath) => {
    await rm(targetPath, { recursive: true, force: true });
  },
};

function isBusyDirectoryError(error: unknown): error is NodeJS.ErrnoException {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error.code === "EBUSY" ||
      error.code === "EPERM" ||
      error.code === "ENOTEMPTY")
  );
}

function isMissingDirectoryError(
  error: unknown
): error is NodeJS.ErrnoException {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

export async function clearNextDirectory(
  nextDirectory: string,
  dependencies: CleanerDependencies = defaultDependencies
): Promise<string[]> {
  const { pathExists, readDirectory, removePath } = dependencies;

  if (!pathExists(nextDirectory)) {
    return [];
  }

  try {
    await removePath(nextDirectory);
    return [nextDirectory];
  } catch (error) {
    if (!isBusyDirectoryError(error)) {
      throw error;
    }

    if (!pathExists(nextDirectory)) {
      return [nextDirectory];
    }

    let directoryEntries: Dirent[];
    try {
      directoryEntries = await readDirectory(nextDirectory);
    } catch (readError) {
      if (
        isBusyDirectoryError(readError) ||
        isMissingDirectoryError(readError)
      ) {
        return [`${nextDirectory} (preserved: busy)`];
      }

      throw readError;
    }

    const removedPaths: string[] = [];
    for (const entry of directoryEntries) {
      const entryPath = path.join(nextDirectory, entry.name);
      try {
        await removePath(entryPath);
        removedPaths.push(entryPath);
      } catch (entryError) {
        if (isBusyDirectoryError(entryError)) {
          removedPaths.push(`${entryPath} (preserved: busy)`);
        } else if (isMissingDirectoryError(entryError)) {
          continue;
        } else {
          throw entryError;
        }
      }
    }

    if (removedPaths.length === 0) {
      removedPaths.push(`${nextDirectory} (preserved: busy)`);
    }

    return removedPaths.sort((left, right) => left.localeCompare(right));
  }
}

export async function removeNestedNextDirs(
  rootDirectory: string,
  dependencies: CleanerDependencies = defaultDependencies
): Promise<string[]> {
  const removedPaths: string[] = [];
  const pendingDirectories = [rootDirectory];
  const { readDirectory } = dependencies;

  while (pendingDirectories.length > 0) {
    const currentDirectory = pendingDirectories.pop();
    if (!currentDirectory) {
      continue;
    }

    let entries: Dirent[];
    try {
      entries = await readDirectory(currentDirectory);
    } catch (error) {
      if (isBusyDirectoryError(error) || isMissingDirectoryError(error)) {
        continue;
      }

      throw error;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const entryPath = path.join(currentDirectory, entry.name);
      if (entry.name === ".next") {
        const cleanedPaths = await clearNextDirectory(entryPath, dependencies);
        removedPaths.push(...cleanedPaths);
        continue;
      }

      pendingDirectories.push(entryPath);
    }
  }

  return removedPaths.sort((left, right) => left.localeCompare(right));
}

export async function main(
  currentWorkingDirectory: string = process.cwd(),
  dependencies: CleanerDependencies = defaultDependencies
): Promise<void> {
  const removedPaths: string[] = [];

  const appBuildDirectory = path.resolve(currentWorkingDirectory, ".next");
  if (dependencies.pathExists(appBuildDirectory)) {
    const cleanedBuildDirectory = await clearNextDirectory(
      appBuildDirectory,
      dependencies
    );
    removedPaths.push(...cleanedBuildDirectory);
  }

  const resolvedSourceRoot = path.resolve(currentWorkingDirectory, "src");
  if (dependencies.pathExists(resolvedSourceRoot)) {
    const nestedBuildArtifacts = await removeNestedNextDirs(
      resolvedSourceRoot,
      dependencies
    );
    removedPaths.push(...nestedBuildArtifacts);
  }

  if (removedPaths.length === 0) {
    console.log("No .next build artifacts found.");
    return;
  }

  console.log("Removed build artifacts:");
  for (const removedPath of removedPaths) {
    console.log(`- ${removedPath}`);
  }
}

const isDirectExecution =
  typeof process.argv[1] === "string" &&
  pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirectExecution) {
  main().catch((error) => {
    if (isBusyDirectoryError(error) || isMissingDirectoryError(error)) {
      console.warn(
        "[warn] Failed to clean nested build artifacts (non-fatal):",
        error.message || error
      );
      process.exitCode = 0;
      return;
    }

    console.error("[error] Failed to clean build artifacts:", error);
    process.exitCode = 1;
  });
}
