import type { Config } from "drizzle-kit";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parse as parseEnv } from "dotenv";

function collectEnvCandidates(startPath: string, limit = 5): string[] {
  const candidates: string[] = [];
  let current = resolve(startPath);

  for (let index = 0; index < limit; index += 1) {
    candidates.push(resolve(current, ".env"));
    const parent = dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  return candidates;
}

function stripWrappingQuotes(value: string): string {
  return value.replace(/^['"]|['"]$/g, "");
}

function isPlaceholderEnvValue(key: string, value?: string | null): boolean {
  const trimmed = stripWrappingQuotes(value?.trim() ?? "");
  if (!trimmed) {
    return true;
  }

  if (trimmed.includes("CHANGE_THIS")) {
    return true;
  }

  if (
    key === "DATABASE_URL" &&
    /:\/\/USER:PASSWORD@HOST(?::\d+)?\/DB_NAME/i.test(trimmed)
  ) {
    return true;
  }

  return false;
}

function applyEnvFile(filePath: string): void {
  const parsed = parseEnv(readFileSync(filePath));

  for (const [key, rawValue] of Object.entries(parsed)) {
    const value = rawValue.trim();
    const existingValue = process.env[key];

    if (isPlaceholderEnvValue(key, value)) {
      continue;
    }

    if (
      existingValue === undefined ||
      isPlaceholderEnvValue(key, existingValue)
    ) {
      process.env[key] = value;
    }
  }
}

const envCandidates = [
  ...collectEnvCandidates(process.cwd()),
  ...collectEnvCandidates(__dirname),
];
const seen = new Set<string>();

for (const candidate of envCandidates) {
  const normalized = resolve(candidate);
  if (seen.has(normalized) || !existsSync(normalized)) {
    continue;
  }

  seen.add(normalized);
  applyEnvFile(normalized);
}

if (!process.env["DATABASE_URL"]) {
  throw new Error("DATABASE_URL is not set");
}

export const drizzleSchemaPaths = [
  resolve(__dirname, "src", "db", "schema.ts").replace(/\\/g, "/"),
];

export default {
  schema: drizzleSchemaPaths,
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env["DATABASE_URL"],
  },
} satisfies Config;
