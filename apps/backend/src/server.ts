import './bootstrap/runtime-alias';

// Initialize OpenTelemetry tracing (MUST be before any other imports)
import { initTracing } from '@/config/tracing';
initTracing();

import express, { Application } from 'express';
import { createServer } from 'http';
import type { Server } from 'http';
import { createServer as createNetServer } from 'net';
import { z } from 'zod';
import cookieParser from 'cookie-parser';
import { env } from '@/config/env';
import { initializeSentry } from '@/config/sentry';
import { setupMiddleware, errorHandler, perUserAiLimiter } from '@/middleware';
import { sentryErrorHandler, trackError, trackPerformance } from '@/middleware/sentry.middleware';
import { logAuthAttempts, logRateLimitViolations } from '@/middleware/security-logger.middleware';
import { wafMiddleware, getWAFStats, getWAFEvents, blockIP, unblockIP, getBlockedIPs, updateWAFConfig, getWAFConfig } from '@/middleware/waf.middleware';
import { metricsMiddleware, metricsEndpoint } from '@/middleware/metrics.middleware';
import { csrfProtection } from '@/middleware/csrf.middleware';
import { cspMiddleware, securityHeadersMiddleware } from '@/middleware/csp.middleware';
import { AnalysisController } from '@/controllers/analysis.controller';
import { HealthController } from '@/controllers/health.controller';
import { authController } from '@/controllers/auth.controller';
import { projectsController } from '@/controllers/projects.controller';
import { scenesController } from '@/controllers/scenes.controller';
import { charactersController } from '@/controllers/characters.controller';
import { shotsController } from '@/controllers/shots.controller';
import { aiController } from '@/controllers/ai.controller';
import { actorAiController } from '@/controllers/actorai.controller';
import { breakdownController } from '@/controllers/breakdown.controller';
import { authMiddleware } from '@/middleware/auth.middleware';
import { actorAiService } from '@/services/actorai.service';
import { logger } from '@/utils/logger';
import { closeDatabase, initializeDatabase, databaseAvailable } from '@/db';

import { initializeWorkers, shutdownQueues } from '@/queues';
import { setupBullBoard, getAuthenticatedBullBoardRouter } from '@/middleware/bull-board.middleware';
import { isRedisEnabled } from '@/config/redis-gate';
import { checkRedisHealth } from '@/utils/redis-health';
import { queueController } from '@/controllers/queue.controller';
import { metricsController } from '@/controllers/metrics.controller';
import { critiqueController } from '@/controllers/critique.controller';
import { appStateController } from '@/controllers/appState.controller';
import { budgetController } from '@/controllers/budget.controller';
import { brainstormController } from '@/controllers/brainstorm.controller';
import { workflowController } from '@/controllers/workflow.controller';
import { styleistController } from '@/controllers/styleist.controller';
import { cineAIController } from '@/controllers/cineai.controller';
import { websocketService } from '@/services/websocket.service';
import { sseService } from '@/services/sse.service';
import { breakappRouter } from '@/modules/breakapp/routes';
import { artDirectorRouter } from '@/modules/art-director/routes';
import styleistRouter from '@/modules/styleist/routes';
import { memoryHealthHandler, memoryRoutes, weaviateStore } from '@/memory';
import { registerEditorRuntimeRoutes } from '@/editor/runtime';

// Initialize Sentry monitoring (must be first)
initializeSentry();

const wafIpBodySchema = z.object({
  ip: z.string().min(1),
  reason: z.string().optional(),
}).passthrough();

function resolveTrustProxySetting(): boolean | number | string {
  const configuredValue = process.env['TRUST_PROXY']?.trim();

  if (!configuredValue) {
    return env.NODE_ENV === 'production' ? 1 : false;
  }

  if (configuredValue === 'true') {
    return true;
  }

  if (configuredValue === 'false') {
    return false;
  }

  const numericValue = Number(configuredValue);
  if (Number.isInteger(numericValue) && numericValue >= 0) {
    return numericValue;
  }

  return configuredValue;
}

const app: Application = express();
app.set('trust proxy', resolveTrustProxySetting());

// Create HTTP server for WebSocket integration
const httpServer: Server = createServer(app);
const analysisController = new AnalysisController();
const healthController = new HealthController();

// Sentry error tracking and performance monitoring
app.use(trackError);
app.use(trackPerformance);

// Prometheus metrics tracking
app.use(metricsMiddleware);

// SLO Metrics tracking (Availability, Latency, Error Budget)
import { sloMetricsMiddleware } from '@/middleware/slo-metrics.middleware';
app.use(sloMetricsMiddleware);

// WAF (Web Application Firewall) - must be early in the chain
app.use(wafMiddleware);

// CSP + Security Headers - بعد WAF وقبل CSRF
app.use(cspMiddleware);
app.use(securityHeadersMiddleware);

// Security logging middleware
app.use(logAuthAttempts);
app.use(logRateLimitViolations);

// Initialize cookie parser (required for CSRF token cookie handling)
// SECURITY: cookieParser is required before csrfProtection middleware below
app.use(cookieParser());

// CSRF Protection - Implements Double Submit Cookie pattern
// SECURITY: This middleware provides CSRF protection by:
// 1. Setting CSRF tokens in cookies for GET requests (via setCsrfToken)
// 2. Validating CSRF tokens in headers for state-changing requests (via csrfProtection)
// 3. Additional Origin/Referer header validation for browser-based requests
app.use(csrfProtection);

// Additional CSRF Protection - validates Origin/Referer for state-changing requests
// This provides defense-in-depth alongside the token-based csrfProtection middleware
// SECURITY: This middleware runs AFTER csrfProtection to add an additional layer
app.use((req, res, next): void => {
  // Only check state-changing methods
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    next();
    return;
  }

  // Skip for health endpoints and metrics
  const safePaths = ['/health', '/api/health', '/metrics'];
  if (safePaths.some(path => req.path.startsWith(path))) {
    next();
    return;
  }

  const origin = req.get('Origin');
  const referer = req.get('Referer');
  const contentType = req.get('Content-Type') || '';
  const userAgent = req.get('User-Agent') || '';

  // SECURITY: بناء مجموعة origins المسموح بها مُطبّعة عبر URL parsing
  // تمنع المطابقة الحرفية عبر startsWith التي كانت عرضة لهجمات من نوع
  // "http://localhost:5000EVIL.com" تُطابق "http://localhost:5000"
  const rawAllowed = [
    ...env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean),
    'http://localhost:5000',
    'http://localhost:3000',
    `http://localhost:${env.PORT}`,
  ];

  const allowedOriginSet = new Set<string>();
  for (const entry of rawAllowed) {
    try {
      const parsed = new URL(entry);
      allowedOriginSet.add(`${parsed.protocol}//${parsed.host}`);
    } catch {
      // تجاهل المدخلات التي لا تُحلَّل كعنوان URL صالح
    }
  }

  // SECURITY: تحليل origin الوارد عبر URL constructor ومقارنته بالمجموعة بالمساواة الصارمة فقط
  const parseOriginStrict = (candidate: string): string | null => {
    try {
      const parsed = new URL(candidate);
      return `${parsed.protocol}//${parsed.host}`;
    } catch {
      return null;
    }
  };

  // SECURITY: Require Origin or Referer for state-changing requests
  if (!origin && !referer) {
    const isBrowserRequest =
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data') ||
      (contentType.includes('application/json') && userAgent.toLowerCase().includes('mozilla'));

    if (isBrowserRequest) {
      const sanitizedPath = req.path.replace(/[^\w\-\/]/g, '');
      const sanitizedMethod = req.method.replace(/[^A-Z]/g, '');
      logger.warn('CSRF: Missing Origin/Referer', {
        path: sanitizedPath,
        method: sanitizedMethod,
      });
      res.status(403).json({
        success: false,
        error: 'طلب غير مصرح به',
        code: 'CSRF_MISSING_ORIGIN'
      });
      return;
    }
    next();
    return;
  }

  // Validate Origin بالمساواة الصارمة على protocol+host بعد URL parsing
  if (origin) {
    const normalizedOrigin = parseOriginStrict(origin);
    if (!normalizedOrigin || !allowedOriginSet.has(normalizedOrigin)) {
      const sanitizedOrigin = origin.replace(/[^\w\-\:\.]/g, '');
      logger.warn('CSRF: Origin mismatch', { origin: sanitizedOrigin });
      res.status(403).json({
        success: false,
        error: 'طلب غير مصرح به',
        code: 'CSRF_ORIGIN_MISMATCH'
      });
      return;
    }
  }

  // Validate Referer بنفس الأسلوب المُحكم عند غياب Origin
  if (!origin && referer) {
    const refererOrigin = parseOriginStrict(referer);
    if (!refererOrigin) {
      logger.warn('CSRF: Invalid Referer URL');
      res.status(403).json({
        success: false,
        error: 'طلب غير مصرح به',
        code: 'CSRF_INVALID_REFERER'
      });
      return;
    }
    if (!allowedOriginSet.has(refererOrigin)) {
      const sanitizedReferer = refererOrigin.replace(/[^\w\-\:\.]/g, '');
      logger.warn('CSRF: Referer mismatch', { referer: sanitizedReferer });
      res.status(403).json({
        success: false,
        error: 'طلب غير مصرح به',
        code: 'CSRF_REFERER_MISMATCH'
      });
      return;
    }
  }

  // Origin/Referer validation passed
  next();
});

// Setup middleware
setupMiddleware(app);


// Initialize WebSocket service
try {
  websocketService.initialize(httpServer);
  logger.info('WebSocket service initialized');
} catch (error) {
  logger.error('Failed to initialize WebSocket service:', error);
}



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

// Auth endpoints (public) - CSRF token is set after successful authentication
app.post('/api/auth/signup', authController.signup.bind(authController));
app.post('/api/auth/login', authController.login.bind(authController));
app.post('/api/auth/logout', csrfProtection, authController.logout.bind(authController));
app.post('/api/auth/refresh', csrfProtection, authController.refresh.bind(authController));
app.get('/api/auth/me', authMiddleware, authController.getCurrentUser.bind(authController));

// Zero-Knowledge Auth endpoints (public)
import { zkSignup, zkLoginInit, zkLoginVerify, manageRecoveryArtifact } from '@/controllers/zkAuth.controller';
app.post('/api/auth/zk-signup', zkSignup);
app.post('/api/auth/zk-login-init', zkLoginInit);
app.post('/api/auth/zk-login-verify', zkLoginVerify);
app.post('/api/auth/recovery', authMiddleware, csrfProtection, manageRecoveryArtifact);

// Seven Stations Pipeline endpoints (protected)
app.post('/api/analysis/seven-stations', authMiddleware, perUserAiLimiter, csrfProtection, analysisController.runSevenStationsPipeline.bind(analysisController));
app.get('/api/analysis/stations-info', authMiddleware, analysisController.getStationDetails.bind(analysisController));

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
import { createEncryptedDocument, getEncryptedDocument, updateEncryptedDocument, deleteEncryptedDocument, listEncryptedDocuments } from '@/controllers/encryptedDocs.controller';
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
    const limit = parseInt(req.query["limit"] as string) || 100;
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
    updateWAFConfig(req.body);
    res.json({ success: true, message: 'WAF configuration updated' });
  } catch (error) {
    logger.error('Failed to update WAF config:', error);
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

// Workflow execution endpoints
app.get('/api/workflow/presets', authMiddleware, workflowController.listPresets.bind(workflowController));
app.get('/api/workflow/presets/:preset', authMiddleware, workflowController.getPreset.bind(workflowController));
app.post('/api/workflow/execute', authMiddleware, csrfProtection, workflowController.execute.bind(workflowController));
app.post('/api/workflow/execute-custom', authMiddleware, csrfProtection, workflowController.executeCustom.bind(workflowController));

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

// Start server with automatic port fallback if the selected port is in use
let runningServer: Server | null = null;
const startPort = Number(process.env['PORT']) || env.PORT;
const DEVELOPMENT_PRIMARY_PORT_WAIT_MS =
  env.NODE_ENV === 'development' ? 10_000 : 0;
const PORT_PROBE_INTERVAL_MS = 250;
const OPTIONAL_BOOTSTRAP_TIMEOUT_MS =
  env.NODE_ENV === 'development' ? 15_000 : 30_000;

function probePortAvailability(port: number): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const probe = createNetServer();

    probe.once('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        resolve(false);
        return;
      }
      reject(error);
    });

    probe.once('listening', () => {
      probe.close((closeError?: Error) => {
        if (closeError) {
          reject(closeError);
          return;
        }
        resolve(true);
      });
    });

    probe.listen(port, '0.0.0.0');
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function withBootstrapTimeout<T>(
  promise: Promise<T>,
  label: string
): Promise<T> {
  let timer: NodeJS.Timeout | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(
            new Error(
              `${label} timed out after ${OPTIONAL_BOOTSTRAP_TIMEOUT_MS}ms.`
            )
          );
        }, OPTIONAL_BOOTSTRAP_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

async function waitForPortAvailability(
  port: number,
  timeoutMs: number
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await probePortAvailability(port)) {
      return true;
    }
    await delay(PORT_PROBE_INTERVAL_MS);
  }

  return probePortAvailability(port);
}

async function resolveListeningPort(initialPort: number): Promise<number> {
  let candidatePort = initialPort;

  for (;;) {
    const available = await probePortAvailability(candidatePort);
    if (available) {
      return candidatePort;
    }

    if (
      candidatePort === initialPort &&
      DEVELOPMENT_PRIMARY_PORT_WAIT_MS > 0
    ) {
      logger.warn(
        `Port ${candidatePort} is in use. Waiting for the dev restart window to release it...`
      );
      const becameAvailable = await waitForPortAvailability(
        candidatePort,
        DEVELOPMENT_PRIMARY_PORT_WAIT_MS
      );
      if (becameAvailable) {
        return candidatePort;
      }
    }

    const nextPort = candidatePort + 1;
    logger.warn(`Port ${candidatePort} is in use. Trying ${nextPort}...`);
    candidatePort = nextPort;
  }
}

async function startListening(port: number): Promise<void> {
  const listeningPort = await resolveListeningPort(port);

  await new Promise<void>((resolve, reject) => {
    const onError = (error: NodeJS.ErrnoException) => {
      httpServer.off('listening', onListening);
      reject(error);
    };

    const onListening = () => {
      httpServer.off('error', onError);
      resolve();
    };

    httpServer.once('error', onError);
    httpServer.once('listening', onListening);
    httpServer.listen(listeningPort, '0.0.0.0');
  });

  runningServer = httpServer;
  logger.info(`Server running on port ${listeningPort}`, {
    environment: env.NODE_ENV,
    port: listeningPort,
    websocket: 'enabled',
    sse: 'enabled',
  });
}

async function bootstrapServer(): Promise<void> {
  try {
    const startupWarnings: string[] = [];

    try {
      await initializeDatabase();
      if (databaseAvailable) {
        logger.info('Database schema is ready');
      } else {
        const message =
          'Database is unavailable. Backend will continue in degraded mode until PostgreSQL becomes reachable.';
        startupWarnings.push(message);
        logger.warn(message);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Database initialization failed.';
      startupWarnings.push(message);
      logger.warn('Database initialization failed; continuing in degraded mode', {
        errorMessage: message,
      });
    }

    // Redis pre-check
    if (isRedisEnabled()) {
      const redisOk = await checkRedisHealth();
      if (!redisOk) {
        const message =
          'Redis is required but not reachable. Queue workers and Bull Board are disabled until Redis becomes available.';
        startupWarnings.push(message);
        logger.warn(message);
      } else {
        logger.info('Redis is reachable');

        // Initialize background job workers (BullMQ) — only when Redis is available
        try {
          await initializeWorkers();
          logger.info('Background job workers initialized');
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : 'Failed to initialize job workers.';
          startupWarnings.push(message);
          logger.error('Failed to initialize job workers:', error);
        }

        // Setup Bull Board dashboard for queue monitoring (with authentication)
        try {
          setupBullBoard();
          const authenticatedBullBoardRouter = getAuthenticatedBullBoardRouter();
          app.use('/admin/queues', authenticatedBullBoardRouter);
          logger.info(
            'Bull Board dashboard available at /admin/queues (authenticated)'
          );
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : 'Failed to setup Bull Board.';
          startupWarnings.push(message);
          logger.error('Failed to setup Bull Board:', error);
        }
      }
    } else {
      logger.info('Queue workers skipped — Redis is disabled');
    }

    try {
      await withBootstrapTimeout(
        registerEditorRuntimeRoutes(app),
        'Editor runtime route registration'
      );
      logger.info('Editor runtime routes mounted through apps/backend');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to register editor runtime routes.';
      startupWarnings.push(message);
      logger.error('Failed to register editor runtime routes:', error);
    }

    try {
      await withBootstrapTimeout(
        weaviateStore.bootstrap(),
        'Weaviate bootstrap'
      );
      logger.info('Weaviate bootstrap evaluated', weaviateStore.getStatus());

      const weaviateStatus = weaviateStore.getStatus();
      if (weaviateStatus.required && weaviateStatus.state !== 'connected') {
        const message =
          'Weaviate is required but not available. Memory routes will stay degraded until connectivity is restored.';
        startupWarnings.push(message);
        logger.warn(message, weaviateStatus);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Weaviate bootstrap failed.';
      startupWarnings.push(message);
      logger.error('Weaviate bootstrap failed:', error);
    }

    // 404 handler
    app.use((_req, res) => {
      res.status(404).json({
        success: false,
        error: 'المسار غير موجود',
      });
    });

    // Sentry error handler (must be before other error handlers)
    app.use(sentryErrorHandler);

    // Error handling middleware (must be last)
    app.use(errorHandler);

    await startListening(startPort);

    if (startupWarnings.length > 0) {
      logger.warn('Backend started in degraded mode', {
        issues: startupWarnings,
      });
    }
  } catch (error) {
    logger.error('Failed to bootstrap backend server', {
      ...(error instanceof Error
        ? {
            errorMessage: error.message,
            errorName: error.name,
            errorStack: error.stack,
          }
        : {
            error,
          }),
    });
    process.exit(1);
  }
}

const isServerEntryProcess = (): boolean => {
  const serverEntrypointPattern = /(?:^|[\\/])server\.(?:ts|js)$/;
  return process.argv.some((arg) => serverEntrypointPattern.test(String(arg)));
};

if (isServerEntryProcess()) {
  void bootstrapServer();
}

// Graceful shutdown
process.on('SIGTERM', async (): Promise<void> => {
  logger.info('SIGTERM received, shutting down gracefully');

  // Shutdown real-time services
  try {
    sseService.shutdown();
    await websocketService.shutdown();
    logger.info('Real-time services shut down');
  } catch (error) {
    logger.error('Error shutting down real-time services:', error);
  }

  // Close queues
  try {
    await shutdownQueues();
  } catch (error) {
    logger.error('Error shutting down queues:', error);
  }

  // Disconnect Weaviate
  try {
    await weaviateStore.disconnect();
    logger.info('Weaviate disconnected');
  } catch (error) {
    logger.error('Error disconnecting Weaviate:', error);
  }

  // Close database connections
  await closeDatabase();

  if (runningServer) {
    runningServer.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

process.on('SIGINT', async (): Promise<void> => {
  logger.info('SIGINT received, shutting down gracefully');

  // Shutdown real-time services
  try {
    sseService.shutdown();
    await websocketService.shutdown();
    logger.info('Real-time services shut down');
  } catch (error) {
    logger.error('Error shutting down real-time services:', error);
  }

  // Close queues
  try {
    await shutdownQueues();
  } catch (error) {
    logger.error('Error shutting down queues:', error);
  }

  // Disconnect Weaviate
  try {
    await weaviateStore.disconnect();
    logger.info('Weaviate disconnected');
  } catch (error) {
    logger.error('Error disconnecting Weaviate:', error);
  }

  // Close database connections
  await closeDatabase();

  if (runningServer) {
    runningServer.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

export { app, httpServer };
export default app;


