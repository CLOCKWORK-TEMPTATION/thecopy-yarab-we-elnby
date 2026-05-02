import { statfs } from "node:fs/promises";

import { sql } from "drizzle-orm";
import { createClient } from "redis";

import { logger } from "@/lib/logger";

import { isRedisEnabled } from "../config/redis-gate.js";
import { getRedisConfig } from "../config/redis.config.js";
import { db } from "../db/index.js";

export interface HealthCheck {
  status: "healthy" | "degraded" | "unhealthy";
  required?: boolean;
  responseTime?: number;
  error?: string;
  message?: string;
  details?: Record<string, unknown>;
}

export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  uptime: number;
  checks: Record<string, HealthCheck>;
}

export interface ReadinessStatus {
  status: "ready" | "degraded" | "not_ready";
  timestamp: string;
  checks: Record<string, HealthCheck>;
}

export interface DetailedHealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  uptime: number;
  environment: string;
  checks: Record<string, HealthCheck>;
}

export interface LivenessStatus {
  status: "alive" | "dead";
  timestamp: string;
  uptime: number;
}

const DISK_USAGE_LIMIT_PERCENT = 90;

const REQUIRED_DATABASE_SCHEMA: Record<string, string[]> = {
  users: [
    "id",
    "email",
    "password_hash",
    "auth_verifier_hash",
    "kdf_salt",
    "account_status",
    "mfa_enabled",
    "created_at",
    "updated_at",
  ],
  refresh_tokens: ["id", "user_id", "token", "expires_at", "created_at"],
  recovery_artifacts: [
    "id",
    "user_id",
    "encrypted_recovery_artifact",
    "iv",
    "created_at",
  ],
  app_persistence_records: [
    "id",
    "app_id",
    "scope",
    "record_key",
    "payload",
    "created_at",
    "updated_at",
  ],
};

interface SchemaRow {
  tableName?: string;
  table_name?: string;
  columnName?: string;
  column_name?: string;
}

function getQueryRows(result: unknown): unknown[] {
  if (Array.isArray(result)) {
    return result;
  }

  const rows = (result as { rows?: unknown[] } | null)?.rows;
  return Array.isArray(rows) ? rows : [];
}

function buildSchemaDetails(rows: unknown[]): {
  missingTables: string[];
  missingColumns: Record<string, string[]>;
} {
  const actualSchema = new Map<string, Set<string>>();

  for (const row of rows as SchemaRow[]) {
    const tableName = row.tableName ?? row.table_name;
    const columnName = row.columnName ?? row.column_name;

    if (!tableName || !columnName) {
      continue;
    }

    const columns = actualSchema.get(tableName) ?? new Set<string>();
    columns.add(columnName);
    actualSchema.set(tableName, columns);
  }

  const missingTables: string[] = [];
  const missingColumns: Record<string, string[]> = {};

  for (const [tableName, requiredColumns] of Object.entries(
    REQUIRED_DATABASE_SCHEMA,
  )) {
    const actualColumns = actualSchema.get(tableName);

    if (!actualColumns) {
      missingTables.push(tableName);
      continue;
    }

    const missing = requiredColumns.filter(
      (columnName) => !actualColumns.has(columnName),
    );

    if (missing.length > 0) {
      missingColumns[tableName] = missing;
    }
  }

  return { missingTables, missingColumns };
}

export async function checkDatabase(): Promise<HealthCheck> {
  const startTime = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    return {
      status: "healthy",
      required: true,
      responseTime: Date.now() - startTime,
    };
  } catch (error) {
    logger.error("Database health check failed", { error });
    return {
      status: "unhealthy",
      required: true,
      error:
        error instanceof Error ? error.message : "Database connection failed",
    };
  }
}

export async function checkDatabaseSchema(): Promise<HealthCheck> {
  const startTime = Date.now();
  const tableNames = Object.keys(REQUIRED_DATABASE_SCHEMA);

  try {
    const result = await db.execute(sql`
      SELECT
        table_name AS "tableName",
        column_name AS "columnName"
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN (
          ${sql.join(
            tableNames.map((tableName) => sql`${tableName}`),
            sql`, `,
          )}
        )
    `);
    const details = buildSchemaDetails(getQueryRows(result));
    const missingColumnCount = Object.values(details.missingColumns).reduce(
      (total, columns) => total + columns.length,
      0,
    );

    if (details.missingTables.length > 0 || missingColumnCount > 0) {
      return {
        status: "unhealthy",
        required: true,
        responseTime: Date.now() - startTime,
        error: "Database schema is incomplete.",
        details,
      };
    }

    return {
      status: "healthy",
      required: true,
      responseTime: Date.now() - startTime,
      details: {
        checkedTables: tableNames,
      },
    };
  } catch (error) {
    logger.error("Database schema health check failed", { error });
    return {
      status: "unhealthy",
      required: true,
      error:
        error instanceof Error
          ? error.message
          : "Database schema check failed",
    };
  }
}

export async function checkRedis(): Promise<HealthCheck> {
  const startTime = Date.now();
  let client: ReturnType<typeof createClient> | null = null;

  if (!isRedisEnabled()) {
    return {
      status: "healthy",
      required: false,
      responseTime: 0,
      message: "Redis is disabled for this environment.",
    };
  }

  try {
    const config = getRedisConfig();
    client = createClient(config);
    await client.connect();
    await client.ping();
    await client.disconnect();

    return {
      status: "healthy",
      required: true,
      responseTime: Date.now() - startTime,
    };
  } catch (error) {
    logger.error("Redis health check failed", { error });
    if (client) {
      try {
        await client.disconnect();
      } catch (disconnectError) {
        logger.error("Error disconnecting Redis client", { disconnectError });
      }
    }

    return {
      status: "unhealthy",
      required: true,
      error: error instanceof Error ? error.message : "Redis connection failed",
    };
  }
}

export function checkMemory(): HealthCheck {
  try {
    const usage = process.memoryUsage();
    const heapUsed = usage.heapUsed / 1024 / 1024;
    const memoryLimit = 512;

    if (heapUsed > memoryLimit) {
      return {
        status: "unhealthy",
        error: `Memory usage (${heapUsed.toFixed(2)}MB) exceeds limit (${memoryLimit}MB)`,
      };
    }

    return {
      status: "healthy",
      responseTime: Math.round(heapUsed),
    };
  } catch (error) {
    logger.error("Memory health check failed", { error });
    return {
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Memory check failed",
    };
  }
}

export async function checkDisk(): Promise<HealthCheck> {
  try {
    const filesystemStats = await statfs(process.cwd());
    const totalBlocks = Number(filesystemStats.blocks);
    const availableBlocks = Number(filesystemStats.bavail);
    const blockSize = Number(filesystemStats.bsize);

    if (totalBlocks <= 0 || blockSize <= 0) {
      return {
        status: "unhealthy",
        error: "Disk statistics are not available for the current filesystem.",
      };
    }

    const usedBlocks = totalBlocks - availableBlocks;
    const diskUsage = Math.round((usedBlocks / totalBlocks) * 10000) / 100;
    const totalBytes = totalBlocks * blockSize;
    const availableBytes = availableBlocks * blockSize;
    const usedBytes = usedBlocks * blockSize;

    if (diskUsage > DISK_USAGE_LIMIT_PERCENT) {
      return {
        status: "unhealthy",
        error: `Disk usage (${diskUsage}%) exceeds limit (${DISK_USAGE_LIMIT_PERCENT}%).`,
        details: { totalBytes, usedBytes, availableBytes },
      };
    }

    return {
      status: "healthy",
      responseTime: diskUsage,
      details: { totalBytes, usedBytes, availableBytes },
    };
  } catch (error) {
    logger.error("Disk health check failed", { error });
    return {
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Disk check failed",
    };
  }
}

export function checkEnvironment(): HealthCheck {
  try {
    const requiredEnvVars = ["NODE_ENV", "DATABASE_URL", "JWT_SECRET"];
    const hasGeminiProvider =
      Boolean(process.env.GEMINI_API_KEY?.trim()) ||
      Boolean(process.env.GOOGLE_GENAI_API_KEY?.trim());

    const missingVars = requiredEnvVars.filter(
      (varName) => !process.env[varName],
    );
    if (!hasGeminiProvider) {
      missingVars.push("GEMINI_API_KEY|GOOGLE_GENAI_API_KEY");
    }

    if (missingVars.length > 0) {
      return {
        status: "unhealthy",
        error: `Missing required environment variables: ${missingVars.join(", ")}`,
      };
    }

    return {
      status: "healthy",
      responseTime: 0,
    };
  } catch (error) {
    logger.error("Environment health check failed", { error });
    return {
      status: "unhealthy",
      error:
        error instanceof Error ? error.message : "Environment check failed",
    };
  }
}

export {
  checkExternalServices,
  checkWeaviate,
  checkEditorIntegration,
  checkAnalyticsPersistence,
  aggregateHealthStatus,
  aggregateReadinessStatus,
  performHealthChecks,
  performReadinessChecks,
  performDetailedHealthChecks,
} from "./health-checks-extended.helpers.js";
