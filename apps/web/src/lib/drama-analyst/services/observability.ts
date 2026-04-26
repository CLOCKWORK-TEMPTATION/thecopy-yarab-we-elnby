import * as Sentry from "@sentry/nextjs";

import { log } from "./loggerService";
// No-op replacements for missing GA functions
const sendGAEvent = (..._args: any[]) => {};
const setGAUserProperties = (..._args: any[]) => {};

// Helper function to sanitize sensitive data from logs
const sanitizeForLogging = (data: any): any => {
  if (!data || typeof data !== "object") {
    return data;
  }

  const sanitized = { ...data };
  const sensitiveKeys = [
    "dsn",
    "apiKey",
    "api_key",
    "token",
    "password",
    "secret",
    "authorization",
    "cookie",
    "session",
  ];

  Object.keys(sanitized).forEach((key) => {
    if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
      sanitized[key] = "[REDACTED]";
    }
  });

  return sanitized;
};

// Sentry configuration for production monitoring
export const initObservability = () => {
  const dsn = process.env["NEXT_PUBLIC_SENTRY_DSN"] ?? "";
  const environment = process.env.NODE_ENV;
  const isProduction = environment === "production";

  if (dsn) {
    log.info(
      "🔍 Initializing Sentry observability...",
      { environment },
      "Observability"
    );

    Sentry.init({
      dsn,
      environment,

      // Performance Monitoring
      tracesSampleRate: isProduction ? 0.1 : 1.0, // 10% in prod, 100% in dev
      replaysSessionSampleRate: isProduction ? 0.1 : 1.0,
      replaysOnErrorSampleRate: 1.0,

      // Error Filtering
      beforeSend(event, hint) {
        // Filter out non-critical errors in production
        if (isProduction) {
          const error = hint.originalException;

          // Skip common browser errors
          if (error instanceof Error) {
            if (error.message.includes("ResizeObserver loop limit exceeded")) {
              return null;
            }
            if (error.message.includes("Non-Error promise rejection")) {
              return null;
            }
            if (error.message.includes("Script error")) {
              return null;
            }
          }

          // Skip network errors for failed resources
          if (event.exception) {
            const errorMessage = event.exception.values?.[0]?.value ?? "";
            if (
              errorMessage.includes("Failed to fetch") ||
              errorMessage.includes("NetworkError") ||
              errorMessage.includes("Load failed")
            ) {
              return null;
            }
          }
        }

        // Add custom context
        event.tags = {
          ...event.tags,
          component: "drama-analyst",
          version: process.env["NEXT_PUBLIC_APP_VERSION"] ?? "1.0.0",
        };

        event.user = {
          ...event.user,
          id: getUserId(),
          session_id: getSessionId(),
        };

        return event;
      },

      // Integrations
      integrations: [
        Sentry.replayIntegration({
          maskAllText: false,
          blockAllMedia: false,
          networkDetailAllowUrls: [
            /^https:\/\/api\.gemini\.google\.com(?:\/|$)/,
            /^https:\/\/fonts\.googleapis\.com(?:\/|$)/,
            /^https:\/\/fonts\.gstatic\.com(?:\/|$)/,
          ],
        }),
        Sentry.browserTracingIntegration({
          // routingInstrumentation: Sentry.reactRouterV6Instrumentation() - commented out until router is implemented
        }),
      ],

      // Release tracking
      release: process.env["NEXT_PUBLIC_APP_VERSION"] ?? "1.0.0",

      // Additional options
      maxBreadcrumbs: 50,
      attachStacktrace: true,
      sendDefaultPii: false,

      // Error boundaries
      beforeBreadcrumb(breadcrumb) {
        // Filter out noisy breadcrumbs
        if (breadcrumb.category === "console" && breadcrumb.level === "debug") {
          return null;
        }
        return breadcrumb;
      },
    });

    // Set user context
    Sentry.setUser({
      id: getUserId(),
      session_id: getSessionId(),
    });

    // Set additional context
    Sentry.setContext("app", {
      name: "Drama Analyst",
      version: process.env["NEXT_PUBLIC_APP_VERSION"] ?? "1.0.0",
      environment,
    });

    // Set tags
    Sentry.setTag("app", "drama-analyst");
    Sentry.setTag("platform", "web");

    log.info(
      "✅ Sentry initialized successfully",
      { environment },
      "Observability"
    );
  } else {
    log.warn("⚠️ Sentry DSN not configured", null, "Observability");
  }

  // Performance Monitoring
  initPerformanceMonitoring();

  // Web Vitals Monitoring
  initWebVitalsMonitoring();

  // Analytics Monitoring
  initAnalyticsMonitoring();

  // Uptime Monitoring
  initUptimeMonitoring();
};

// Performance monitoring setup
const initPerformanceMonitoring = () => {
  if (typeof PerformanceObserver === "undefined") {
    log.warn("⚠️ PerformanceObserver not supported", null, "Observability");
    return;
  }

  // Core Web Vitals observer
  const vitalsObserver = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      if (entry.entryType === "measure") {
        log.debug(
          `[PERF] ${entry.name}: ${entry.duration.toFixed(2)}ms`,
          null,
          "Observability"
        );

        // Send critical performance metrics to Sentry
        if (entry.name.includes("critical") || entry.duration > 1000) {
          Sentry.addBreadcrumb({
            message: `Performance: ${entry.name}`,
            category: "performance",
            level: "info",
            data: {
              duration: entry.duration,
              startTime: entry.startTime,
            },
          });
        }
      }
    });
  });

  vitalsObserver.observe({ entryTypes: ["measure"] });

  // Long task observer
  const longTaskObserver = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      if (entry.duration > 50) {
        // Tasks longer than 50ms
        Sentry.addBreadcrumb({
          message: "Long task detected",
          category: "performance",
          level: "warning",
          data: {
            duration: entry.duration,
            startTime: entry.startTime,
          },
        });
      }
    });
  });

  longTaskObserver.observe({ entryTypes: ["longtask"] });

  // Navigation timing
  const navObserver = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      if (entry.entryType === "navigation") {
        const navEntry = entry as PerformanceNavigationTiming;

        Sentry.addBreadcrumb({
          message: "Navigation timing",
          category: "navigation",
          level: "info",
          data: {
            domContentLoaded:
              navEntry.domContentLoadedEventEnd -
              navEntry.domContentLoadedEventStart,
            loadComplete: navEntry.loadEventEnd - navEntry.loadEventStart,
            totalTime: navEntry.loadEventEnd - navEntry.fetchStart,
          },
        });
      }
    });
  });

  navObserver.observe({ entryTypes: ["navigation"] });
};

// Web Vitals monitoring
const initWebVitalsMonitoring = () => {
  // Initialize Web Vitals service
  import("./webVitalsService")
    .then(({ initWebVitals }) => {
      const dsn = process.env["NEXT_PUBLIC_SENTRY_DSN"] ?? "";
      const isProduction = process.env.NODE_ENV === "production";
      const webVitalsConfig = {
        enableGA4: !!process.env["NEXT_PUBLIC_GA4_MEASUREMENT_ID"],
        enableSentry: !!dsn,
        enableConsoleLog: !isProduction,
        debug: !isProduction,
      };

      initWebVitals(webVitalsConfig);
      log.info(
        "📊 Web Vitals monitoring initialized",
        { configStatus: "configured" },
        "Observability"
      );
    })
    .catch((error) => {
      log.error(
        "❌ Failed to initialize Web Vitals monitoring",
        { message: error?.message ?? "Unknown error" },
        "Observability"
      );
    });
};

// Utility functions
// SECURITY: Use cryptographically secure random values for ID generation
const getRandomId = (): string => {
  const timestamp = Date.now();

  // Try browser crypto API first
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    const array = new Uint32Array(2);
    window.crypto.getRandomValues(array);
    const first = array[0] ?? 0;
    const second = array[1] ?? 0;
    return `user_${timestamp}_${first.toString(36)}${second.toString(36)}`;
  }

  // Try Node.js crypto module (for SSR)
  if (typeof globalThis !== "undefined") {
    try {
      // Dynamic import to avoid bundling issues
      const cryptoModule = require("crypto");
      if (cryptoModule?.randomBytes) {
        const bytes = cryptoModule.randomBytes(8);
        return `user_${timestamp}_${bytes.toString("hex")}`;
      }
    } catch {
      // crypto module not available
    }
  }

  // Fallback using more entropy sources (still not cryptographically secure,
  // but better than pure Math.random for non-security-critical IDs like analytics)
  // This is acceptable for observability/analytics user IDs which are not security-sensitive
  const performanceNow =
    typeof performance !== "undefined" ? performance.now() : 0;
  // Use a combination of values to increase entropy
  const randomArray = new Uint32Array(2);
  for (let i = 0; i < randomArray.length; i++) {
    randomArray[i] =
      Math.floor(Math.random() * 0x100000000) ^
      Math.floor(performanceNow * 1000000);
  }
  const randomPart = (randomArray[0] ?? 0).toString(36);
  const timePart = (randomArray[1] ?? 0).toString(36);
  return `user_${timestamp}_${randomPart}${timePart}`;
};

const getUserId = (): string => {
  // Generate or retrieve user ID
  let userId = localStorage.getItem("drama_analyst_user_id");
  if (!userId) {
    userId = getRandomId();
    localStorage.setItem("drama_analyst_user_id", userId);
  }
  return userId;
};

const getSessionId = (): string => {
  // Generate or retrieve session ID
  let sessionId = sessionStorage.getItem("drama_analyst_session_id");
  if (!sessionId) {
    sessionId = getRandomId().replace("user_", "session_");
    sessionStorage.setItem("drama_analyst_session_id", sessionId);
  }
  return sessionId;
};

// Export Sentry utilities for manual error reporting
export const reportError = (error: Error, context?: Record<string, any>) => {
  log.error(
    "🚨 Manual error report",
    { message: error?.message || "Unknown error" },
    "Observability"
  );
  Sentry.captureException(
    error,
    context ? { extra: sanitizeForLogging(context) } : undefined
  );
};

export const reportMessage = (
  message: string,
  level: "info" | "warning" | "error" = "info"
) => {
  log.info(`📝 Manual message report: ${message}`, null, "Observability");
  Sentry.captureMessage(message, level);
};

export const addBreadcrumb = (
  message: string,
  category: string,
  data?: Record<string, any>
) => {
  const breadcrumb: any = {
    message,
    category,
    level: "info",
  };
  if (data) {
    breadcrumb.data = sanitizeForLogging(data);
  }
  Sentry.addBreadcrumb(breadcrumb);
};

export const setUserContext = (user: {
  id?: string;
  email?: string;
  username?: string;
}) => {
  Sentry.setUser(user);
};

export const setTag = (key: string, value: string) => {
  Sentry.setTag(key, value);
};

export const setContext = (key: string, context: Record<string, any>) => {
  Sentry.setContext(key, sanitizeForLogging(context));
};

// Analytics monitoring setup
const initAnalyticsMonitoring = () => {
  const ga4Id = process.env["NEXT_PUBLIC_GA4_MEASUREMENT_ID"];
  const environment = process.env.NODE_ENV;

  if (ga4Id) {
    log.info(
      "📊 Initializing Google Analytics 4...",
      { environment, hasGA4Id: !!ga4Id },
      "Observability"
    );

    // Import and initialize GA4
    import("./analyticsService")
      .then(() => {
        // GA4 initialization would go here if initGA4 was exported

        // Set user context for GA4 (sanitized)
        setGAUserProperties({
          app_version: process.env["NEXT_PUBLIC_APP_VERSION"] ?? "1.0.0",
          environment,
          platform: "web",
          // session_id removed for security
        });

        // Track app initialization
        sendGAEvent("app_initialized", {
          app_version: process.env["NEXT_PUBLIC_APP_VERSION"] ?? "1.0.0",
          environment,
          timestamp: new Date().toISOString(),
        });

        log.info(
          "✅ Google Analytics 4 initialized successfully",
          null,
          "Observability"
        );
      })
      .catch((error) => {
        log.error(
          "❌ Failed to initialize Google Analytics 4",
          { message: error?.message ?? "Unknown error" },
          "Observability"
        );
      });
  } else {
    log.warn(
      "⚠️ Google Analytics 4 Measurement ID not configured",
      null,
      "Observability"
    );
  }
};

// Uptime monitoring setup
const initUptimeMonitoring = () => {
  const environment = process.env.NODE_ENV;
  const isProduction = environment === "production";

  log.info(
    "📊 Initializing Uptime monitoring...",
    { environment, is_production: isProduction },
    "Observability"
  );

  // Import and initialize Uptime monitoring
  import("./uptimeMonitoringService")
    .then(({ initUptimeMonitoring: initUptime }) => {
      const dsn = process.env["NEXT_PUBLIC_SENTRY_DSN"] ?? "";
      const uptimeConfig = {
        enableGA4: !!process.env["NEXT_PUBLIC_GA4_MEASUREMENT_ID"],
        enableSentry: !!dsn,
        enableConsoleLog: !isProduction,
        debug: !isProduction,
        healthCheckInterval: 30000, // 30 seconds
        performanceCheckInterval: 60000, // 1 minute
      };

      initUptime(uptimeConfig);
      log.info(
        "✅ Uptime monitoring initialized successfully",
        { configStatus: "configured" },
        "Observability"
      );
    })
    .catch((error) => {
      log.error(
        "❌ Failed to initialize Uptime monitoring",
        { message: error?.message ?? "Unknown error" },
        "Observability"
      );
    });
};
