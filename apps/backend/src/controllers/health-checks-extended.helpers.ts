import { getEditorIntegrationHealth } from "@/editor/runtime";
import { logger } from "@/lib/logger";
import { weaviateStore } from "@/memory";
import { platformGenAIService } from "@/services/platform-genai.service";
import { getAnalyticsHealth } from "@/utils/connectivity-telemetry";

import {
  checkDatabase,
  checkRedis,
  checkMemory,
  checkDisk,
  checkEnvironment,
} from "./health-checks.helpers.js";

import type { HealthCheck, HealthStatus, ReadinessStatus, DetailedHealthStatus } from "./health-checks.helpers.js";

export async function checkExternalServices(): Promise<HealthCheck> {
  try {
    const sentryConfigured = Boolean(process.env.SENTRY_DSN?.trim());
    const aiProviderHealth = await platformGenAIService.probeHealth();

    if (aiProviderHealth.status !== "healthy") {
      return {
        status: "unhealthy",
        responseTime: aiProviderHealth.responseTime,
        error: aiProviderHealth.error ?? "The AI provider readiness probe failed.",
        details: {
          sentryConfigured,
          aiTriState: aiProviderHealth.triState,
          ...(aiProviderHealth.details ?? {}),
        },
      };
    }

    return {
      status: "healthy",
      responseTime: aiProviderHealth.responseTime,
      message: aiProviderHealth.message ?? "External services are reachable.",
      details: {
        sentryConfigured,
        aiTriState: aiProviderHealth.triState,
        ...(aiProviderHealth.details ?? {}),
      },
    };
  } catch (error) {
    logger.error("External services health check failed", { error });
    return {
      status: "unhealthy",
      error: error instanceof Error ? error.message : "External services check failed",
    };
  }
}

export async function checkWeaviate(): Promise<HealthCheck> {
  const startTime = Date.now();
  const statusBeforeCheck = weaviateStore.getStatus();

  if (!statusBeforeCheck.enabled) {
    return {
      status: "healthy",
      required: false,
      responseTime: 0,
      message: "Weaviate is disabled for this environment.",
      details: statusBeforeCheck as unknown as Record<string, unknown>,
    };
  }

  const healthy = await weaviateStore.healthCheck();
  const statusAfterCheck = weaviateStore.getStatus();

  if (healthy) {
    return {
      status: "healthy",
      required: statusAfterCheck.required,
      responseTime: Date.now() - startTime,
      message: "Weaviate is connected.",
      details: statusAfterCheck as unknown as Record<string, unknown>,
    };
  }

  return {
    status: statusAfterCheck.required ? "unhealthy" : "degraded",
    required: statusAfterCheck.required,
    responseTime: Date.now() - startTime,
    error: statusAfterCheck.required
      ? "Weaviate is required but unavailable."
      : "Weaviate is unavailable; memory routes are degraded.",
    details: statusAfterCheck as unknown as Record<string, unknown>,
  };
}

export async function checkEditorIntegration(): Promise<HealthCheck> {
  const startTime = Date.now();

  try {
    const editorHealth = await getEditorIntegrationHealth();
    const healthy = editorHealth["ok"] === true;

    return {
      status: healthy ? "healthy" : "unhealthy",
      responseTime: Date.now() - startTime,
      details: editorHealth,
      ...(healthy
        ? { message: "Editor integration is fully configured." }
        : { error: "Editor integration is not fully configured." }),
    };
  } catch (error) {
    logger.error("Editor integration health check failed", { error });
    return {
      status: "unhealthy",
      error:
        error instanceof Error ? error.message : "Editor integration check failed",
    };
  }
}

export function checkAnalyticsPersistence(): HealthCheck {
  const analytics = getAnalyticsHealth();

  // تمييز صريح بين "لم يُمارَس بعد" و"هناك فشل حقيقي":
  // إذا لم يحدث أي نجاح ولم يُسجَّل أي فشل، فالحالة هي "غير مُختبَرة" — وليست
  // صحة شكلية ولا فشل فعلي. نُعيدها كـ degraded مع رسالة صريحة لا تكذب.
  const neverExercised =
    analytics.lastSuccess === null && analytics.failureCount === 0;

  let message: string;
  if (analytics.status === "healthy") {
    message = "Analytics persistence is healthy.";
  } else if (neverExercised) {
    message =
      "Analytics persistence has not been exercised yet (no successes and no failures recorded).";
  } else {
    message = "Analytics persistence has recent failures.";
  }

  return {
    status: analytics.status,
    // تحليلات الكتابة ليست شرطًا لاستعداد التطبيق الأساسي، لكنها تُعرَض في التقرير.
    required: false,
    details: {
      status: analytics.status,
      lastSuccess: analytics.lastSuccess,
      failureCount: analytics.failureCount,
      neverExercised,
    },
    message,
  };
}

export function aggregateHealthStatus(
  checks: Record<string, HealthCheck>
): "healthy" | "degraded" | "unhealthy" {
  const values = Object.values(checks);
  if (values.some((check) => check.status === "unhealthy")) return "unhealthy";
  if (values.some((check) => check.status === "degraded")) return "degraded";
  return "healthy";
}

export function aggregateReadinessStatus(
  checks: Record<string, HealthCheck>
): "ready" | "degraded" | "not_ready" {
  const values = Object.values(checks);
  if (values.some((c) => c.status === "unhealthy" && c.required !== false)) return "not_ready";
  if (values.some((c) => c.status === "degraded" || (c.status === "unhealthy" && c.required === false))) return "degraded";
  return "ready";
}

export async function performHealthChecks(startTime: number): Promise<HealthStatus> {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    memory: await checkMemory(),
    external_services: await checkExternalServices(),
    weaviate: await checkWeaviate(),
    editor: await checkEditorIntegration(),
    analytics: checkAnalyticsPersistence(),
  };

  return {
    status: aggregateHealthStatus(checks),
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    uptime: Date.now() - startTime,
    checks,
  };
}

export async function performReadinessChecks(): Promise<ReadinessStatus> {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    external_services: await checkExternalServices(),
    weaviate: await checkWeaviate(),
    editor: await checkEditorIntegration(),
    analytics: checkAnalyticsPersistence(),
  };

  return {
    status: aggregateReadinessStatus(checks),
    timestamp: new Date().toISOString(),
    checks,
  };
}

export async function performDetailedHealthChecks(
  startTime: number
): Promise<DetailedHealthStatus> {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    memory: await checkMemory(),
    disk: await checkDisk(),
    external_services: await checkExternalServices(),
    environment: await checkEnvironment(),
    weaviate: await checkWeaviate(),
    editor: await checkEditorIntegration(),
    analytics: checkAnalyticsPersistence(),
  };

  return {
    status: aggregateHealthStatus(checks),
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    uptime: Date.now() - startTime,
    environment: process.env.NODE_ENV || "development",
    checks,
  };
}
