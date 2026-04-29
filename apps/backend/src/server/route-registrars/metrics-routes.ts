import { metricsController } from "@/controllers/metrics.controller";
import { authMiddleware } from "@/middleware/auth.middleware";
import { csrfProtection } from "@/middleware/csrf.middleware";

import type { Application } from "express";

export function registerMetricsRoutes(app: Application): void {
  registerMetricsOverviewRoutes(app);
  registerCacheMetricsRoutes(app);
  registerApmMetricsRoutes(app);
}

function registerMetricsOverviewRoutes(app: Application): void {
  app.get(
    "/api/metrics/snapshot",
    authMiddleware,
    metricsController.getSnapshot.bind(metricsController),
  );
  app.get(
    "/api/metrics/latest",
    authMiddleware,
    metricsController.getLatest.bind(metricsController),
  );
  app.get(
    "/api/metrics/range",
    authMiddleware,
    metricsController.getRange.bind(metricsController),
  );
  app.get(
    "/api/metrics/database",
    authMiddleware,
    metricsController.getDatabaseMetrics.bind(metricsController),
  );
  app.get(
    "/api/metrics/redis",
    authMiddleware,
    metricsController.getRedisMetrics.bind(metricsController),
  );
  app.get(
    "/api/metrics/queue",
    authMiddleware,
    metricsController.getQueueMetrics.bind(metricsController),
  );
  app.get(
    "/api/metrics/api",
    authMiddleware,
    metricsController.getApiMetrics.bind(metricsController),
  );
  app.get(
    "/api/metrics/resources",
    authMiddleware,
    metricsController.getResourceMetrics.bind(metricsController),
  );
  app.get(
    "/api/metrics/gemini",
    authMiddleware,
    metricsController.getGeminiMetrics.bind(metricsController),
  );
  app.get(
    "/api/metrics/report",
    authMiddleware,
    metricsController.generateReport.bind(metricsController),
  );
  app.get(
    "/api/metrics/health",
    authMiddleware,
    metricsController.getHealth.bind(metricsController),
  );
  app.get(
    "/api/metrics/dashboard",
    authMiddleware,
    metricsController.getDashboardSummary.bind(metricsController),
  );
}

function registerCacheMetricsRoutes(app: Application): void {
  app.get(
    "/api/metrics/cache/snapshot",
    authMiddleware,
    metricsController.getCacheSnapshot.bind(metricsController),
  );
  app.get(
    "/api/metrics/cache/realtime",
    authMiddleware,
    metricsController.getCacheRealtime.bind(metricsController),
  );
  app.get(
    "/api/metrics/cache/health",
    authMiddleware,
    metricsController.getCacheHealth.bind(metricsController),
  );
  app.get(
    "/api/metrics/cache/report",
    authMiddleware,
    metricsController.getCacheReport.bind(metricsController),
  );
}

function registerApmMetricsRoutes(app: Application): void {
  app.get(
    "/api/metrics/apm/dashboard",
    authMiddleware,
    metricsController.getApmDashboard.bind(metricsController),
  );
  app.get(
    "/api/metrics/apm/config",
    authMiddleware,
    metricsController.getApmConfig.bind(metricsController),
  );
  app.post(
    "/api/metrics/apm/reset",
    authMiddleware,
    csrfProtection,
    metricsController.resetApmMetrics.bind(metricsController),
  );
  app.get(
    "/api/metrics/apm/alerts",
    authMiddleware,
    metricsController.getApmAlerts.bind(metricsController),
  );
}
