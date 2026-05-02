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
  ]);
  const encodedUser = encodeURIComponent(user);
  const auth = password
    ? `${encodedUser}:${encodeURIComponent(password)}`
    : encodedUser;

  return `postgresql://${auth}@${host}:${port}/${database}`;
}
