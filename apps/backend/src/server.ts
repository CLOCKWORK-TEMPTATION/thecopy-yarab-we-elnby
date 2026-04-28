import "./bootstrap/runtime-alias";

import { createServer } from "http";

import cookieParser from "cookie-parser";
import express, { Application } from "express";

import { initializeSentry } from "@/config/sentry";
import { initTracing } from "@/config/tracing";
import { AnalysisController } from "@/controllers/analysis.controller";
import { HealthController } from "@/controllers/health.controller";
import { logger } from "@/lib/logger";
import { setupMiddleware } from "@/middleware";
import {
  cspMiddleware,
  securityHeadersMiddleware,
} from "@/middleware/csp.middleware";
import { csrfProtection } from "@/middleware/csrf.middleware";
import { metricsMiddleware } from "@/middleware/metrics.middleware";
import {
  logAuthAttempts,
  logRateLimitViolations,
} from "@/middleware/security-logger.middleware";
import { trackError, trackPerformance } from "@/middleware/sentry.middleware";
import { sloMetricsMiddleware } from "@/middleware/slo-metrics.middleware";
import { wafMiddleware } from "@/middleware/waf.middleware";
import { breakappGateway } from "@/modules/breakapp/gateway";
import { websocketService } from "@/services/websocket.service";

import {
  bootstrapServer,
  isServerEntryProcess,
  shutdownGracefully,
} from "./server/bootstrap";
import { csrfOriginRefererValidator } from "./server/csrf-origin-validator";
import { registerAllRoutes } from "./server/route-registrars";
import { resolveTrustProxySetting } from "./server/trust-proxy";

import type { Server } from "http";

// Initialize OpenTelemetry tracing before application setup.
initTracing();

// Initialize Sentry monitoring (must be first)
initializeSentry();

const app: Application = express();
app.set("trust proxy", resolveTrustProxySetting());

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

// codeql[js/missing-token-validation]
app.use(cookieParser());

// CSRF Protection - Implements Double Submit Cookie pattern
// SECURITY: This middleware provides CSRF protection by:
// 1. Setting CSRF tokens in cookies for GET requests (via setCsrfToken)
// 2. Validating CSRF tokens in headers for state-changing requests (via csrfProtection)
// 3. Additional Origin/Referer header validation for browser-based requests
app.use(csrfProtection);

// Additional CSRF Protection - validates Origin/Referer for state-changing requests
// SECURITY: This middleware runs AFTER csrfProtection to add an additional layer
app.use(csrfOriginRefererValidator);

// Setup middleware
setupMiddleware(app);

// Initialize WebSocket service
try {
  websocketService.initialize(httpServer);
  logger.info("WebSocket service initialized");
  const io = websocketService.getIO();
  if (io) {
    breakappGateway.attach(io);
  }
} catch (error) {
  logger.error("Failed to initialize WebSocket service:", error);
}

// Register all API routes (health, auth, analysis, projects, AI, breakdown, queue,
// metrics, WAF, workflow, memory, ...)
registerAllRoutes(app, { analysisController, healthController });

if (isServerEntryProcess()) {
  void bootstrapServer(app, httpServer);
}

process.on("SIGTERM", () => {
  void shutdownGracefully("SIGTERM");
});

process.on("SIGINT", () => {
  void shutdownGracefully("SIGINT");
});

export { app, httpServer };
