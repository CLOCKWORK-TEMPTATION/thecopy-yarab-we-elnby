// Web Vitals Service for Drama Analyst
// Monitors Core Web Vitals and performance metrics

import { onCLS, onINP, onFCP, onLCP, onTTFB } from "web-vitals";

import { log } from "./loggerService";
import { addBreadcrumb } from "./observability";
import {
  checkPerformanceThresholds,
  getMetricUnit,
  getResourceType,
  sendMetricToCustomEndpoint,
  sendMetricToGA4,
  sendMetricToSentry,
  trackWebVitalsInitialized,
} from "./webVitalsDispatch";

import type { Metric } from "web-vitals";

export interface WebVitalsConfig {
  enableGA4: boolean;
  enableSentry: boolean;
  enableConsoleLog: boolean;
  customEndpoint?: string;
  debug: boolean;
}

export interface CustomMetric {
  name: string;
  value: number;
  delta: number;
  id: string;
  navigationType: string;
  rating: Metric["rating"];
  entries: PerformanceEntry[];
  customData?: Record<string, unknown>;
}

export type NavigatorWithConnection = Navigator & {
  connection?: {
    effectiveType?: string;
  };
};

type PerformanceNavigationTimingWithDomLoading = PerformanceNavigationTiming & {
  domLoading?: number;
};

type PerformanceEntryWithDetail = PerformanceEntry & {
  detail?: unknown;
};

type GtagFunction = (
  command: string,
  eventName: string,
  params?: Record<string, unknown>
) => void;

export type WindowWithGtag = Window & {
  gtag?: GtagFunction;
};

class WebVitalsService {
  private config: WebVitalsConfig;
  private metrics = new Map<string, CustomMetric>();
  private observers = new Set<PerformanceObserver>();

  constructor(config: Partial<WebVitalsConfig> = {}) {
    this.config = {
      enableGA4: true,
      enableSentry: true,
      enableConsoleLog: process.env.NODE_ENV === "development",
      debug: process.env.NODE_ENV === "development",
      ...config,
    };

    this.init();
  }

  private init(): void {
    if (typeof window === "undefined") {
      log.warn(
        "⚠️ Web Vitals service: window not available",
        null,
        "WebVitalsService"
      );
      return;
    }

    log.info(
      "📊 Initializing Web Vitals monitoring...",
      null,
      "WebVitalsService"
    );

    // Initialize Core Web Vitals
    this.initCoreWebVitals();

    // Initialize custom performance metrics
    this.initCustomMetrics();

    // Initialize navigation timing
    this.initNavigationTiming();

    // Initialize resource timing
    this.initResourceTiming();

    // Initialize long task monitoring
    this.initLongTaskMonitoring();

    log.info("✅ Web Vitals monitoring initialized", null, "WebVitalsService");
  }

  private initCoreWebVitals(): void {
    // Cumulative Layout Shift (CLS)
    onCLS((metric) => {
      this.handleMetric("CLS", metric);
    });

    // Interaction to Next Paint (INP) - replaces FID
    onINP((metric) => {
      this.handleMetric("INP", metric);
    });

    // First Contentful Paint (FCP)
    onFCP((metric) => {
      this.handleMetric("FCP", metric);
    });

    // Largest Contentful Paint (LCP)
    onLCP((metric) => {
      this.handleMetric("LCP", metric);
    });

    // Time to First Byte (TTFB)
    onTTFB((metric) => {
      this.handleMetric("TTFB", metric);
    });
  }

  private initCustomMetrics(): void {
    // Custom metrics for Drama Analyst specific functionality
    this.measureAppLoadTime();
    this.measureFileProcessingTime();
    this.measureAPICallTime();
    this.measureComponentRenderTime();
  }

  private initNavigationTiming(): void {
    if (!("PerformanceNavigationTiming" in window)) {
      return;
    }

    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === "navigation") {
          const navEntry = entry as PerformanceNavigationTiming;

          const customMetric: CustomMetric = {
            name: "TTFB",
            value: navEntry.loadEventEnd - navEntry.fetchStart,
            delta: navEntry.loadEventEnd - navEntry.fetchStart,
            id: `nav-${Date.now()}`,
            navigationType: navEntry.type,
            rating: "good",
            entries: [],
            customData: {
              domContentLoaded:
                navEntry.domContentLoadedEventEnd -
                navEntry.domContentLoadedEventStart,
              loadComplete: navEntry.loadEventEnd - navEntry.loadEventStart,
              dnsLookup: navEntry.domainLookupEnd - navEntry.domainLookupStart,
              tcpConnect: navEntry.connectEnd - navEntry.connectStart,
              request: navEntry.responseStart - navEntry.requestStart,
              response: navEntry.responseEnd - navEntry.responseStart,
              domProcessing:
                navEntry.domComplete -
                ((navEntry as PerformanceNavigationTimingWithDomLoading)
                  .domLoading ?? 0),
            },
          };

          this.handleMetric("TTFB", customMetric);
        }
      });
    });

    observer.observe({ entryTypes: ["navigation"] });
    this.observers.add(observer);
  }

  private initResourceTiming(): void {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === "resource") {
          const resourceEntry = entry as PerformanceResourceTiming;

          // Track slow resources
          if (resourceEntry.duration > 1000) {
            // Resources taking longer than 1 second
            const customMetric: CustomMetric = {
              name: "SlowResource",
              value: resourceEntry.duration,
              delta: resourceEntry.duration,
              id: `resource-${Date.now()}`,
              navigationType: "navigate",
              rating: "good",
              entries: [],
              customData: {
                url: resourceEntry.name,
                size: resourceEntry.transferSize,
                type: getResourceType(resourceEntry.name),
                initiatorType: resourceEntry.initiatorType,
              },
            };

            this.handleMetric("SlowResource", customMetric);
          }
        }
      });
    });

    observer.observe({ entryTypes: ["resource"] });
    this.observers.add(observer);
  }

  private initLongTaskMonitoring(): void {
    if (!("PerformanceObserver" in window)) {
      return;
    }

    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === "longtask") {
          const customMetric: CustomMetric = {
            name: "LongTask",
            value: entry.duration,
            delta: entry.duration,
            id: `longtask-${Date.now()}`,
            navigationType: "navigate",
            rating: "good",
            entries: [],
            customData: {
              startTime: entry.startTime,
              name: entry.name,
            },
          };

          this.handleMetric("LongTask", customMetric);
        }
      });
    });

    try {
      observer.observe({ entryTypes: ["longtask"] });
      this.observers.add(observer);
    } catch (error) {
      log.warn(
        "⚠️ Long task monitoring not supported",
        error,
        "WebVitalsService"
      );
    }
  }

  private measureAppLoadTime(): void {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        this.measureCustomMetric("AppLoadTime", performance.now());
      });
    } else {
      this.measureCustomMetric("AppLoadTime", performance.now());
    }
  }

  private measureFileProcessingTime(): void {
    // This will be called when file processing starts/ends
    const originalMeasure = performance.measure.bind(performance);

    // Override performance.measure to track file processing
    performance.measure = (
      name: string,
      startMark?: string,
      endMark?: string
    ) => {
      const result = originalMeasure(name, startMark, endMark);

      if (name.includes("file-processing")) {
        const customMetric: CustomMetric = {
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
        };

        this.handleMetric("FileProcessingTime", customMetric);
      }

      return result;
    };
  }

  private measureAPICallTime(): void {
    // This will be called when API calls are made
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

        const customMetric: CustomMetric = {
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
        };

        this.handleMetric("APICallTime", customMetric);

        return response;
      } catch (error) {
        const endTime = performance.now();

        const customMetric: CustomMetric = {
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
        };

        this.handleMetric("APICallError", customMetric);

        throw error;
      }
    };
  }

  private measureComponentRenderTime(): void {
    // Track React component render times using performance marks and measures
    if (!("PerformanceObserver" in window) || !window.performance?.mark) {
      log.warn(
        "⚠️ Performance API not available for component render tracking",
        null,
        "WebVitalsService"
      );
      return;
    }

    try {
      // Observe performance measures for component renders
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === "measure") {
            // Track measures that match component render patterns
            // Common patterns: "Component.render", "⚛ ComponentName", etc.
            const isComponentMeasure =
              entry.name.includes("Component") ||
              entry.name.includes("⚛") ||
              entry.name.includes("render");

            if (isComponentMeasure) {
              const customMetric: CustomMetric = {
                name: "ComponentRender",
                value: entry.duration,
                delta: entry.duration,
                id: `component-${Date.now()}`,
                navigationType: "navigate",
                rating: entry.duration < 16 ? "good" : "poor", // 16ms = 60fps
                entries: [],
                customData: {
                  componentName: entry.name,
                  duration: entry.duration,
                  startTime: entry.startTime,
                  detail: (entry as PerformanceEntryWithDetail).detail,
                },
              };

              // Only track slow renders (> 16ms for 60fps)
              if (entry.duration > 16) {
                this.handleMetric("ComponentRender", customMetric);
              }
            }
          }
        });
      });

      observer.observe({ entryTypes: ["measure"] });
      this.observers.add(observer);

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

  /**
   * Public method to mark component render start
   * Usage: webVitalsService.markComponentRenderStart('MyComponent')
   */
  public markComponentRenderStart(componentName: string): void {
    if (typeof window !== "undefined" && window.performance) {
      try {
        performance.mark(`${componentName}-render-start`);
      } catch {
        // Silently fail if marking fails
      }
    }
  }

  /**
   * Public method to mark component render end and measure duration
   * Usage: webVitalsService.markComponentRenderEnd('MyComponent')
   */
  public markComponentRenderEnd(componentName: string): void {
    if (typeof window !== "undefined" && window.performance) {
      try {
        const endMark = `${componentName}-render-end`;
        const startMark = `${componentName}-render-start`;

        performance.mark(endMark);

        // Create a measure between start and end marks
        try {
          performance.measure(`⚛ ${componentName} render`, startMark, endMark);

          // Clean up marks to avoid memory leaks
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

  /**
   * Public method to measure a component render directly
   * Usage: webVitalsService.measureComponentRender('MyComponent', () => { ... })
   */
  public async measureComponentRender<T>(
    componentName: string,
    renderFn: () => T | Promise<T>
  ): Promise<T> {
    this.markComponentRenderStart(componentName);
    try {
      const result = await renderFn();
      return result;
    } finally {
      this.markComponentRenderEnd(componentName);
    }
  }

  private handleMetric(name: string, metric: CustomMetric): void {
    // Store metric
    this.metrics.set(metric.id, metric);

    // Log to console if enabled
    if (this.config.enableConsoleLog) {
      log.info(
        `📊 ${name}: ${metric.value.toFixed(2)}${getMetricUnit(name)}`,
        null,
        "WebVitalsService"
      );
    }

    // Send to Google Analytics 4
    if (this.config.enableGA4) {
      sendMetricToGA4(this.config, name, metric);
    }

    // Send to Sentry
    if (this.config.enableSentry) {
      sendMetricToSentry(this.config, name, metric);
    }

    // Send to custom endpoint
    if (this.config.customEndpoint) {
      sendMetricToCustomEndpoint(this.config.customEndpoint, name, metric);
    }

    // Add breadcrumb
    addBreadcrumb(`Web Vital: ${name}`, "performance", {
      value: metric.value,
      ...metric.customData,
    });

    // Check for performance issues
    checkPerformanceThresholds(this.config, name, metric);
  }

  private measureCustomMetric(
    name: string,
    value: number,
    customData?: Record<string, unknown>
  ): void {
    const customMetric: CustomMetric = {
      name,
      value,
      delta: value,
      id: `${name.toLowerCase()}-${Date.now()}`,
      navigationType: "navigate",
      rating: "good",
      entries: [],
      ...(customData ? { customData } : {}),
    };

    this.handleMetric(name, customMetric);
  }

  // Public methods
  public getMetrics(): Map<string, CustomMetric> {
    return new Map(this.metrics);
  }

  public getMetric(name: string): CustomMetric | undefined {
    return Array.from(this.metrics.values()).find(
      (metric) => metric.name === name
    );
  }

  public getPerformanceScore(): number {
    const metrics = Array.from(this.metrics.values());
    let score = 100;

    // Penalize based on Core Web Vitals
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

  public destroy(): void {
    // Clean up observers
    this.observers.forEach((observer) => {
      observer.disconnect();
    });
    this.observers.clear();

    // Clear metrics
    this.metrics.clear();

    log.info("🔒 Web Vitals service destroyed", null, "WebVitalsService");
  }
}

// Create singleton instance
let webVitalsService: WebVitalsService | null = null;

export const initWebVitals = (config?: Partial<WebVitalsConfig>) => {
  if (webVitalsService) {
    log.warn(
      "⚠️ Web Vitals service already initialized",
      null,
      "WebVitalsService"
    );
    return webVitalsService;
  }

  webVitalsService = new WebVitalsService(config);

  // Track Web Vitals initialization in analytics
  try {
    trackWebVitalsInitialized(config);
  } catch {
    log.error(
      "❌ Failed to track Web Vitals initialization",
      null,
      "WebVitalsService"
    );
  }

  return webVitalsService;
};

export const getWebVitalsService = () => webVitalsService;

export const destroyWebVitals = () => {
  if (webVitalsService) {
    webVitalsService.destroy();
    webVitalsService = null;
  }
};
