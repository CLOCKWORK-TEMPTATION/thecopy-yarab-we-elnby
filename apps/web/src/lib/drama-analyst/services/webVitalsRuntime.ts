import { log } from "./loggerService";

import type { CustomMetric } from "./webVitalsTypes";

type HandleMetric = (name: string, metric: CustomMetric) => void;
type MeasureCustomMetric = (
  name: string,
  value: number,
  customData?: Record<string, unknown>
) => void;

type PerformanceEntryWithDetail = PerformanceEntry & {
  detail?: unknown;
};

export function measureAppLoadTime(
  measureCustomMetric: MeasureCustomMetric
): void {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      measureCustomMetric("AppLoadTime", performance.now());
    });
    return;
  }

  measureCustomMetric("AppLoadTime", performance.now());
}

export function installFileProcessingTiming(handleMetric: HandleMetric): void {
  const originalMeasure = performance.measure.bind(performance);

  performance.measure = (name: string, startMark?: string, endMark?: string) => {
    const result = originalMeasure(name, startMark, endMark);

    if (name.includes("file-processing")) {
      handleMetric("FileProcessingTime", {
        name: "FileProcessingTime",
        value: result.duration,
        delta: result.duration,
        id: `file-processing-${Date.now()}`,
        navigationType: "navigate",
        rating: "good",
        entries: [],
        customData: {
          fileName: name.split("-").pop(),
          startTime: result.startTime,
        },
      });
    }

    return result;
  };
}

export function installApiCallTiming(handleMetric: HandleMetric): void {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (...args) => {
    const startTime = performance.now();
    const requestInput = args[0];
    const url =
      typeof requestInput === "string"
        ? requestInput
        : requestInput instanceof URL
          ? requestInput.href
          : requestInput instanceof Request
            ? requestInput.url
            : "unknown";

    try {
      const response = await originalFetch(...args);
      const endTime = performance.now();

      handleMetric("APICallTime", {
        name: "APICallTime",
        value: endTime - startTime,
        delta: endTime - startTime,
        id: `api-${Date.now()}`,
        navigationType: "navigate",
        rating: "good",
        entries: [],
        customData: {
          url,
          status: response.status,
          method: args[1]?.method ?? "GET",
        },
      });

      return response;
    } catch (error) {
      const endTime = performance.now();
      handleMetric("APICallError", {
        name: "APICallError",
        value: endTime - startTime,
        delta: endTime - startTime,
        id: `api-error-${Date.now()}`,
        navigationType: "navigate",
        rating: "good",
        entries: [],
        customData: {
          url,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
      throw error;
    }
  };
}

export function observeComponentRenderTime(
  registerObserver: (observer: PerformanceObserver) => void,
  handleMetric: HandleMetric
): void {
  if (!("PerformanceObserver" in window) || !window.performance?.mark) {
    log.warn(
      "⚠️ Performance API not available for component render tracking",
      null,
      "WebVitalsService"
    );
    return;
  }

  try {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType !== "measure") {
          return;
        }

        const isComponentMeasure =
          entry.name.includes("Component") ||
          entry.name.includes("⚛") ||
          entry.name.includes("render");

        if (!isComponentMeasure || entry.duration <= 16) {
          return;
        }

        handleMetric("ComponentRender", {
          name: "ComponentRender",
          value: entry.duration,
          delta: entry.duration,
          id: `component-${Date.now()}`,
          navigationType: "navigate",
          rating: entry.duration < 16 ? "good" : "poor",
          entries: [],
          customData: {
            componentName: entry.name,
            duration: entry.duration,
            startTime: entry.startTime,
            detail: (entry as PerformanceEntryWithDetail).detail,
          },
        });
      });
    });

    observer.observe({ entryTypes: ["measure"] });
    registerObserver(observer);

    log.info(
      "✅ Component render time tracking initialized",
      null,
      "WebVitalsService"
    );
  } catch (error) {
    log.error(
      "❌ Failed to initialize component render tracking",
      error,
      "WebVitalsService"
    );
  }
}

export function markComponentRenderStart(componentName: string): void {
  if (typeof window !== "undefined" && window.performance) {
    try {
      performance.mark(`${componentName}-render-start`);
    } catch {
      // Silently fail if marking fails
    }
  }
}

export function markComponentRenderEnd(componentName: string): void {
  if (typeof window !== "undefined" && window.performance) {
    try {
      const endMark = `${componentName}-render-end`;
      const startMark = `${componentName}-render-start`;

      performance.mark(endMark);

      try {
        performance.measure(`⚛ ${componentName} render`, startMark, endMark);
        performance.clearMarks(startMark);
        performance.clearMarks(endMark);
      } catch {
        // Start mark might not exist, which is fine
      }
    } catch {
      // Silently fail if marking fails
    }
  }
}

export async function measureComponentRender<T>(
  componentName: string,
  renderFn: () => T | Promise<T>
): Promise<T> {
  markComponentRenderStart(componentName);
  try {
    return await renderFn();
  } finally {
    markComponentRenderEnd(componentName);
  }
}

export function calculatePerformanceScore(metrics: CustomMetric[]): number {
  let score = 100;

  metrics.forEach((metric) => {
    switch (metric.name) {
      case "CLS":
        if (metric.value > 0.25) score -= 20;
        else if (metric.value > 0.1) score -= 10;
        break;
      case "INP":
        if (metric.value > 200) score -= 20;
        else if (metric.value > 100) score -= 10;
        break;
      case "LCP":
        if (metric.value > 2500) score -= 20;
        else if (metric.value > 1800) score -= 10;
        break;
      case "FCP":
        if (metric.value > 1800) score -= 10;
        break;
      case "TTFB":
        if (metric.value > 800) score -= 10;
        break;
    }
  });

  return Math.max(0, score);
}
