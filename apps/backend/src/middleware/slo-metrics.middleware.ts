/**
 * SLO Metrics Middleware
 *
 * Provides Service Level Objective (SLO) metrics tracking for:
 * - API Availability (99.9% target)
 * - API Latency P95 (<500ms target)
 * - Auth Success Rate (99.5% target)
 * - Gemini Success Rate (95% target)
 * - Database Availability (99.95% target)
 */

import { Request, Response, NextFunction } from "express";
import { Counter, Gauge } from "prom-client";

import { logger } from "@/lib/logger";

import { register } from "./metrics.middleware";

// ===== SLO Configuration =====

export const SLO_TARGETS = {
  api: {
    availability: 0.999, // 99.9%
    latencyP95Ms: 500, // 500ms
  },
  auth: {
    successRate: 0.995, // 99.5%
  },
  gemini: {
    successRate: 0.95, // 95%
  },
  database: {
    availability: 0.9995, // 99.95%
  },
} as const;

// Monthly budget in minutes (30 days * 24 hours * 60 minutes = 43,200 minutes)
const MONTHLY_MINUTES = 30 * 24 * 60;

export const ERROR_BUDGETS = {
  api: {
    availability: (1 - SLO_TARGETS.api.availability) * MONTHLY_MINUTES, // 43.2 minutes
  },
  auth: {
    successRate: (1 - SLO_TARGETS.auth.successRate) * MONTHLY_MINUTES, // 216 minutes
  },
  gemini: {
    successRate: (1 - SLO_TARGETS.gemini.successRate) * MONTHLY_MINUTES, // 2,160 minutes
  },
  database: {
    availability: (1 - SLO_TARGETS.database.availability) * MONTHLY_MINUTES, // 21.6 minutes
  },
} as const;

// ===== SLO Metrics =====

/**
 * SLO compliance ratio (0-1)
 * Indicates current compliance with SLO target
 */
export const sloComplianceRatio = new Gauge({
  name: "the_copy_slo_compliance_ratio",
  help: "Current SLO compliance ratio (0-1)",
  labelNames: ["service", "sli"],
  registers: [register],
});

/**
 * Error budget remaining ratio (0-1)
 * Indicates remaining error budget for the current period
 */
export const sloErrorBudgetRemainingRatio = new Gauge({
  name: "the_copy_slo_error_budget_remaining_ratio",
  help: "Remaining error budget ratio (0-1)",
  labelNames: ["service", "sli"],
  registers: [register],
});

/**
 * SLO violations counter
 * Counts the number of SLO violations
 */
export const sloViolationsTotal = new Counter({
  name: "the_copy_slo_violations_total",
  help: "Total number of SLO violations",
  labelNames: ["service", "sli", "severity"],
  registers: [register],
});

/**
 * Auth login attempts counter for SLO tracking
 */
export const sloAuthLoginsTotal = new Counter({
  name: "the_copy_slo_auth_logins_total",
  help: "Total number of authentication login attempts",
  labelNames: ["status"],
  registers: [register],
});

/**
 * Database queries counter with status for SLO tracking
 */
export const sloDbQueriesTotal = new Counter({
  name: "the_copy_slo_db_queries_total",
  help: "Total number of database queries with status",
  labelNames: ["status", "operation"],
  registers: [register],
});

/**
 * Error budget burn rate
 * Measures how fast the error budget is being consumed
 */
export const sloErrorBudgetBurnRate = new Gauge({
  name: "the_copy_slo_error_budget_burn_rate",
  help: "Error budget burn rate (errors per hour)",
  labelNames: ["service"],
  registers: [register],
});

/**
 * SLO target gauge (for reference in dashboards)
 */
export const sloTargetGauge = new Gauge({
  name: "the_copy_slo_target",
  help: "SLO target value",
  labelNames: ["service", "sli"],
  registers: [register],
});

// ===== SLO Tracking State =====

interface SLOState {
  windowStart: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  latencies: number[];
}

const sloState: Record<string, SLOState> = {
  api: {
    windowStart: Date.now(),
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    latencies: [],
  },
  auth: {
    windowStart: Date.now(),
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    latencies: [],
  },
  gemini: {
    windowStart: Date.now(),
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    latencies: [],
  },
  database: {
    windowStart: Date.now(),
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    latencies: [],
  },
};

// Window size for SLO calculation (5 minutes)
const SLO_WINDOW_MS = 5 * 60 * 1000;

const LONG_RUNNING_API_PATHS = new Set([
  "/health/ready",
  "/health/detailed",
  "/api/export/pdfa",
  "/api/file-extract",
  "/api/files/extract",
  "/api/text-extract",
  "/api/final-review",
  "/api/suspicion-review",
]);

const LONG_RUNNING_API_LATENCY_TARGET_MS = 30_000;

function getLatencyTargetMs(path: string): number {
  return LONG_RUNNING_API_PATHS.has(path)
    ? LONG_RUNNING_API_LATENCY_TARGET_MS
    : SLO_TARGETS.api.latencyP95Ms;
}

function shouldTrackLatencySLO(path: string): boolean {
  return !LONG_RUNNING_API_PATHS.has(path);
}

// ===== Initialize SLO Targets =====

function initializeSLOTargets() {
  sloTargetGauge.set(
    { service: "api", sli: "availability" },
    SLO_TARGETS.api.availability,
  );
  sloTargetGauge.set(
    { service: "api", sli: "latency_p95" },
    SLO_TARGETS.api.latencyP95Ms,
  );
  sloTargetGauge.set(
    { service: "auth", sli: "success_rate" },
    SLO_TARGETS.auth.successRate,
  );
  sloTargetGauge.set(
    { service: "gemini", sli: "success_rate" },
    SLO_TARGETS.gemini.successRate,
  );
  sloTargetGauge.set(
    { service: "database", sli: "availability" },
    SLO_TARGETS.database.availability,
  );
}

initializeSLOTargets();

// ===== SLO Calculation Functions =====

/**
 * Reset SLO state for a service if window has expired
 */
function resetWindowIfNeeded(service: string) {
  const state = sloState[service];
  if (!state) return;

  const now = Date.now();
  if (now - state.windowStart >= SLO_WINDOW_MS) {
    state.windowStart = now;
    state.totalRequests = 0;
    state.successfulRequests = 0;
    state.failedRequests = 0;
    state.latencies = [];
  }
}

/**
 * Calculate P95 latency from collected samples
 */
function calculateP95(latencies: number[]): number {
  if (latencies.length === 0) return 0;

  const sorted = [...latencies].sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * 0.95) - 1;
  return sorted[Math.max(0, index)] ?? 0;
}

/**
 * Update SLO compliance metrics
 */
function updateComplianceMetrics(
  service: string,
  sli: string,
  compliance: number,
) {
  sloComplianceRatio.set({ service, sli }, compliance);

  // Check for SLO violation
  const target =
    service === "api" && sli === "availability"
      ? SLO_TARGETS.api.availability
      : service === "api" && sli === "latency_p95"
        ? 1 // Latency is inverted
        : service === "auth"
          ? SLO_TARGETS.auth.successRate
          : service === "gemini"
            ? SLO_TARGETS.gemini.successRate
            : service === "database"
              ? SLO_TARGETS.database.availability
              : 0;

  if (compliance < target) {
    const severity = compliance < target * 0.9 ? "critical" : "warning";
    sloViolationsTotal.inc({ service, sli, severity });
  }
}

// ===== SLO Tracking Functions =====

/**
 * Track API request for SLO
 */
export function trackAPIRequest(
  statusCode: number,
  latencyMs: number,
  trackLatency = true,
) {
  resetWindowIfNeeded("api");

  const state = sloState["api"]!;
  state.totalRequests++;

  if (trackLatency) {
    state.latencies.push(latencyMs);
  }

  // 5xx errors count as failures for availability
  if (statusCode >= 500) {
    state.failedRequests++;
  } else {
    state.successfulRequests++;
  }

  // Update availability compliance
  if (state.totalRequests > 0) {
    const availability = state.successfulRequests / state.totalRequests;
    updateComplianceMetrics("api", "availability", availability);
  }

  // Update latency compliance for request/response endpoints.
  if (trackLatency) {
    const p95 = calculateP95(state.latencies);
    const latencyCompliance =
      p95 <= SLO_TARGETS.api.latencyP95Ms
        ? 1
        : SLO_TARGETS.api.latencyP95Ms / p95;
    updateComplianceMetrics("api", "latency_p95", latencyCompliance);
  }

  // Update error budget
  if (state.totalRequests > 0) {
    const errorRate = state.failedRequests / state.totalRequests;
    const budgetUsed = errorRate / (1 - SLO_TARGETS.api.availability);
    const budgetRemaining = Math.max(0, 1 - budgetUsed);
    sloErrorBudgetRemainingRatio.set(
      { service: "api", sli: "availability" },
      budgetRemaining,
    );

    // Calculate burn rate (errors per hour extrapolated)
    const windowHours = SLO_WINDOW_MS / (60 * 60 * 1000);
    const errorsPerHour = state.failedRequests / windowHours;
    sloErrorBudgetBurnRate.set({ service: "api" }, errorsPerHour);
  }
}

/**
 * Track authentication attempt for SLO
 */
export function trackAuthAttempt(success: boolean) {
  resetWindowIfNeeded("auth");

  const state = sloState["auth"]!;
  state.totalRequests++;

  if (success) {
    state.successfulRequests++;
    sloAuthLoginsTotal.inc({ status: "success" });
  } else {
    state.failedRequests++;
    sloAuthLoginsTotal.inc({ status: "failure" });
  }

  // Update compliance
  if (state.totalRequests > 0) {
    const successRate = state.successfulRequests / state.totalRequests;
    updateComplianceMetrics("auth", "success_rate", successRate);

    // Update error budget
    const errorRate = state.failedRequests / state.totalRequests;
    const budgetUsed = errorRate / (1 - SLO_TARGETS.auth.successRate);
    const budgetRemaining = Math.max(0, 1 - budgetUsed);
    sloErrorBudgetRemainingRatio.set(
      { service: "auth", sli: "success_rate" },
      budgetRemaining,
    );
  }
}

/**
 * Track Gemini API call for SLO
 */
export function trackGeminiCall(success: boolean) {
  resetWindowIfNeeded("gemini");

  const state = sloState["gemini"]!;
  state.totalRequests++;

  if (success) {
    state.successfulRequests++;
  } else {
    state.failedRequests++;
  }

  // Update compliance
  if (state.totalRequests > 0) {
    const successRate = state.successfulRequests / state.totalRequests;
    updateComplianceMetrics("gemini", "success_rate", successRate);

    // Update error budget
    const errorRate = state.failedRequests / state.totalRequests;
    const budgetUsed = errorRate / (1 - SLO_TARGETS.gemini.successRate);
    const budgetRemaining = Math.max(0, 1 - budgetUsed);
    sloErrorBudgetRemainingRatio.set(
      { service: "gemini", sli: "success_rate" },
      budgetRemaining,
    );
  }
}

/**
 * Track database query for SLO
 */
export function trackDatabaseQuery(success: boolean, operation?: string) {
  resetWindowIfNeeded("database");

  const state = sloState["database"]!;
  state.totalRequests++;

  if (success) {
    state.successfulRequests++;
    sloDbQueriesTotal.inc({
      status: "success",
      operation: operation ?? "unknown",
    });
  } else {
    state.failedRequests++;
    sloDbQueriesTotal.inc({
      status: "failure",
      operation: operation ?? "unknown",
    });
  }

  // Update compliance
  if (state.totalRequests > 0) {
    const availability = state.successfulRequests / state.totalRequests;
    updateComplianceMetrics("database", "availability", availability);

    // Update error budget
    const errorRate = state.failedRequests / state.totalRequests;
    const budgetUsed = errorRate / (1 - SLO_TARGETS.database.availability);
    const budgetRemaining = Math.max(0, 1 - budgetUsed);
    sloErrorBudgetRemainingRatio.set(
      { service: "database", sli: "availability" },
      budgetRemaining,
    );
  }
}

// ===== SLO Middleware =====

/**
 * Middleware to track SLO metrics for HTTP requests
 */
export function sloMetricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const startTime = Date.now();

  res.on("finish", () => {
    const latencyMs = Date.now() - startTime;
    const statusCode = res.statusCode;
    const latencyTargetMs = getLatencyTargetMs(req.path);
    const trackLatency = shouldTrackLatencySLO(req.path);

    // Track API SLO
    trackAPIRequest(statusCode, latencyMs, trackLatency);

    // Log SLO violation
    if (statusCode >= 500 || latencyMs > latencyTargetMs * 2) {
      logger.warn("Potential SLO violation detected", {
        path: req.path,
        method: req.method,
        statusCode,
        latencyMs,
        sloLatencyTarget: latencyTargetMs,
        latencySloTracked: trackLatency,
      });
    }
  });

  next();
}

// ===== SLO Status Functions =====

type BudgetStatus = "healthy" | "warning" | "critical" | "exhausted";

function getBudgetStatus(remaining: number): BudgetStatus {
  if (remaining > 0.5) return "healthy";
  if (remaining > 0.25) return "warning";
  if (remaining > 0.1) return "critical";
  return "exhausted";
}

function computeServiceSLO(state: SLOState, target: number) {
  const compliance =
    state.totalRequests > 0
      ? state.successfulRequests / state.totalRequests
      : 1;
  const errorRate =
    state.totalRequests > 0 ? state.failedRequests / state.totalRequests : 0;
  const budgetUsed = errorRate / (1 - target);
  const budgetRemaining = Math.max(0, 1 - budgetUsed);
  return {
    compliance,
    target,
    budgetRemaining,
    status: getBudgetStatus(budgetRemaining),
  };
}

/**
 * Get current SLO status for all services
 */
export function getSLOStatus() {
  const status: Record<
    string,
    {
      compliance: number;
      target: number;
      budgetRemaining: number;
      status: BudgetStatus;
    }
  > = {};

  status["api_availability"] = computeServiceSLO(
    sloState["api"]!,
    SLO_TARGETS.api.availability,
  );
  status["auth_success_rate"] = computeServiceSLO(
    sloState["auth"]!,
    SLO_TARGETS.auth.successRate,
  );
  status["gemini_success_rate"] = computeServiceSLO(
    sloState["gemini"]!,
    SLO_TARGETS.gemini.successRate,
  );
  status["database_availability"] = computeServiceSLO(
    sloState["database"]!,
    SLO_TARGETS.database.availability,
  );

  return status;
}
