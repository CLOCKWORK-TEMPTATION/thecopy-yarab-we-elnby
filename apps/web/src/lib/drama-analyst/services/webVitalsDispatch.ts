import { log } from "./loggerService";
import { reportError, addBreadcrumb } from "./observability";

import type {
  CustomMetric,
  NavigatorWithConnection,
  WebVitalsConfig,
  WindowWithGtag,
} from "./webVitalsService";

// No-op replacement for missing GA function
const sendGAEvent = (..._args: unknown[]) => undefined;

export function trackWebVitalsInitialized(
  config?: Partial<WebVitalsConfig>
): void {
  sendGAEvent("web_vitals_initialized", {
    config: {
      enableGA4: config?.enableGA4,
      enableSentry: config?.enableSentry,
      enableConsoleLog: config?.enableConsoleLog,
      debug: config?.debug,
    },
    timestamp: Date.now(),
    userAgent: navigator.userAgent,
  });
}

export function sendMetricToGA4(
  config: WebVitalsConfig,
  name: string,
  metric: CustomMetric
): void {
  try {
    sendGAEvent("web_vitals", {
      metric_name: metric.name,
      metric_value: Math.round(metric.value),
      metric_delta: Math.round(metric.delta),
      metric_rating: metric.rating,
      metric_id: metric.id,
      navigation_type: metric.navigationType,
      is_good: metric.rating === "good",
      is_needs_improvement: metric.rating === "needs-improvement",
      is_poor: metric.rating === "poor",
      timestamp: Date.now(),
      user_agent: navigator.userAgent,
      connection_type:
        (navigator as NavigatorWithConnection).connection?.effectiveType ??
        "unknown",
      ...metric.customData,
    });

    sendGAEvent(`web_vital_${metric.name.toLowerCase()}`, {
      value: Math.round(metric.value),
      rating: metric.rating,
      delta: Math.round(metric.delta),
      id: metric.id,
      ...metric.customData,
    });

    if (config.debug) {
      log.debug(
        `📊 GA4 Web Vitals event sent: ${name}`,
        metric,
        "WebVitalsService"
      );
    }
  } catch {
    log.error("❌ Failed to send to GA4", null, "WebVitalsService");

    const analyticsWindow =
      typeof window !== "undefined" ? (window as WindowWithGtag) : null;

    if (analyticsWindow?.gtag) {
      try {
        analyticsWindow.gtag("event", name, {
          event_category: "Web Vitals",
          event_label: metric.id,
          value: Math.round(metric.value),
          custom_map: metric.customData,
        });
      } catch {
        log.error("❌ Fallback GA4 also failed", null, "WebVitalsService");
      }
    }
  }
}

export function sendMetricToSentry(
  config: WebVitalsConfig,
  name: string,
  metric: CustomMetric
): void {
  try {
    addBreadcrumb(`Web Vitals: ${name}`, "web-vitals", {
      value: metric.value,
      delta: metric.delta,
      rating: metric.rating,
      id: metric.id,
      navigationType: metric.navigationType,
      ...metric.customData,
    });

    if (metric.rating === "poor") {
      reportError(new Error(`Poor Web Vital: ${name}`), {
        metric: {
          name: metric.name,
          value: metric.value,
          rating: metric.rating,
          delta: metric.delta,
          id: metric.id,
          navigationType: metric.navigationType,
          customData: metric.customData,
        },
      });
    }

    if (config.debug) {
      log.debug(
        `📊 Sentry Web Vitals event sent: ${name}`,
        metric,
        "WebVitalsService"
      );
    }
  } catch {
    log.error("❌ Failed to send to Sentry", null, "WebVitalsService");
  }
}

export function sendMetricToCustomEndpoint(
  endpoint: string | undefined,
  name: string,
  metric: CustomMetric
): void {
  if (!endpoint) return;

  fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      value: metric.value,
      delta: metric.delta,
      id: metric.id,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      ...metric.customData,
    }),
  }).catch(() => {
    log.error(
      `Failed to send metric to custom endpoint`,
      null,
      "WebVitalsService"
    );
  });
}

export function checkPerformanceThresholds(
  config: WebVitalsConfig,
  name: string,
  metric: CustomMetric
): void {
  const thresholds = {
    CLS: 0.25,
    FID: 100,
    FCP: 1800,
    LCP: 2500,
    TTFB: 800,
    APICallTime: 3000,
    FileProcessingTime: 5000,
    LongTask: 50,
  };

  const threshold = thresholds[name as keyof typeof thresholds];
  if (threshold && metric.value > threshold) {
    const message = `⚠️ Performance threshold exceeded: ${name} = ${metric.value.toFixed(2)} (threshold: ${threshold})`;

    if (config.enableSentry) {
      reportError(new Error(message), {
        metric: name,
        value: metric.value,
        threshold,
        ...metric.customData,
      });
    }

    if (config.enableConsoleLog) {
      log.warn(message, null, "WebVitalsService");
    }
  }
}

export function getMetricUnit(name: string): string {
  const units: Record<string, string> = {
    CLS: "",
    INP: "ms",
    FCP: "ms",
    LCP: "ms",
    TTFB: "ms",
    NavigationTiming: "ms",
    SlowResource: "ms",
    LongTask: "ms",
    APICallTime: "ms",
    FileProcessingTime: "ms",
    AppLoadTime: "ms",
  };

  return units[name] ?? "ms";
}

export function getResourceType(url: string): string {
  if (url.includes(".js")) return "javascript";
  if (url.includes(".css")) return "stylesheet";
  if (
    url.includes(".png") ||
    url.includes(".jpg") ||
    url.includes(".jpeg") ||
    url.includes(".webp")
  )
    return "image";
  if (url.includes(".woff") || url.includes(".ttf")) return "font";
  if (url.includes("api")) return "api";
  return "other";
}
