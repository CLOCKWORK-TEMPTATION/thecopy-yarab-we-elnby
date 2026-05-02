import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface PersistentMemoryDatabaseUrlOptions {
  defaultHost: string;
}

function readEnv(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = env[key];
    if (value) {
      return value;
    }
  }
  return undefined;
}

function readLocalInfraPostgresPassword(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
): string | undefined {
  const localAppData = env["LOCALAPPDATA"];
  if (!localAppData) {
    return undefined;
  }

  const infraEnvFile = join(localAppData, "TheCopy", "podman-infra.env");
  if (!existsSync(infraEnvFile)) {
    return undefined;
  }

  const line = readFileSync(infraEnvFile, "utf8")
    .split(/\r?\n/u)
    .map((candidate) => candidate.replace(/^\uFEFF/u, ""))
    .find((candidate) => candidate.startsWith("POSTGRES_PASSWORD="));

  return line?.slice("POSTGRES_PASSWORD=".length) || undefined;
}

export function buildLocalPersistentMemoryDatabaseUrl(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
  options: PersistentMemoryDatabaseUrlOptions,
): string {
  const host =
    readEnv(env, ["PERSISTENT_MEMORY_PGHOST", "PGHOST", "POSTGRES_HOST"]) ??
    options.defaultHost;
  const port =
    readEnv(env, ["PERSISTENT_MEMORY_PGPORT", "PGPORT", "POSTGRES_PORT"]) ??
    "5433";
  const user =
    readEnv(env, ["PERSISTENT_MEMORY_PGUSER", "PGUSER", "POSTGRES_USER"]) ??
    "thecopy";
  const database =
    readEnv(env, [
      "PERSISTENT_MEMORY_PGDATABASE",
      "PGDATABASE",
      "POSTGRES_DB",
    ]) ?? "thecopy_dev";
  const password = readEnv(env, [
    "PERSISTENT_MEMORY_PGPASSWORD",
    "PGPASSWORD",
    "POSTGRES_PASSWORD",
  ]) ?? readLocalInfraPostgresPassword(env);
  const encodedUser = encodeURIComponent(user);
  const auth = password
    ? `${encodedUser}:${encodeURIComponent(password)}`
    : encodedUser;

  return `postgresql://${auth}@${host}:${port}/${database}`;
}

function hasPassword(databaseUrl: string): boolean {
  try {
    return Boolean(new URL(databaseUrl).password);
  } catch {
    return false;
  }
}

export function resolvePersistentMemoryDatabaseUrl(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
  options: PersistentMemoryDatabaseUrlOptions,
): string {
  if (env["PERSISTENT_MEMORY_DATABASE_URL"]) {
    return env["PERSISTENT_MEMORY_DATABASE_URL"];
  }

  const localDatabaseUrl = buildLocalPersistentMemoryDatabaseUrl(env, options);
  if (hasPassword(localDatabaseUrl)) {
    return localDatabaseUrl;
  }

  return env["DATABASE_URL"] || localDatabaseUrl;
}
