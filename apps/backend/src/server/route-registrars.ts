
import { actorAiController } from '@/controllers/actorai.controller';
import { aiController } from '@/controllers/ai.controller';
import { appStateController } from '@/controllers/appState.controller';
import { authController } from '@/controllers/auth.controller';
import { brainstormController } from '@/controllers/brainstorm.controller';
import { breakdownController } from '@/controllers/breakdown.controller';
import { budgetController } from '@/controllers/budget.controller';
import { charactersController } from '@/controllers/characters.controller';
import { cineAIController } from '@/controllers/cineai.controller';
import { critiqueController } from '@/controllers/critique.controller';
import {
  createEncryptedDocument,
  deleteEncryptedDocument,
  getEncryptedDocument,
  listEncryptedDocuments,
  updateEncryptedDocument,
} from '@/controllers/encryptedDocs.controller';
import { metricsController } from '@/controllers/metrics.controller';
import { projectsController } from '@/controllers/projects.controller';
import { queueController } from '@/controllers/queue.controller';
import { scenesController } from '@/controllers/scenes.controller';
import { shotsController } from '@/controllers/shots.controller';
import { styleistController } from '@/controllers/styleist.controller';
import { workflowController } from '@/controllers/workflow.controller';
import {
  manageRecoveryArtifact,
  zkLoginInit,
  zkLoginVerify,
  zkSignup,
} from '@/controllers/zkAuth.controller';
import { logger } from '@/lib/logger';
import { memoryHealthHandler, memoryRoutes, weaviateStore } from '@/memory';
import { perUserAiLimiter } from '@/middleware';
import { authMiddleware } from '@/middleware/auth.middleware';
import { csrfProtection } from '@/middleware/csrf.middleware';
import { metricsEndpoint } from '@/middleware/metrics.middleware';
import {
  blockIP,
  getBlockedIPs,
  getWAFConfig,
  getWAFEvents,
  getWAFStats,
  unblockIP,
  updateWAFConfig,
  type WAFConfig,
} from '@/middleware/waf.middleware';
import { artDirectorRouter } from '@/modules/art-director/routes';
import { breakappRouter } from '@/modules/breakapp/routes';
import { styleistRouter } from '@/modules/styleist/routes';
import { actorAiService } from '@/services/actorai.service';

import {
  telemetryBodySchema,
  wafConfigUpdateSchema,
  wafIpBodySchema,
} from './schemas';

import type { AnalysisController } from '@/controllers/analysis.controller';
import type { HealthController } from '@/controllers/health.controller';
import type { Application } from 'express';

interface RouteDeps {
  analysisController: AnalysisController;
  healthController: HealthController;
}

export function registerAllRoutes(
  app: Application,
  { analysisController, healthController }: RouteDeps
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
  healthController: HealthController
): void {
  // Health check endpoints for Blue-Green deployment
  app.get('/api/health', healthController.getHealth.bind(healthController));
  app.get('/health', healthController.getHealth.bind(healthController));
  app.get('/health/live', healthController.getLiveness.bind(healthController));
  app.get('/health/ready', healthController.getReadiness.bind(healthController));
  app.get('/health/startup', healthController.getStartup.bind(healthController));
  app.get('/health/detailed', healthController.getDetailedHealth.bind(healthController));

  // Prometheus metrics endpoint
  app.get('/metrics', metricsEndpoint);

  // Gemini cost monitoring endpoint (protected - admin only)
  app.get('/api/gemini/cost-summary', authMiddleware, async (_req, res) => {
    try {
      const { geminiCostTracker } = await import('@/services/gemini-cost-tracker.service');
      const summary = await geminiCostTracker.getCostSummary();
      res.json({
        success: true,
        data: summary,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to get cost summary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve cost summary',
      });
    }
  });
}

function registerAuthAndAnalysisRoutes(
  app: Application,
  analysisController: AnalysisController
): void {
  // Auth endpoints (public) - CSRF token is set after successful authentication
  app.post('/api/auth/signup', authController.signup.bind(authController));
  app.post('/api/auth/login', authController.login.bind(authController));
  app.post('/api/auth/logout', csrfProtection, authController.logout.bind(authController));
  app.post('/api/auth/refresh', csrfProtection, authController.refresh.bind(authController));
  app.get('/api/auth/me', authMiddleware, authController.getCurrentUser.bind(authController));

  // Zero-Knowledge Auth endpoints (public)
  app.post('/api/auth/zk-signup', zkSignup);
  app.post('/api/auth/zk-login-init', zkLoginInit);
  app.post('/api/auth/zk-login-verify', zkLoginVerify);
  app.post('/api/auth/recovery', authMiddleware, csrfProtection, manageRecoveryArtifact);

  // Seven Stations Pipeline endpoints (protected)
  app.post('/api/analysis/seven-stations', authMiddleware, perUserAiLimiter, csrfProtection, analysisController.runSevenStationsPipeline.bind(analysisController));
  app.get('/api/analysis/stations-info', authMiddleware, analysisController.getStationDetails.bind(analysisController));

  // Seven Stations Pipeline — streaming endpoints (SSE-only, protected)
  app.post('/api/analysis/seven-stations/start', authMiddleware, perUserAiLimiter, csrfProtection, analysisController.startStreamSession.bind(analysisController));
  app.get('/api/analysis/seven-stations/stream/:analysisId', authMiddleware, analysisController.streamEvents.bind(analysisController));
  app.get('/api/analysis/seven-stations/:analysisId/snapshot', authMiddleware, analysisController.getAnalysisSnapshot.bind(analysisController));
  app.post('/api/analysis/seven-stations/:analysisId/retry/:stationId', authMiddleware, perUserAiLimiter, csrfProtection, analysisController.retryStation.bind(analysisController));
  app.post('/api/analysis/seven-stations/:analysisId/export', authMiddleware, csrfProtection, analysisController.exportAnalysis.bind(analysisController));

  // Lightweight telemetry sink for the analysis surface (best-effort, fire-and-forget)
  app.post('/api/telemetry', authMiddleware, (req, res) => {
    try {
      const parsedBody = telemetryBodySchema.safeParse(req.body);
      if (parsedBody.success && parsedBody.data.event) {
        // logger drops to debug to avoid log noise
        logger.debug('telemetry', {
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

function registerProjectAndPublicRoutes(app: Application): void {
  // Enhanced Self-Critique endpoints (protected)
  app.get('/api/critique/config', authMiddleware, critiqueController.getAllCritiqueConfigs.bind(critiqueController));
  app.get('/api/critique/config/:taskType', authMiddleware, critiqueController.getCritiqueConfig.bind(critiqueController));
  app.get('/api/critique/dimensions/:taskType', authMiddleware, critiqueController.getDimensionDetails.bind(critiqueController));
  app.post('/api/critique/summary', authMiddleware, csrfProtection, critiqueController.getCritiqueSummary.bind(critiqueController));

  // Directors Studio - Projects endpoints (protected)
  app.get('/api/projects', authMiddleware, projectsController.getProjects.bind(projectsController));
  app.get('/api/projects/:id', authMiddleware, projectsController.getProject.bind(projectsController));
  app.post('/api/projects', authMiddleware, csrfProtection, projectsController.createProject.bind(projectsController));
  app.put('/api/projects/:id', authMiddleware, csrfProtection, projectsController.updateProject.bind(projectsController));
  app.delete('/api/projects/:id', authMiddleware, csrfProtection, projectsController.deleteProject.bind(projectsController));
  app.post('/api/projects/:id/analyze', authMiddleware, perUserAiLimiter, csrfProtection, projectsController.analyzeScript.bind(projectsController));

  // Zero-Knowledge Encrypted Documents endpoints (protected)
  app.post('/api/docs', authMiddleware, csrfProtection, createEncryptedDocument);
  app.get('/api/docs/:id', authMiddleware, getEncryptedDocument);
  app.put('/api/docs/:id', authMiddleware, csrfProtection, updateEncryptedDocument);
  app.delete('/api/docs/:id', authMiddleware, csrfProtection, deleteEncryptedDocument);
  app.get('/api/docs', authMiddleware, listEncryptedDocuments);

  // BREAKAPP operational endpoints
  app.use('/api/breakapp', breakappRouter);

  // Art Director public operational endpoints
  app.use('/api/art-director', artDirectorRouter);

  // Official public compute routes for frontend apps
  app.post('/api/budget/generate', budgetController.generate.bind(budgetController));
  app.post('/api/budget/analyze', budgetController.analyze.bind(budgetController));
  app.post('/api/budget/export', budgetController.export.bind(budgetController));
  app.get('/api/brainstorm', brainstormController.getCatalog.bind(brainstormController));
  app.post('/api/brainstorm', brainstormController.conduct.bind(brainstormController));
  app.get('/api/public/brainstorm', brainstormController.getCatalog.bind(brainstormController));
  app.post('/api/public/brainstorm', brainstormController.conductDebate.bind(brainstormController));
  app.post('/api/styleist/execute', styleistController.execute.bind(styleistController));
  app.post('/api/cineai/validate-shot', cineAIController.validateShot.bind(cineAIController));
  app.post('/api/cineai/color-grading', cineAIController.colorGrading.bind(cineAIController));

  // StyleIST costume design endpoints (protected)
  app.use('/api/styleist', authMiddleware, styleistRouter);
}

function registerProductionRoutes(app: Application): void {
  // Directors Studio - Scenes endpoints (protected)
  app.get('/api/projects/:projectId/scenes', authMiddleware, scenesController.getScenes.bind(scenesController));
  app.get('/api/scenes/:id', authMiddleware, scenesController.getScene.bind(scenesController));
  app.post('/api/scenes', authMiddleware, csrfProtection, scenesController.createScene.bind(scenesController));
  app.put('/api/scenes/:id', authMiddleware, csrfProtection, scenesController.updateScene.bind(scenesController));
  app.delete('/api/scenes/:id', authMiddleware, csrfProtection, scenesController.deleteScene.bind(scenesController));

  // Directors Studio - Characters endpoints (protected)
  app.get('/api/projects/:projectId/characters', authMiddleware, charactersController.getCharacters.bind(charactersController));
  app.get('/api/characters/:id', authMiddleware, charactersController.getCharacter.bind(charactersController));
  app.post('/api/characters', authMiddleware, csrfProtection, charactersController.createCharacter.bind(charactersController));
  app.put('/api/characters/:id', authMiddleware, csrfProtection, charactersController.updateCharacter.bind(charactersController));
  app.delete('/api/characters/:id', authMiddleware, csrfProtection, charactersController.deleteCharacter.bind(charactersController));

  // Directors Studio - Shots endpoints (protected)
  app.get('/api/scenes/:sceneId/shots', authMiddleware, shotsController.getShots.bind(shotsController));
  app.get('/api/shots/:id', authMiddleware, shotsController.getShot.bind(shotsController));
  app.post('/api/shots', authMiddleware, csrfProtection, shotsController.createShot.bind(shotsController));
  app.put('/api/shots/:id', authMiddleware, csrfProtection, shotsController.updateShot.bind(shotsController));
  app.delete('/api/shots/:id', authMiddleware, csrfProtection, shotsController.deleteShot.bind(shotsController));
  app.post('/api/shots/suggestion', authMiddleware, csrfProtection, shotsController.generateShotSuggestion.bind(shotsController));

  // AI endpoints (protected) — محدودة بمُعرّف المستخدم بالإضافة إلى الحد العام
  app.post('/api/ai/chat', authMiddleware, perUserAiLimiter, csrfProtection, aiController.chat.bind(aiController));
  app.post('/api/ai/shot-suggestion', authMiddleware, perUserAiLimiter, csrfProtection, aiController.getShotSuggestion.bind(aiController));
}

function registerActorAndStateRoutes(
  app: Application,
  analysisController: AnalysisController
): void {
  // ActorAI endpoints (protected)
  app.post('/api/actorai/voice-analytics', authMiddleware, csrfProtection, actorAiController.saveVoiceAnalytics.bind(actorAiController));
  app.post('/api/actorai/webcam-analysis', authMiddleware, csrfProtection, actorAiController.saveWebcamAnalysis.bind(actorAiController));
  app.post('/api/actorai/memorization', authMiddleware, csrfProtection, actorAiController.saveMemorizationStats.bind(actorAiController));
  app.get('/api/actorai/analytics/:id', authMiddleware, actorAiController.getAnalyticsById.bind(actorAiController));
  app.get('/api/actorai/analytics', authMiddleware, actorAiController.listAnalytics.bind(actorAiController));

  // ActorAI public telemetry endpoints used by the web experience as best-effort persistence
  app.post('/api/public/actorai/voice-analytics', async (req, res) => {
    try {
      const result = await actorAiService.saveVoiceAnalytics(req.body);
      res.status(201).json(result);
    } catch (error) {
      logger.error('Failed to save public voice analytics:', error);
      res.status(503).json({
        success: false,
        error: 'analytics_storage_unavailable',
        message: 'Unable to persist analytics data. Please retry.',
      });
    }
  });
  app.post('/api/public/actorai/webcam-analysis', async (req, res) => {
    try {
      const result = await actorAiService.saveWebcamAnalysis(req.body);
      res.status(201).json(result);
    } catch (error) {
      logger.error('Failed to save public webcam analysis:', error);
      res.status(503).json({
        success: false,
        error: 'analytics_storage_unavailable',
        message: 'Unable to persist analytics data. Please retry.',
      });
    }
  });
  app.post('/api/public/actorai/memorization', async (req, res) => {
    try {
      const result = await actorAiService.saveMemorizationStats(req.body);
      res.status(201).json(result);
    } catch (error) {
      logger.error('Failed to save public memorization stats:', error);
      res.status(503).json({
        success: false,
        error: 'analytics_storage_unavailable',
        message: 'Unable to persist analytics data. Please retry.',
      });
    }
  });

  // Public Seven Stations endpoint for the web analysis surface
  app.post('/api/public/analysis/seven-stations', analysisController.runSevenStationsPipeline.bind(analysisController));

  // App State endpoints (public - used by frontend to persist/restore analysis state)
  app.get('/api/app-state/:appId', appStateController.getState.bind(appStateController));
  app.put('/api/app-state/:appId', appStateController.setState.bind(appStateController));
  app.delete('/api/app-state/:appId', appStateController.clearState.bind(appStateController));
}

function registerBreakdownAndQueueRoutes(app: Application): void {
  // Breakdown endpoints
  app.get('/api/breakdown/health', breakdownController.health.bind(breakdownController));
  app.post('/api/breakdown/projects/bootstrap', authMiddleware, csrfProtection, breakdownController.bootstrapProject.bind(breakdownController));
  app.post('/api/breakdown/projects/:projectId/parse', authMiddleware, csrfProtection, breakdownController.parseProject.bind(breakdownController));
  app.post('/api/breakdown/projects/:projectId/analyze', authMiddleware, perUserAiLimiter, csrfProtection, breakdownController.analyzeProject.bind(breakdownController));
  app.get('/api/breakdown/projects/:projectId/report', authMiddleware, breakdownController.getProjectReport.bind(breakdownController));
  app.get('/api/breakdown/projects/:projectId/schedule', authMiddleware, breakdownController.getProjectSchedule.bind(breakdownController));
  app.get('/api/breakdown/scenes/:sceneId', authMiddleware, breakdownController.getSceneBreakdown.bind(breakdownController));
  app.post('/api/breakdown/scenes/:sceneId/reanalyze', authMiddleware, perUserAiLimiter, csrfProtection, breakdownController.reanalyzeScene.bind(breakdownController));
  app.get('/api/breakdown/reports/:reportId/export', authMiddleware, breakdownController.exportReport.bind(breakdownController));
  app.post('/api/breakdown/chat', authMiddleware, perUserAiLimiter, csrfProtection, breakdownController.chat.bind(breakdownController));

  // Queue Management endpoints (protected)
  app.get('/api/queue/jobs/:jobId', authMiddleware, queueController.getJobStatus.bind(queueController));
  app.get('/api/queue/stats', authMiddleware, queueController.getQueueStats.bind(queueController));
  app.get('/api/queue/:queueName/stats', authMiddleware, queueController.getSpecificQueueStats.bind(queueController));
  app.post('/api/queue/jobs/:jobId/retry', authMiddleware, csrfProtection, queueController.retryJob.bind(queueController));
  app.post('/api/queue/:queueName/clean', authMiddleware, csrfProtection, queueController.cleanQueue.bind(queueController));
}

function registerWorkflowRoutes(app: Application): void {
  // Workflow execution endpoints
  app.get('/api/workflow/presets', authMiddleware, workflowController.listPresets.bind(workflowController));
  app.get('/api/workflow/presets/:preset', authMiddleware, workflowController.getPreset.bind(workflowController));
  app.get('/api/workflow/progress/:workflowId', authMiddleware, workflowController.progress.bind(workflowController));
  app.get('/api/workflow/history', authMiddleware, workflowController.history.bind(workflowController));
  app.post('/api/workflow/execute', authMiddleware, csrfProtection, workflowController.execute.bind(workflowController));
  app.post('/api/workflow/execute-custom', authMiddleware, csrfProtection, workflowController.executeCustom.bind(workflowController));
}

function registerMemoryRoutes(app: Application): void {
  app.get('/api/memory/health', memoryHealthHandler);

  // Memory System endpoints (protected)
  app.use(
    '/api/memory',
    authMiddleware,
    (req, res, next): void => {
      const status = weaviateStore.getStatus();

      if (req.path === '/health') {
        next();
        return;
      }

      if (!status.enabled) {
        res.status(503).json({
          success: false,
          error: 'Memory system is disabled in this environment.',
          details: status,
        });
        return;
      }

      if (status.state !== 'connected') {
        res.status(503).json({
          success: false,
          error: status.required
            ? 'Memory system is required but unavailable.'
            : 'Memory system is currently unavailable.',
          details: status,
        });
        return;
      }

      next();
    },
    memoryRoutes
  );
}

function registerMetricsRoutes(app: Application): void {
  // Metrics Dashboard endpoints (protected)
  app.get('/api/metrics/snapshot', authMiddleware, metricsController.getSnapshot.bind(metricsController));
  app.get('/api/metrics/latest', authMiddleware, metricsController.getLatest.bind(metricsController));
  app.get('/api/metrics/range', authMiddleware, metricsController.getRange.bind(metricsController));
  app.get('/api/metrics/database', authMiddleware, metricsController.getDatabaseMetrics.bind(metricsController));
  app.get('/api/metrics/redis', authMiddleware, metricsController.getRedisMetrics.bind(metricsController));
  app.get('/api/metrics/queue', authMiddleware, metricsController.getQueueMetrics.bind(metricsController));
  app.get('/api/metrics/api', authMiddleware, metricsController.getApiMetrics.bind(metricsController));
  app.get('/api/metrics/resources', authMiddleware, metricsController.getResourceMetrics.bind(metricsController));
  app.get('/api/metrics/gemini', authMiddleware, metricsController.getGeminiMetrics.bind(metricsController));
  app.get('/api/metrics/report', authMiddleware, metricsController.generateReport.bind(metricsController));
  app.get('/api/metrics/health', authMiddleware, metricsController.getHealth.bind(metricsController));
  app.get('/api/metrics/dashboard', authMiddleware, metricsController.getDashboardSummary.bind(metricsController));

  // Cache-specific Metrics endpoints (protected)
  app.get('/api/metrics/cache/snapshot', authMiddleware, metricsController.getCacheSnapshot.bind(metricsController));
  app.get('/api/metrics/cache/realtime', authMiddleware, metricsController.getCacheRealtime.bind(metricsController));
  app.get('/api/metrics/cache/health', authMiddleware, metricsController.getCacheHealth.bind(metricsController));
  app.get('/api/metrics/cache/report', authMiddleware, metricsController.getCacheReport.bind(metricsController));

  // APM (Application Performance Monitoring) endpoints (protected)
  app.get('/api/metrics/apm/dashboard', authMiddleware, metricsController.getApmDashboard.bind(metricsController));
  app.get('/api/metrics/apm/config', authMiddleware, metricsController.getApmConfig.bind(metricsController));
  app.post('/api/metrics/apm/reset', authMiddleware, csrfProtection, metricsController.resetApmMetrics.bind(metricsController));
  app.get('/api/metrics/apm/alerts', authMiddleware, metricsController.getApmAlerts.bind(metricsController));
}

function registerWafRoutes(app: Application): void {
  // WAF Management endpoints (protected - admin only)
  app.get('/api/waf/stats', authMiddleware, (_req, res) => {
    try {
      const stats = getWAFStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      logger.error('Failed to get WAF stats:', error);
      res.status(500).json({ success: false, error: 'Failed to retrieve WAF stats' });
    }
  });

  app.get('/api/waf/events', authMiddleware, (req, res) => {
    try {
      const limit = parseInt(req.query['limit'] as string) || 100;
      const events = getWAFEvents(limit);
      res.json({ success: true, data: events });
    } catch (error) {
      logger.error('Failed to get WAF events:', error);
      res.status(500).json({ success: false, error: 'Failed to retrieve WAF events' });
    }
  });

  app.get('/api/waf/config', authMiddleware, (_req, res) => {
    try {
      const config = getWAFConfig();
      res.json({ success: true, data: config });
    } catch (error) {
      logger.error('Failed to get WAF config:', error);
      res.status(500).json({ success: false, error: 'Failed to retrieve WAF config' });
    }
  });

  app.put('/api/waf/config', authMiddleware, csrfProtection, (req, res) => {
    try {
      const validation = wafConfigUpdateSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ success: false, error: 'Invalid WAF config' });
        return;
      }

      updateWAFConfig(validation.data as Partial<WAFConfig>);
      res.json({ success: true, message: 'WAF configuration updated' });
    } catch {
      logger.error('Failed to update WAF config');
      res.status(500).json({ success: false, error: 'Failed to update WAF config' });
    }
  });

  app.get('/api/waf/blocked-ips', authMiddleware, (_req, res) => {
    try {
      const ips = getBlockedIPs();
      res.json({ success: true, data: ips });
    } catch (error) {
      logger.error('Failed to get blocked IPs:', error);
      res.status(500).json({ success: false, error: 'Failed to retrieve blocked IPs' });
    }
  });

  app.post('/api/waf/block-ip', authMiddleware, csrfProtection, (req, res): void => {
    try {
      const validation = wafIpBodySchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ success: false, error: 'IP address required' });
        return;
      }
      const { ip, reason } = validation.data;
      blockIP(ip, reason);
      res.json({ success: true, message: `IP ${ip} blocked successfully` });
    } catch (error) {
      logger.error('Failed to block IP:', error);
      res.status(500).json({ success: false, error: 'Failed to block IP' });
    }
  });

  app.post('/api/waf/unblock-ip', authMiddleware, csrfProtection, (req, res): void => {
    try {
      const validation = wafIpBodySchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ success: false, error: 'IP address required' });
        return;
      }
      const { ip } = validation.data;
      unblockIP(ip);
      res.json({ success: true, message: `IP ${ip} unblocked successfully` });
    } catch (error) {
      logger.error('Failed to unblock IP:', error);
      res.status(500).json({ success: false, error: 'Failed to unblock IP' });
    }
  });
}
