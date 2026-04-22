import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { promises as fsp } from "node:fs";
import path from "node:path";

const VOLATILE_GENERATED_LINE_PATTERNS = [
  /^\|\s*آخر مزامنة مرجعية\s*\|.*\|\s*$/,
  /^\|\s*Last synchronized\s*\|.*\|\s*$/,
  /^>\s*Generated at:.*$/,
  /^\s*"generatedAt":\s*".*",?\s*$/,
  /^\s*"lastGeneratedAt":\s*".*",?\s*$/,
  /^\s*"last_generated_time":\s*".*",?\s*$/,
];

export function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

export function fromRepoRoot(...segments: string[]): string {
  return path.join(process.cwd(), ...segments);
}

export function toRepoRelative(filePath: string): string {
  return toPosixPath(path.relative(process.cwd(), filePath));
}

export function normalizeText(content: string): string {
  return `${content.replace(/\r\n/g, "\n").trimEnd()}\n`;
}

export function normalizeGeneratedComparableText(content: string): string {
  const normalized = normalizeText(content);
  const comparableLines = normalized
    .split("\n")
    .filter((line) => !VOLATILE_GENERATED_LINE_PATTERNS.some((pattern) => pattern.test(line)));

  return `${comparableLines.join("\n").trimEnd()}\n`;
}

export async function readTextIfExists(filePath: string): Promise<string> {
  try {
    return await fsp.readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

export async function readJsonIfExists<T>(filePath: string): Promise<T | null> {
  const text = await readTextIfExists(filePath);
  if (!text.trim()) {
    return null;
  }

  return JSON.parse(text) as T;
}

export async function ensureParentDirectory(filePath: string): Promise<void> {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
}

export async function writeTextIfChanged(filePath: string, content: string): Promise<boolean> {
  const normalized = normalizeText(content);
  const current = await readTextIfExists(filePath);

  if (normalizeText(current || "") === normalized) {
    return false;
  }

  if (normalizeGeneratedComparableText(current || "") === normalizeGeneratedComparableText(normalized)) {
    return false;
  }

  await ensureParentDirectory(filePath);
  await fsp.writeFile(filePath, normalized, "utf8");
  return true;
}

export function sha256(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

export async function sha256FileIfExists(
  filePath: string,
  options?: { ignoreVolatileGeneratedLines?: boolean },
): Promise<string | null> {
  const content = await readTextIfExists(filePath);
  if (!content && !fs.existsSync(filePath)) {
    return null;
  }

  const normalized = options?.ignoreVolatileGeneratedLines
    ? normalizeGeneratedComparableText(content)
    : normalizeText(content);

  return sha256(normalized);
}

export function stableSortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => stableSortValue(entry));
  }

  if (value && typeof value === "object") {
    const sortedEntries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entryValue]) => [key, stableSortValue(entryValue)]);
    return Object.fromEntries(sortedEntries);
  }

  return value;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(stableSortValue(value), null, 2);
}

export function runGitCommand(args: string[]): string {
  try {
    return execFileSync("git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

export function fileExists(repoRelativePath: string): boolean {
  return fs.existsSync(fromRepoRoot(repoRelativePath));
}

export async function listPackageManifests(basePath: string): Promise<string[]> {
  const directory = fromRepoRoot(basePath);
  try {
    const entries = await fsp.readdir(directory, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => toPosixPath(path.join(basePath, entry.name, "package.json")))
      .filter((manifestPath) => fs.existsSync(fromRepoRoot(manifestPath)))
      .sort();
  } catch {
    return [];
  }
}

export function formatTimestamp(input: Date): string {
  return input.toISOString();
}