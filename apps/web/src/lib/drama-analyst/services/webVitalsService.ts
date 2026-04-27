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
import {
  calculatePerformanceScore,
  installApiCallTiming,
  installFileProcessingTiming,
  markComponentRenderEnd,
  markComponentRenderStart,
  measureAppLoadTime,
  measureComponentRender,
  observeComponentRenderTime,
} from "./webVitalsRuntime";

import type { CustomMetric, WebVitalsConfig } from "./webVitalsTypes";

type PerformanceNavigationTimingWithDomLoading = PerformanceNavigationTiming & {
  domLoading?: number;
};

export type {
  CustomMetric,
  NavigatorWithConnection,
  WebVitalsConfig,
  WindowWithGtag,
} from "./webVitalsTypes";

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
    measureAppLoadTime((name, value, customData) =>
      this.measureCustomMetric(name, value, customData)
    );
  }

  private measureFileProcessingTime(): void {
    installFileProcessingTiming((name, metric) =>
      this.handleMetric(name, metric)
    );
  }

  private measureAPICallTime(): void {
    installApiCallTiming((name, metric) => this.handleMetric(name, metric));
  }

  private measureComponentRenderTime(): void {
    observeComponentRenderTime(
      (observer) => this.observers.add(observer),
      (name, metric) => this.handleMetric(name, metric)
    );
  }

  /**
   * Public method to mark component render start
   * Usage: webVitalsService.markComponentRenderStart('MyComponent')
   */
  public markComponentRenderStart(componentName: string): void {
    markComponentRenderStart(componentName);
  }

  /**
   * Public method to mark component render end and measure duration
   * Usage: webVitalsService.markComponentRenderEnd('MyComponent')
   */
  public markComponentRenderEnd(componentName: string): void {
    markComponentRenderEnd(componentName);
  }

  /**
   * Public method to measure a component render directly
   * Usage: webVitalsService.measureComponentRender('MyComponent', () => { ... })
   */
  public async measureComponentRender<T>(
    componentName: string,
    renderFn: () => T | Promise<T>
  ): Promise<T> {
    return measureComponentRender(componentName, renderFn);
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
    return calculatePerformanceScore(Array.from(this.metrics.values()));
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
