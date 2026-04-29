import { promises as fsp } from "node:fs";
import path from "node:path";

import {
  CODE_MEMORY_CHUNK_MAX_CHARS,
  CODE_MEMORY_CHUNK_OVERLAP_CHARS,
  CODE_MEMORY_EXCLUDED_DIRECTORIES,
  CODE_MEMORY_EXCLUDED_FILES,
  CODE_MEMORY_PRIORITY_FILES,
  CODE_MEMORY_SOURCE_ROOTS,
} from "./config";
import { sha256Hex, shortHash } from "./hashing";
import type { CodeMemoryChunk, CodeMemoryDiff, CodeMemoryManifest, CodeMemorySourceRoot } from "./types";
import { fileExists, fromRepoRoot, toPosixPath } from "../utils";

function isExcludedPath(repoRelativePath: string): boolean {
  const parts = toPosixPath(repoRelativePath).split("/");
  if (CODE_MEMORY_EXCLUDED_DIRECTORIES.some((directory) => parts.includes(directory))) {
    return true;
  }
  return CODE_MEMORY_EXCLUDED_FILES.some((file) => repoRelativePath === file);
}

function summarize(content: string): string {
  return content.replace(/\s+/g, " ").trim().slice(0, 220);
}

export function chunkCodeText(content: string, repoPath: string): Array<{ content: string; chunkIndex: number; totalChunks: number }> {
  const chunks: Array<{ content: string; chunkIndex: number; totalChunks: number }> = [];

  if (content.length <= CODE_MEMORY_CHUNK_MAX_CHARS) {
    return [{ content, chunkIndex: 0, totalChunks: 1 }];
  }

  let offset = 0;
  let chunkIndex = 0;
  while (offset < content.length) {
    chunks.push({
      content: content.slice(offset, offset + CODE_MEMORY_CHUNK_MAX_CHARS),
      chunkIndex,
      totalChunks: -1,
    });
    offset += CODE_MEMORY_CHUNK_MAX_CHARS - CODE_MEMORY_CHUNK_OVERLAP_CHARS;
    chunkIndex += 1;
  }

  return chunks.map((chunk) => ({ ...chunk, totalChunks: chunks.length }));
}

async function collectFile(repoRelativePath: string, type: string, discoveredAt: string): Promise<CodeMemoryChunk[]> {
  const absolutePath = fromRepoRoot(repoRelativePath);
  const content = await fsp.readFile(absolutePath, "utf8");
  const normalizedPath = toPosixPath(repoRelativePath);
  const fileHash = sha256Hex(content);
  const chunks = chunkCodeText(content, normalizedPath);

  return chunks.map((chunk) => {
    const chunkHash = sha256Hex(chunk.content);
    return {
      id: sha256Hex(`${normalizedPath}:${chunk.chunkIndex}:${chunkHash}`),
      path: normalizedPath,
      type,
      chunkIndex: chunk.chunkIndex,
      totalChunks: chunk.totalChunks,
      content: chunk.content,
      summary: summarize(chunk.content),
      fileHash,
      chunkHash,
      size: content.length,
      extension: path.extname(normalizedPath),
      discoveredAt,
    };
  });
}

async function walkSourceRoot(root: CodeMemorySourceRoot, discoveredAt: string, filter: string | null): Promise<CodeMemoryChunk[]> {
  const chunks: CodeMemoryChunk[] = [];
  const rootPath = fromRepoRoot(root.base);

  async function walk(directory: string, depth: number): Promise<void> {
    if (depth > root.maxDepth) {
      return;
    }

    let entries: Array<Awaited<ReturnType<typeof fsp.readdir>>[number]>;
    try {
      entries = await fsp.readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      const repoRelativePath = toPosixPath(path.relative(process.cwd(), absolutePath));

      if (isExcludedPath(repoRelativePath)) {
        continue;
      }

      if (entry.isDirectory()) {
        await walk(absolutePath, depth + 1);
        continue;
      }

      if (!entry.isFile() || !root.extensions.includes(path.extname(entry.name))) {
        continue;
      }

      if (filter && !repoRelativePath.includes(filter)) {
        continue;
      }

      chunks.push(...await collectFile(repoRelativePath, root.type, discoveredAt));
    }
  }

  await walk(rootPath, 0);
  return chunks;
}

export async function discoverCodeMemoryChunks(options?: { filter?: string | null }): Promise<CodeMemoryChunk[]> {
  const discoveredAt = new Date().toISOString();
  const chunks: CodeMemoryChunk[] = [];
  const filter = options?.filter ?? null;

  for (const priorityFile of CODE_MEMORY_PRIORITY_FILES) {
    if (!fileExists(priorityFile)) {
      continue;
    }
    if (filter && !priorityFile.includes(filter)) {
      continue;
    }
    chunks.push(...await collectFile(priorityFile, "governance", discoveredAt));
  }

  for (const sourceRoot of CODE_MEMORY_SOURCE_ROOTS) {
    chunks.push(...await walkSourceRoot(sourceRoot, discoveredAt, filter));
  }

  return chunks.sort((left, right) => left.path.localeCompare(right.path) || left.chunkIndex - right.chunkIndex);
}

export function calculateCodeMemoryDiff(chunks: CodeMemoryChunk[], previousManifest: CodeMemoryManifest | null): CodeMemoryDiff {
  const currentFileHashes = new Map<string, string>();
  const currentChunkIds = new Set<string>();

  for (const chunk of chunks) {
    currentFileHashes.set(chunk.path, chunk.fileHash);
    currentChunkIds.add(chunk.id);
  }

  const previousFileHashes = previousManifest?.fileHashes ?? {};
  const previousChunkIds = new Set(previousManifest?.chunkIds ?? []);

  const newFiles: string[] = [];
  const modifiedFiles: string[] = [];
  const unchangedFiles: string[] = [];

  for (const [filePath, hash] of currentFileHashes.entries()) {
    if (!previousFileHashes[filePath]) {
      newFiles.push(filePath);
    } else if (previousFileHashes[filePath] !== hash) {
      modifiedFiles.push(filePath);
    } else {
      unchangedFiles.push(filePath);
    }
  }

  const deletedFiles = Object.keys(previousFileHashes).filter((filePath) => !currentFileHashes.has(filePath));
  const newChunks = [...currentChunkIds].filter((id) => !previousChunkIds.has(id));
  const deletedChunks = [...previousChunkIds].filter((id) => !currentChunkIds.has(id));
  const changedFilesSet = new Set([...newFiles, ...modifiedFiles]);
  const changedChunks = chunks.filter((chunk) => changedFilesSet.has(chunk.path)).map((chunk) => chunk.id);

  const sort = (values: string[]) => values.sort((left, right) => left.localeCompare(right));
  return {
    newFiles: sort(newFiles),
    modifiedFiles: sort(modifiedFiles),
    deletedFiles: sort(deletedFiles),
    unchangedFiles: sort(unchangedFiles),
    newChunks: sort(newChunks),
    changedChunks: sort(changedChunks),
    deletedChunks: sort(deletedChunks),
  };
}

export function createFileHashes(chunks: CodeMemoryChunk[]): Record<string, string> {
  const hashes: Record<string, string> = {};
  for (const chunk of chunks) {
    hashes[chunk.path] = chunk.fileHash;
  }
  return Object.fromEntries(Object.entries(hashes).sort(([left], [right]) => left.localeCompare(right)));
}

export function createSourceHash(chunks: CodeMemoryChunk[]): string {
  return shortHash(chunks.map((chunk) => `${chunk.path}:${chunk.chunkIndex}:${chunk.chunkHash}`).join("\n"));
}
