import { createRequire } from "node:module";

import { probeHttpReady, probeTcpPort } from "../repo-state-probers";
import { fromRepoRoot } from "../utils";
import { createPersistentMemorySqlClient } from "./postgres-store";

export type PersistentMemoryInfraComponentId =
  | "postgres"
  | "redis"
  | "bullmq"
  | "weaviate"
  | "qdrant";

export interface PersistentMemoryInfraComponent {
  id: PersistentMemoryInfraComponentId;
  kind: "database" | "cache" | "queue" | "vector-index";
  defaultEndpoint: string;
  dependsOn?: PersistentMemoryInfraComponentId;
}

export interface PersistentMemoryInfraConfig {
  databaseUrl: string;
  redisUrl: string;
  weaviateUrl: string;
  qdrantUrl: string;
}

export interface PersistentMemoryInfraComponentStatus {
  id: PersistentMemoryInfraComponentId;
  kind: PersistentMemoryInfraComponent["kind"];
  endpoint: string;
  ready: boolean;
}

export interface PersistentMemoryInfraStatus {
  status: "ready" | "degraded";
  components: PersistentMemoryInfraComponentStatus[];
}

export interface PersistentMemoryInfraHealth {
  postgres: "ready" | "missing";
  redis: "ready" | "missing";
  weaviate: "ready" | "missing";
  qdrant: "ready" | "missing";
  required: boolean;
  missingRequired: string[];
}

export type PersistentMemoryInfraProbes = Record<
  PersistentMemoryInfraComponentId,
  (config: PersistentMemoryInfraConfig) => Promise<boolean>
>;

const LOCAL_DATABASE_URL =
  "postgresql://thecopy:thecopy_dev@localhost:5433/thecopy_dev";
const LOCAL_REDIS_URL = "redis://localhost:6379";
const LOCAL_WEAVIATE_URL = "http://localhost:8080";
const LOCAL_QDRANT_URL = "http://localhost:6333";

const COMPONENTS: PersistentMemoryInfraComponent[] = [
  {
    id: "postgres",
    kind: "database",
    defaultEndpoint: "localhost:5433",
  },
  {
    id: "redis",
    kind: "cache",
    defaultEndpoint: "localhost:6379",
  },
  {
    id: "bullmq",
    kind: "queue",
    defaultEndpoint: "redis://localhost:6379",
    dependsOn: "redis",
  },
  {
    id: "weaviate",
    kind: "vector-index",
    defaultEndpoint: "http://localhost:8080",
  },
  {
    id: "qdrant",
    kind: "vector-index",
    defaultEndpoint: "http://localhost:6333",
  },
];

interface HostPort {
  host: string;
  port: number;
}

function parseUrlHostPort(value: string, defaultPort: number): HostPort {
  const parsed = new URL(value);
  return {
    host: parsed.hostname || "localhost",
    port: Number(parsed.port || defaultPort),
  };
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/u, "");
}

function databaseEndpoint(databaseUrl: string): string {
  const parsed = new URL(databaseUrl);
  const port = parsed.port || "5432";
  return `${parsed.hostname}:${port}${parsed.pathname}`;
}

function isInfraRequired(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
): boolean {
  return (
    env["MEMORY_INFRA_REQUIRED"] === "true" ||
    env["PERSISTENT_MEMORY_INFRA_REQUIRED"] === "true"
  );
}

function hasBackendDependency(packageName: string): boolean {
  try {
    const requireFromBackend = createRequire(
      fromRepoRoot("apps/backend/package.json"),
    );
    requireFromBackend.resolve(packageName);
    return true;
  } catch {
    return false;
  }
}

async function probePostgres(config: PersistentMemoryInfraConfig): Promise<boolean> {
  try {
    const client = await createPersistentMemorySqlClient(config.databaseUrl);
    await client.query("SELECT 1");
    await client.end?.();
    return true;
  } catch {
    return false;
  }
}

async function probeRedis(config: PersistentMemoryInfraConfig): Promise<boolean> {
  try {
    const redis = parseUrlHostPort(config.redisUrl, 6379);
    return await probeTcpPort(redis.host, redis.port, 1000);
  } catch {
    return false;
  }
}

async function probeBullMq(config: PersistentMemoryInfraConfig): Promise<boolean> {
  return hasBackendDependency("bullmq") && (await probeRedis(config));
}

async function probeWeaviate(
  config: PersistentMemoryInfraConfig,
): Promise<boolean> {
  return probeHttpReady(
    `${trimTrailingSlash(config.weaviateUrl)}/v1/.well-known/ready`,
    2000,
  );
}

async function probeQdrant(config: PersistentMemoryInfraConfig): Promise<boolean> {
  return probeHttpReady(`${trimTrailingSlash(config.qdrantUrl)}/readyz`, 2000);
}

function statusEndpoint(
  id: PersistentMemoryInfraComponentId,
  config: PersistentMemoryInfraConfig,
): string {
  switch (id) {
    case "postgres":
      return databaseEndpoint(config.databaseUrl);
    case "redis":
    case "bullmq":
      return config.redisUrl;
    case "weaviate":
      return trimTrailingSlash(config.weaviateUrl);
    case "qdrant":
      return trimTrailingSlash(config.qdrantUrl);
  }
}

export function getPersistentMemoryInfraComponents(): PersistentMemoryInfraComponent[] {
  return COMPONENTS.map((component) => ({ ...component }));
}

export function buildPersistentMemoryInfraConfig(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): PersistentMemoryInfraConfig {
  const redisHost = env["REDIS_HOST"] || env["REDISHOST"] || "localhost";
  const redisPort = env["REDIS_PORT"] || env["REDISPORT"] || "6379";

  return {
    databaseUrl:
      env["PERSISTENT_MEMORY_DATABASE_URL"] ||
      env["DATABASE_URL"] ||
      LOCAL_DATABASE_URL,
    redisUrl: env["REDIS_URL"] || `redis://${redisHost}:${redisPort}`,
    weaviateUrl: trimTrailingSlash(env["WEAVIATE_URL"] || LOCAL_WEAVIATE_URL),
    qdrantUrl: trimTrailingSlash(env["QDRANT_URL"] || LOCAL_QDRANT_URL),
  };
}

export async function checkPersistentMemoryInfra(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
  probes: PersistentMemoryInfraProbes = {
    postgres: probePostgres,
    redis: probeRedis,
    bullmq: probeBullMq,
    weaviate: probeWeaviate,
    qdrant: probeQdrant,
  },
): Promise<PersistentMemoryInfraStatus> {
  const config = buildPersistentMemoryInfraConfig(env);
  const components = await Promise.all(
    COMPONENTS.map(async (component) => ({
      id: component.id,
      kind: component.kind,
      endpoint: statusEndpoint(component.id, config),
      ready: await probes[component.id](config),
    })),
  );

  return {
    status: components.every((component) => component.ready)
      ? "ready"
      : "degraded",
    components,
  };
}

export async function probePersistentMemoryInfra(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): Promise<PersistentMemoryInfraHealth> {
  const status = await checkPersistentMemoryInfra(env);
  const componentReady = new Map(
    status.components.map((component) => [component.id, component.ready]),
  );
  const required = isInfraRequired(env);
  const requiredIds: PersistentMemoryInfraComponentId[] = [
    "postgres",
    "redis",
    "bullmq",
    "weaviate",
  ];
  const missingRequired = required
    ? requiredIds.filter((id) => !componentReady.get(id))
    : [];

  return {
    postgres: componentReady.get("postgres") ? "ready" : "missing",
    redis: componentReady.get("redis") ? "ready" : "missing",
    weaviate: componentReady.get("weaviate") ? "ready" : "missing",
    qdrant: componentReady.get("qdrant") ? "ready" : "missing",
    required,
    missingRequired,
  };
}
