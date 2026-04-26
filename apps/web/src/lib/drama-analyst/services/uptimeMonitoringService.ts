// Uptime Monitoring Service for Drama Analyst
// Monitors application uptime, health, and performance metrics

import { log } from "./loggerService";
// No-op replacement for missing GA function
const sendGAEvent = (..._args: any[]) => {};
import { addBreadcrumb, reportError } from "./observability";

interface UptimeConfig {
  enableGA4: boolean;
  enableSentry: boolean;
  enableConsoleLog: boolean;
  healthCheckInterval: number; // in milliseconds
  performanceCheckInterval: number; // in milliseconds
  debug: boolean;
}

interface HealthMetrics {
  uptime: number; // in seconds
  memoryUsage: number; // in MB
  performanceScore: number; // 0-100
  errorCount: number;
  requestCount: number;
  lastHealthCheck: Date;
  status: "healthy" | "degraded" | "unhealthy";
}

interface PerformanceMetrics {
  loadTime: number; // in milliseconds
  renderTime: number; // in milliseconds
  interactionTime: number; // in milliseconds
  memoryLeaks: boolean;
  slowOperations: string[];
}

class UptimeMonitoringService {
  private config: UptimeConfig;
  private startTime: number;
  private healthMetrics: HealthMetrics;
  private performanceMetrics: PerformanceMetrics;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private performanceCheckInterval: NodeJS.Timeout | null = null;
  private errorCount = 0;
  private requestCount = 0;

  constructor(config: Partial<UptimeConfig> = {}) {
    this.config = {
      enableGA4: true,
      enableSentry: true,
      enableConsoleLog: process.env.NODE_ENV === "development",
      healthCheckInterval: 30000, // 30 seconds
      performanceCheckInterval: 60000, // 1 minute
      debug: process.env.NODE_ENV === "development",
      ...config,
    };

    this.startTime = Date.now();
    this.healthMetrics = this.initializeHealthMetrics();
    this.performanceMetrics = this.initializePerformanceMetrics();

    this.init();
  }

  private initializeHealthMetrics(): HealthMetrics {
    return {
      uptime: 0,
      memoryUsage: 0,
      performanceScore: 100,
      errorCount: 0,
      requestCount: 0,
      lastHealthCheck: new Date(),
      status: "healthy",
    };
  }

  private initializePerformanceMetrics(): PerformanceMetrics {
    return {
      loadTime: 0,
      renderTime: 0,
      interactionTime: 0,
      memoryLeaks: false,
      slowOperations: [],
    };
  }

  private init(): void {
    if (typeof window === "undefined") {
      log.warn(
        "⚠️ Uptime monitoring: window not available",
        null,
        "UptimeMonitoringService"
      );
      return;
    }

    log.info(
      "📊 Initializing Uptime monitoring...",
      {
        enableGA4: this.config.enableGA4,
        enableSentry: this.config.enableSentry,
        healthCheckInterval: this.config.healthCheckInterval,
        performanceCheckInterval: this.config.performanceCheckInterval,
      },
      "UptimeMonitoringService"
    );

    // Start health monitoring
    this.startHealthMonitoring();

    // Start performance monitoring
    this.startPerformanceMonitoring();

    // Track uptime monitoring initialization
    this.trackEvent("uptime_monitoring_initialized", {
      config: this.config,
      timestamp: Date.now(),
    });

    // Set up error tracking
    this.setupErrorTracking();

    // Set up performance tracking
    this.setupPerformanceTracking();
  }

  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);

    // Perform initial health check
    this.performHealthCheck();
  }

  private startPerformanceMonitoring(): void {
    if (this.performanceCheckInterval) {
      clearInterval(this.performanceCheckInterval);
    }

    this.performanceCheckInterval = setInterval(() => {
      this.performPerformanceCheck();
    }, this.config.performanceCheckInterval);

    // Perform initial performance check
    this.performPerformanceCheck();
  }

  private performHealthCheck(): void {
    try {
      const currentTime = Date.now();
      const uptime = (currentTime - this.startTime) / 1000; // in seconds

      // Get memory usage
      const memoryUsage = this.getMemoryUsage();

      // Calculate performance score
      const performanceScore = this.calculatePerformanceScore();

      // Update health metrics
      this.healthMetrics = {
        uptime,
        memoryUsage,
        performanceScore,
        errorCount: this.errorCount,
        requestCount: this.requestCount,
        lastHealthCheck: new Date(),
        status: this.determineHealthStatus(performanceScore, memoryUsage),
      };

      // Log health status
      if (this.config.enableConsoleLog) {
        log.info(
          "🏥 Health Check",
          {
            status: this.healthMetrics.status,
            uptime_seconds: Math.round(uptime),
            memory_mb: Math.round(memoryUsage),
            performance_score: performanceScore,
            error_count: this.errorCount,
            request_count: this.requestCount,
          },
          "UptimeMonitoringService"
        );
      }

      // Track health metrics
      this.trackEvent("health_check", {
        status: this.healthMetrics.status,
        uptime: Math.round(uptime),
        memory_usage: Math.round(memoryUsage),
        performance_score: performanceScore,
        error_count: this.errorCount,
        request_count: this.requestCount,
      });

      // Report to Sentry if unhealthy
      if (this.healthMetrics.status !== "healthy") {
        this.reportHealthIssue();
      }
    } catch {
      log.error("❌ Health check failed", null, "UptimeMonitoringService");
    }
  }

  private performPerformanceCheck(): void {
    try {
      // Check for memory leaks
      const memoryLeaks = this.checkMemoryLeaks();

      // Check for slow operations
      const slowOperations = this.checkSlowOperations();

      // Update performance metrics
      this.performanceMetrics = {
        ...this.performanceMetrics,
        memoryLeaks,
        slowOperations,
      };

      // Log performance status
      if (this.config.enableConsoleLog) {
        log.info(
          "⚡ Performance Check",
          {
            memory_leaks: memoryLeaks,
            slow_operations_count: slowOperations.length,
            // Remove detailed operation information for security
          },
          "UptimeMonitoringService"
        );
      }

      // Track performance metrics
      this.trackEvent("performance_check", {
        memory_leaks: memoryLeaks,
        slow_operations_count: slowOperations.length,
        slow_operations: slowOperations,
      });

      // Report performance issues
      if (memoryLeaks || slowOperations.length > 0) {
        this.reportPerformanceIssue();
      }
    } catch {
      log.error("❌ Performance check failed", null, "UptimeMonitoringService");
    }
  }

  private getMemoryUsage(): number {
    if ("memory" in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize / 1024 / 1024; // Convert to MB
    }
    return 0;
  }

  private calculatePerformanceScore(): number {
    let score = 100;

    // Penalize based on memory usage
    const memoryUsage = this.getMemoryUsage();
    if (memoryUsage > 100)
      score -= 20; // Over 100MB
    else if (memoryUsage > 50) score -= 10; // Over 50MB

    // Penalize based on error count
    if (this.errorCount > 10)
      score -= 30; // Over 10 errors
    else if (this.errorCount > 5)
      score -= 15; // Over 5 errors
    else if (this.errorCount > 0) score -= 5; // Any errors

    // Penalize based on performance metrics
    if (this.performanceMetrics.memoryLeaks) score -= 25;
    if (this.performanceMetrics.slowOperations.length > 0) score -= 15;

    return Math.max(0, score);
  }

  private determineHealthStatus(
    performanceScore: number,
    memoryUsage: number
  ): "healthy" | "degraded" | "unhealthy" {
    if (performanceScore < 50 || memoryUsage > 200 || this.errorCount > 20) {
      return "unhealthy";
    } else if (
      performanceScore < 75 ||
      memoryUsage > 100 ||
      this.errorCount > 10
    ) {
      return "degraded";
    } else {
      return "healthy";
    }
  }

  private checkMemoryLeaks(): boolean {
    // Simple memory leak detection
    const memoryUsage = this.getMemoryUsage();
    const uptime = (Date.now() - this.startTime) / 1000 / 60; // in minutes

    // If memory usage is high and uptime is long, possible memory leak
    return memoryUsage > 50 && uptime > 10;
  }

  private checkSlowOperations(): string[] {
    const slowOperations: string[] = [];

    // Check for long tasks
    if ("PerformanceObserver" in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.duration > 50) {
            // Tasks longer than 50ms
            slowOperations.push(`Long task: ${entry.duration.toFixed(2)}ms`);
          }
        });
      });

      try {
        observer.observe({ entryTypes: ["longtask"] });
        // Clean up observer after a short time
        setTimeout(() => observer.disconnect(), 1000);
      } catch {
        // PerformanceObserver might not be supported
      }
    }

    return slowOperations;
  }

  private setupErrorTracking(): void {
    // Track unhandled errors
    window.addEventListener("error", (event) => {
      this.errorCount++;
      this.trackEvent("unhandled_error", {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.toString(),
      });
    });

    // Track unhandled promise rejections
    window.addEventListener("unhandledrejection", (event) => {
      this.errorCount++;
      this.trackEvent("unhandled_rejection", {
        reason: event.reason?.toString(),
        promise: event.promise?.toString(),
      });
    });
  }

  private setupPerformanceTracking(): void {
    // Track page load performance
    window.addEventListener("load", () => {
      const loadTime = performance.now();
      this.performanceMetrics.loadTime = loadTime;

      this.trackEvent("page_load", {
        load_time: Math.round(loadTime),
        timestamp: Date.now(),
      });
    });

    // Track user interactions
    let interactionStartTime = 0;

    ["click", "keydown", "scroll"].forEach((eventType) => {
      document.addEventListener(eventType, () => {
        if (interactionStartTime === 0) {
          interactionStartTime = performance.now();
        }

        const interactionTime = performance.now() - interactionStartTime;
        this.performanceMetrics.interactionTime = interactionTime;

        if (interactionTime > 100) {
          // Slow interaction
          this.trackEvent("slow_interaction", {
            event_type: eventType,
            interaction_time: Math.round(interactionTime),
            timestamp: Date.now(),
          });
        }

        interactionStartTime = 0;
      });
    });
  }

  private trackEvent(eventName: string, eventData: Record<string, any>): void {
    try {
      // Track in GA4
      if (this.config.enableGA4) {
        sendGAEvent(eventName, {
          ...eventData,
          uptime: Math.round((Date.now() - this.startTime) / 1000),
          memory_usage: Math.round(this.getMemoryUsage()),
          performance_score: this.calculatePerformanceScore(),
        });
      }

      // Track in Sentry
      if (this.config.enableSentry) {
        addBreadcrumb(eventName, "uptime-monitoring", eventData);
      }

      // Log to console
      if (this.config.enableConsoleLog) {
        log.debug(
          `📊 Uptime event: ${eventName}`,
          eventData,
          "UptimeMonitoringService"
        );
      }
    } catch {
      log.error(
        "❌ Failed to track uptime event",
        null,
        "UptimeMonitoringService"
      );
    }
  }

  private reportHealthIssue(): void {
    if (this.config.enableSentry) {
      reportError(
        new Error(`Health issue detected: ${this.healthMetrics.status}`),
        {
          health_status: this.healthMetrics.status,
          performance_score: this.healthMetrics.performanceScore,
          uptime_seconds: Math.round((Date.now() - this.startTime) / 1000),
          // Removed detailed metrics for security
        }
      );
    }
  }

  private reportPerformanceIssue(): void {
    if (this.config.enableSentry) {
      reportError(new Error("Performance issue detected"), {
        memory_leaks: this.performanceMetrics.memoryLeaks,
        slow_operations_count: this.performanceMetrics.slowOperations.length,
        uptime_seconds: Math.round((Date.now() - this.startTime) / 1000),
        // Removed detailed performance metrics for security
      });
    }
  }

  // Public methods
  public getHealthMetrics(): HealthMetrics {
    return { ...this.healthMetrics };
  }

  public getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  public getUptime(): number {
    return Math.round((Date.now() - this.startTime) / 1000);
  }

  public incrementRequestCount(): void {
    this.requestCount++;
  }

  public incrementErrorCount(): void {
    this.errorCount++;
  }

  public getStatus(): "healthy" | "degraded" | "unhealthy" {
    return this.healthMetrics.status;
  }

  public destroy(): void {
    // Clear intervals
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.performanceCheckInterval) {
      clearInterval(this.performanceCheckInterval);
      this.performanceCheckInterval = null;
    }

    log.info(
      "🔒 Uptime monitoring service destroyed",
      null,
      "UptimeMonitoringService"
    );
  }
}

// Create singleton instance
let uptimeMonitoringService: UptimeMonitoringService | null = null;

export const initUptimeMonitoring = (config?: Partial<UptimeConfig>) => {
  if (uptimeMonitoringService) {
    log.warn(
      "⚠️ Uptime monitoring service already initialized",
      null,
      "UptimeMonitoringService"
    );
    return uptimeMonitoringService;
  }

  uptimeMonitoringService = new UptimeMonitoringService(config);
  return uptimeMonitoringService;
};

export const getUptimeMonitoringService = () => uptimeMonitoringService;

export const destroyUptimeMonitoring = () => {
  if (uptimeMonitoringService) {
    uptimeMonitoringService.destroy();
    uptimeMonitoringService = null;
  }
};

// Export types
export type { UptimeConfig, HealthMetrics, PerformanceMetrics };
