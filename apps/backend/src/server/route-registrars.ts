import { actorAiController } from "@/controllers/actorai.controller";
import { aiController } from "@/controllers/ai.controller";
import { appStateController } from "@/controllers/appState.controller";
import { authController } from "@/controllers/auth.controller";
import { breakdownController } from "@/controllers/breakdown.controller";
import { charactersController } from "@/controllers/characters.controller";
import { queueController } from "@/controllers/queue.controller";
import { scenesController } from "@/controllers/scenes.controller";
import { shotsController } from "@/controllers/shots.controller";
import { workflowController } from "@/controllers/workflow.controller";
import {
  manageRecoveryArtifact,
  zkLoginInit,
  zkLoginVerify,
  zkSignup,
} from "@/controllers/zkAuth.controller";
import { logger } from "@/lib/logger";
import { memoryHealthHandler, memoryRoutes, weaviateStore } from "@/memory";
import { perUserAiLimiter } from "@/middleware";
import { authMiddleware } from "@/middleware/auth.middleware";
import { csrfProtection } from "@/middleware/csrf.middleware";
import { metricsEndpoint } from "@/middleware/metrics.middleware";
import { actorAiService } from "@/services/actorai.service";

import { registerMetricsRoutes } from "./route-registrars/metrics-routes";
import { registerProjectAndPublicRoutes } from "./route-registrars/project-public-routes";
import { registerWafRoutes } from "./route-registrars/waf-routes";
import { telemetryBodySchema } from "./schemas";

import type { AnalysisController } from "@/controllers/analysis.controller";
import type { HealthController } from "@/controllers/health.controller";
import type { Application } from "express";

interface RouteDeps {
  analysisController: AnalysisController;
  healthController: HealthController;
}

export function registerAllRoutes(
  app: Application,
  { analysisController, healthController }: RouteDeps,
): void {
  registerHealthAndCostRoutes(app, healthController);
  registerAuthAndAnalysisRoutes(app, analysisController);
  registerProjectAndPublicRoutes(app);
  registerProductionRoutes(app);
  registerActorAndStateRoutes(app, analysisController);
  registerBreakdownAndQueueRoutes(app);
  registerMetricsRoutes(app);
  registerWafRoutes(app);
  registerWorkflowRoutes(app);
  registerMemoryRoutes(app);
}

function registerHealthAndCostRoutes(
  app: Application,
  healthController: HealthController,
): void {
  // Health check endpoints for Blue-Green deployment
  app.get("/api/health", healthController.getHealth.bind(healthController));
  app.get("/health", healthController.getHealth.bind(healthController));
  app.get("/health/live", healthController.getLiveness.bind(healthController));
  app.get(
    "/health/ready",
    healthController.getReadiness.bind(healthController),
  );
  app.get(
    "/health/startup",
    healthController.getStartup.bind(healthController),
  );
  app.get(
    "/health/detailed",
    healthController.getDetailedHealth.bind(healthController),
  );

  // Prometheus metrics endpoint
  app.get("/metrics", metricsEndpoint);

  // Gemini cost monitoring endpoint (protected - admin only)
  app.get("/api/gemini/cost-summary", authMiddleware, async (_req, res) => {
    try {
      const { geminiCostTracker } =
        await import("@/services/gemini-cost-tracker.service");
      const summary = await geminiCostTracker.getCostSummary();
      res.json({
        success: true,
        data: summary,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Failed to get cost summary:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve cost summary",
      });
    }
  });
}

function registerAuthAndAnalysisRoutes(
  app: Application,
  analysisController: AnalysisController,
): void {
  // Auth endpoints (public) - CSRF token is set after successful authentication
  app.post("/api/auth/signup", authController.signup.bind(authController));
  app.post("/api/auth/login", authController.login.bind(authController));
  app.post(
    "/api/auth/logout",
    csrfProtection,
    authController.logout.bind(authController),
  );
  app.post(
    "/api/auth/refresh",
    csrfProtection,
    authController.refresh.bind(authController),
  );
  app.get(
    "/api/auth/me",
    authMiddleware,
    authController.getCurrentUser.bind(authController),
  );

  // Zero-Knowledge Auth endpoints (public)
  app.post("/api/auth/zk-signup", zkSignup);
  app.post("/api/auth/zk-login-init", zkLoginInit);
  app.post("/api/auth/zk-login-verify", zkLoginVerify);
  app.post(
    "/api/auth/recovery",
    authMiddleware,
    csrfProtection,
    manageRecoveryArtifact,
  );

  // Seven Stations Pipeline endpoints (protected)
  app.post(
    "/api/analysis/seven-stations",
    authMiddleware,
    perUserAiLimiter,
    csrfProtection,
    analysisController.runSevenStationsPipeline.bind(analysisController),
  );
  app.get(
    "/api/analysis/stations-info",
    authMiddleware,
    analysisController.getStationDetails.bind(analysisController),
  );

  // Seven Stations Pipeline — streaming endpoints (SSE-only, protected)
  app.post(
    "/api/analysis/seven-stations/start",
    authMiddleware,
    perUserAiLimiter,
    csrfProtection,
    analysisController.startStreamSession.bind(analysisController),
  );
  app.get(
    "/api/analysis/seven-stations/stream/:analysisId",
    authMiddleware,
    analysisController.streamEvents.bind(analysisController),
  );
  app.get(
    "/api/analysis/seven-stations/:analysisId/snapshot",
    authMiddleware,
    analysisController.getAnalysisSnapshot.bind(analysisController),
  );
  app.post(
    "/api/analysis/seven-stations/:analysisId/retry/:stationId",
    authMiddleware,
    perUserAiLimiter,
    csrfProtection,
    analysisController.retryStation.bind(analysisController),
  );
  app.post(
    "/api/analysis/seven-stations/:analysisId/export",
    authMiddleware,
    csrfProtection,
    analysisController.exportAnalysis.bind(analysisController),
  );

  // Lightweight telemetry sink for the analysis surface (best-effort, fire-and-forget)
  app.post("/api/telemetry", authMiddleware, (req, res) => {
    try {
      const parsedBody = telemetryBodySchema.safeParse(req.body);
      if (parsedBody.success && parsedBody.data.event) {
        // logger drops to debug to avoid log noise
        logger.debug("telemetry", {
          event: parsedBody.data.event,
          payload: parsedBody.data.payload,
        });
      }
    } catch {
      /* swallow */
    }
    res.status(204).end();
  });
}

function registerProductionRoutes(app: Application): void {
  // Directors Studio - Scenes endpoints (protected)
  app.get(
    "/api/projects/:projectId/scenes",
    authMiddleware,
    scenesController.getScenes.bind(scenesController),
  );
  app.get(
    "/api/scenes/:id",
    authMiddleware,
    scenesController.getScene.bind(scenesController),
  );
  app.post(
    "/api/scenes",
    authMiddleware,
    csrfProtection,
    scenesController.createScene.bind(scenesController),
  );
  app.put(
    "/api/scenes/:id",
    authMiddleware,
    csrfProtection,
    scenesController.updateScene.bind(scenesController),
  );
  app.delete(
    "/api/scenes/:id",
    authMiddleware,
    csrfProtection,
    scenesController.deleteScene.bind(scenesController),
  );

  // Directors Studio - Characters endpoints (protected)
  app.get(
    "/api/projects/:projectId/characters",
    authMiddleware,
    charactersController.getCharacters.bind(charactersController),
  );
  app.get(
    "/api/characters/:id",
    authMiddleware,
    charactersController.getCharacter.bind(charactersController),
  );
  app.post(
    "/api/characters",
    authMiddleware,
    csrfProtection,
    charactersController.createCharacter.bind(charactersController),
  );
  app.put(
    "/api/characters/:id",
    authMiddleware,
    csrfProtection,
    charactersController.updateCharacter.bind(charactersController),
  );
  app.delete(
    "/api/characters/:id",
    authMiddleware,
    csrfProtection,
    charactersController.deleteCharacter.bind(charactersController),
  );

  // Directors Studio - Shots endpoints (protected)
  app.get(
    "/api/scenes/:sceneId/shots",
    authMiddleware,
    shotsController.getShots.bind(shotsController),
  );
  app.get(
    "/api/shots/:id",
    authMiddleware,
    shotsController.getShot.bind(shotsController),
  );
  app.post(
    "/api/shots",
    authMiddleware,
    csrfProtection,
    shotsController.createShot.bind(shotsController),
  );
  app.put(
    "/api/shots/:id",
    authMiddleware,
    csrfProtection,
    shotsController.updateShot.bind(shotsController),
  );
  app.delete(
    "/api/shots/:id",
    authMiddleware,
    csrfProtection,
    shotsController.deleteShot.bind(shotsController),
  );
  app.post(
    "/api/shots/suggestion",
    authMiddleware,
    csrfProtection,
    shotsController.generateShotSuggestion.bind(shotsController),
  );

  // AI endpoints (protected) — محدودة بمُعرّف المستخدم بالإضافة إلى الحد العام
  app.post(
    "/api/ai/chat",
    authMiddleware,
    perUserAiLimiter,
    csrfProtection,
    aiController.chat.bind(aiController),
  );
  app.post(
    "/api/ai/shot-suggestion",
    authMiddleware,
    perUserAiLimiter,
    csrfProtection,
    aiController.getShotSuggestion.bind(aiController),
  );
}

function registerActorAndStateRoutes(
  app: Application,
  analysisController: AnalysisController,
): void {
  // ActorAI endpoints (protected)
  app.post(
    "/api/actorai/voice-analytics",
    authMiddleware,
    csrfProtection,
    actorAiController.saveVoiceAnalytics.bind(actorAiController),
  );
  app.post(
    "/api/actorai/webcam-analysis",
    authMiddleware,
    csrfProtection,
    actorAiController.saveWebcamAnalysis.bind(actorAiController),
  );
  app.post(
    "/api/actorai/memorization",
    authMiddleware,
    csrfProtection,
    actorAiController.saveMemorizationStats.bind(actorAiController),
  );
  app.get(
    "/api/actorai/analytics/:id",
    authMiddleware,
    actorAiController.getAnalyticsById.bind(actorAiController),
  );
  app.get(
    "/api/actorai/analytics",
    authMiddleware,
    actorAiController.listAnalytics.bind(actorAiController),
  );

  // ActorAI public telemetry endpoints used by the web experience as best-effort persistence
  app.post("/api/public/actorai/voice-analytics", async (req, res) => {
    try {
      const result = await actorAiService.saveVoiceAnalytics(req.body);
      res.status(201).json(result);
    } catch (error) {
      logger.error("Failed to save public voice analytics:", error);
      res.status(503).json({
        success: false,
        error: "analytics_storage_unavailable",
        message: "Unable to persist analytics data. Please retry.",
      });
    }
  });
  app.post("/api/public/actorai/webcam-analysis", async (req, res) => {
    try {
      const result = await actorAiService.saveWebcamAnalysis(req.body);
      res.status(201).json(result);
    } catch (error) {
      logger.error("Failed to save public webcam analysis:", error);
      res.status(503).json({
        success: false,
        error: "analytics_storage_unavailable",
        message: "Unable to persist analytics data. Please retry.",
      });
    }
  });
  app.post("/api/public/actorai/memorization", async (req, res) => {
    try {
      const result = await actorAiService.saveMemorizationStats(req.body);
      res.status(201).json(result);
    } catch (error) {
      logger.error("Failed to save public memorization stats:", error);
      res.status(503).json({
        success: false,
        error: "analytics_storage_unavailable",
        message: "Unable to persist analytics data. Please retry.",
      });
    }
  });

  // Public Seven Stations endpoint for the web analysis surface
  app.post(
    "/api/public/analysis/seven-stations",
    analysisController.runSevenStationsPipeline.bind(analysisController),
  );

  // App State endpoints (public - used by frontend to persist/restore analysis state)
  app.get(
    "/api/app-state/:appId",
    appStateController.getState.bind(appStateController),
  );
  app.put(
    "/api/app-state/:appId",
    appStateController.setState.bind(appStateController),
  );
  app.delete(
    "/api/app-state/:appId",
    appStateController.clearState.bind(appStateController),
  );
}

function registerBreakdownAndQueueRoutes(app: Application): void {
  // Breakdown endpoints
  app.get(
    "/api/breakdown/health",
    breakdownController.health.bind(breakdownController),
  );
  app.post(
    "/api/breakdown/projects/bootstrap",
    authMiddleware,
    csrfProtection,
    breakdownController.bootstrapProject.bind(breakdownController),
  );
  app.post(
    "/api/breakdown/projects/:projectId/parse",
    authMiddleware,
    csrfProtection,
    breakdownController.parseProject.bind(breakdownController),
  );
  app.post(
    "/api/breakdown/projects/:projectId/analyze",
    authMiddleware,
    perUserAiLimiter,
    csrfProtection,
    breakdownController.analyzeProject.bind(breakdownController),
  );
  app.get(
    "/api/breakdown/projects/:projectId/report",
    authMiddleware,
    breakdownController.getProjectReport.bind(breakdownController),
  );
  app.get(
    "/api/breakdown/projects/:projectId/schedule",
    authMiddleware,
    breakdownController.getProjectSchedule.bind(breakdownController),
  );
  app.get(
    "/api/breakdown/scenes/:sceneId",
    authMiddleware,
    breakdownController.getSceneBreakdown.bind(breakdownController),
  );
  app.post(
    "/api/breakdown/scenes/:sceneId/reanalyze",
    authMiddleware,
    perUserAiLimiter,
    csrfProtection,
    breakdownController.reanalyzeScene.bind(breakdownController),
  );
  app.get(
    "/api/breakdown/reports/:reportId/export",
    authMiddleware,
    breakdownController.exportReport.bind(breakdownController),
  );
  app.post(
    "/api/breakdown/chat",
    authMiddleware,
    perUserAiLimiter,
    csrfProtection,
    breakdownController.chat.bind(breakdownController),
  );

  // Queue Management endpoints (protected)
  app.get(
    "/api/queue/jobs/:jobId",
    authMiddleware,
    queueController.getJobStatus.bind(queueController),
  );
  app.get(
    "/api/queue/stats",
    authMiddleware,
    queueController.getQueueStats.bind(queueController),
  );
  app.get(
    "/api/queue/:queueName/stats",
    authMiddleware,
    queueController.getSpecificQueueStats.bind(queueController),
  );
  app.post(
    "/api/queue/jobs/:jobId/retry",
    authMiddleware,
    csrfProtection,
    queueController.retryJob.bind(queueController),
  );
  app.post(
    "/api/queue/:queueName/clean",
    authMiddleware,
    csrfProtection,
    queueController.cleanQueue.bind(queueController),
  );
}

function registerWorkflowRoutes(app: Application): void {
  // Workflow execution endpoints
  app.get(
    "/api/workflow/presets",
    authMiddleware,
    workflowController.listPresets.bind(workflowController),
  );
  app.get(
    "/api/workflow/presets/:preset",
    authMiddleware,
    workflowController.getPreset.bind(workflowController),
  );
  app.get(
    "/api/workflow/progress/:workflowId",
    authMiddleware,
    workflowController.progress.bind(workflowController),
  );
  app.get(
    "/api/workflow/history",
    authMiddleware,
    workflowController.history.bind(workflowController),
  );
  app.post(
    "/api/workflow/execute",
    authMiddleware,
    csrfProtection,
    workflowController.execute.bind(workflowController),
  );
  app.post(
    "/api/workflow/execute-custom",
    authMiddleware,
    csrfProtection,
    workflowController.executeCustom.bind(workflowController),
  );
}

function registerMemoryRoutes(app: Application): void {
  app.get("/api/memory/health", memoryHealthHandler);

  // Memory System endpoints (protected)
  app.use(
    "/api/memory",
    authMiddleware,
    (req, res, next): void => {
      const status = weaviateStore.getStatus();

      if (req.path === "/health") {
        next();
        return;
      }

      if (!status.enabled) {
        res.status(503).json({
          success: false,
          error: "Memory system is disabled in this environment.",
          details: status,
        });
        return;
      }

      if (status.state !== "connected") {
        res.status(503).json({
          success: false,
          error: status.required
            ? "Memory system is required but unavailable."
            : "Memory system is currently unavailable.",
          details: status,
        });
        return;
      }

      next();
    },
    memoryRoutes,
  );
}
