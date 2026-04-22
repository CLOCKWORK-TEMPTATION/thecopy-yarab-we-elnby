// Google Analytics 4 Service for Drama Analyst
// Handles user analytics, events, and conversion tracking

import { log } from "./loggerService";

interface GA4Config {
  measurementId: string;
  debug: boolean;
  enableEnhancedEcommerce: boolean;
  enableUserProperties: boolean;
  enableCustomDimensions: boolean;
  enablePrivacyMode: boolean;
}

interface EventParams {
  event_category?: string;
  event_label?: string;
  value?: number;
  custom_map?: Record<string, any>;
  [key: string]: any;
}

interface UserProperties {
  user_id?: string;
  session_id?: string;
  user_type?: string;
  subscription_status?: string;
  [key: string]: any;
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    ga?: (...args: unknown[]) => void;
  }
}

class AnalyticsService {
  private config: GA4Config;
  private isInitialized: boolean = false;
  private userProperties: UserProperties = {};
  private customDimensions: Record<string, any> = {};

  constructor(config: Partial<GA4Config>) {
    this.config = {
      measurementId: "",
      debug: process.env["NODE_ENV"] === "development",
      enableEnhancedEcommerce: true,
      enableUserProperties: true,
      enableCustomDimensions: true,
      enablePrivacyMode: true,
      ...config,
    };

    this.init();
  }

  private init(): void {
    if (typeof window === "undefined") {
      log.warn(
        "⚠️ Analytics service: window not available",
        null,
        "AnalyticsService"
      );
      return;
    }

    if (!this.config.measurementId) {
      log.warn("⚠️ GA4 Measurement ID not provided", null, "AnalyticsService");
      return;
    }

    this.loadGA4();
    this.setupDataLayer();
    this.initializeTracking();

    this.isInitialized = true;
    log.info(
      "📊 Google Analytics 4 initialized",
      { measurementId: this.config.measurementId },
      "AnalyticsService"
    );
  }

  private loadGA4(): void {
    // Create script element
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${this.config.measurementId}`;

    // Add to document head
    document.head.appendChild(script);

    // Initialize gtag
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer?.push(arguments);
    };

    // Configure GA4
    window.gtag?.("js", new Date());
    window.gtag?.("config", this.config.measurementId, {
      debug_mode: this.config.debug,
      send_page_view: false, // We'll handle this manually
      anonymize_ip: this.config.enablePrivacyMode,
      allow_google_signals: !this.config.enablePrivacyMode,
      allow_ad_personalization_signals: !this.config.enablePrivacyMode,
      custom_map: this.customDimensions,
    });
  }

  private setupDataLayer(): void {
    // Enhanced ecommerce setup
    if (this.config.enableEnhancedEcommerce) {
      window.gtag?.("config", this.config.measurementId, {
        custom_map: {
          custom_parameter_1: "file_type",
          custom_parameter_2: "analysis_type",
          custom_parameter_3: "file_size",
        },
      });
    }
  }

  private initializeTracking(): void {
    // Track page views
    this.trackPageView();

    // Track user engagement
    this._trackUserEngagement();

    // Track performance metrics
    this.trackPerformanceMetrics();

    // Track errors
    this.trackErrors();
  }

  private trackPageView(): void {
    // Track initial page view
    this.sendEvent("page_view", {
      page_title: document.title,
      page_location: window.location.href,
      page_path: window.location.pathname,
      page_referrer: document.referrer,
    });

    // Track route changes (for SPA)
    let lastPath = window.location.pathname;
    const observer = new MutationObserver(() => {
      if (window.location.pathname !== lastPath) {
        this.sendEvent("page_view", {
          page_title: document.title,
          page_location: window.location.href,
          page_path: window.location.pathname,
          page_referrer: lastPath,
        });
        lastPath = window.location.pathname;
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  private _trackUserEngagement(): void {
    // Track scroll depth
    let maxScrollDepth = 0;
    const scrollDepthThresholds = [25, 50, 75, 90, 100];
    const triggeredThresholds: number[] = [];

    const trackScrollDepth = () => {
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      const documentHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const scrollDepth = Math.round((scrollTop / documentHeight) * 100);

      if (scrollDepth > maxScrollDepth) {
        maxScrollDepth = scrollDepth;

        scrollDepthThresholds.forEach((threshold) => {
          if (
            scrollDepth >= threshold &&
            !triggeredThresholds.includes(threshold)
          ) {
            triggeredThresholds.push(threshold);
            this.sendEvent("scroll_depth", {
              scroll_depth: threshold,
              page_location: window.location.href,
            });
          }
        });
      }
    };

    window.addEventListener("scroll", trackScrollDepth, { passive: true });

    // Track time on page
    const startTime = Date.now();
    const timeThresholds = [30, 60, 120, 300]; // seconds
    const triggeredTimeThresholds: number[] = [];

    const trackTimeOnPage = () => {
      const timeOnPage = Math.round((Date.now() - startTime) / 1000);

      timeThresholds.forEach((threshold) => {
        if (
          timeOnPage >= threshold &&
          !triggeredTimeThresholds.includes(threshold)
        ) {
          triggeredTimeThresholds.push(threshold);
          this.sendEvent("time_on_page", {
            time_on_page: threshold,
            page_location: window.location.href,
          });
        }
      });
    };

    setInterval(trackTimeOnPage, 10000); // Check every 10 seconds

    // Track clicks
    document.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;
      const linkText = target.textContent?.trim() || "";
      const linkUrl = (target as HTMLAnchorElement)?.href || "";

      this.sendEvent("click", {
        link_text: linkText,
        link_url: linkUrl,
        page_location: window.location.href,
      });
    });
  }

  private trackPerformanceMetrics(): void {
    // Track Core Web Vitals
    if ("PerformanceObserver" in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === "measure") {
            this.sendEvent("performance_measure", {
              measure_name: entry.name,
              measure_duration: Math.round(entry.duration),
              measure_start_time: Math.round(entry.startTime),
            });
          }
        });
      });

      observer.observe({ entryTypes: ["measure"] });
    }

    // Track navigation timing
    if ("PerformanceNavigationTiming" in window) {
      window.addEventListener("load", () => {
        const navigation = performance.getEntriesByType(
          "navigation"
        )[0] as PerformanceNavigationTiming;

        this.sendEvent("navigation_timing", {
          dom_content_loaded: Math.round(
            navigation.domContentLoadedEventEnd -
              navigation.domContentLoadedEventStart
          ),
          load_complete: Math.round(
            navigation.loadEventEnd - navigation.loadEventStart
          ),
          total_time: Math.round(
            navigation.loadEventEnd - navigation.fetchStart
          ),
        });
      });
    }
  }

  private trackErrors(): void {
    // Track JavaScript errors
    window.addEventListener("error", (event) => {
      this.sendEvent("javascript_error", {
        error_message: event.message,
        error_filename: event.filename,
        error_line: event.lineno,
        error_column: event.colno,
        page_location: window.location.href,
      });
    });

    // Track unhandled promise rejections
    window.addEventListener("unhandledrejection", (event) => {
      this.sendEvent("unhandled_promise_rejection", {
        error_message: event.reason?.message || "Unknown error",
        page_location: window.location.href,
      });
    });
  }

  // Public methods
  public sendEvent(eventName: string, parameters?: EventParams): void {
    if (!this.isInitialized) {
      log.warn("⚠️ Analytics not initialized", null, "AnalyticsService");
      return;
    }

    if (this.config.debug) {
      log.debug(`📊 GA4 Event: ${eventName}`, parameters, "AnalyticsService");
    }

    window.gtag?.("event", eventName, {
      ...parameters,
      ...this.userProperties,
    });
  }

  public setUserProperties(properties: UserProperties): void {
    if (!this.isInitialized) return;

    this.userProperties = { ...this.userProperties, ...properties };

    if (this.config.enableUserProperties) {
      window.gtag?.("config", this.config.measurementId, {
        user_properties: this.userProperties,
      });
    }
  }

  public setCustomDimensions(dimensions: Record<string, any>): void {
    if (!this.isInitialized) return;

    this.customDimensions = { ...this.customDimensions, ...dimensions };

    if (this.config.enableCustomDimensions) {
      window.gtag?.("config", this.config.measurementId, {
        custom_map: this.customDimensions,
      });
    }
  }

  // Drama Analyst specific tracking methods
  public trackFileUpload(
    fileType: string,
    fileSize: number,
    fileName: string
  ): void {
    this.sendEvent("file_upload", {
      event_category: "File Management",
      file_type: fileType,
      file_size: fileSize,
      file_name: fileName,
      custom_parameter_1: fileType,
      custom_parameter_3: fileSize,
    });
  }

  public trackTaskSelection(taskType: string, taskCategory: string): void {
    this.sendEvent("task_selection", {
      event_category: "Task Management",
      task_type: taskType,
      task_category: taskCategory,
      custom_parameter_2: taskType,
    });
  }

  public trackAnalysisStart(agent: string, fileCount: number): void {
    this.sendEvent("analysis_start", {
      event_category: "Analysis",
      agent: agent,
      file_count: fileCount,
      custom_parameter_2: agent,
    });
  }

  public trackAnalysisComplete(
    agent: string,
    duration: number,
    success: boolean
  ): void {
    this.sendEvent("analysis_complete", {
      event_category: "Analysis",
      agent: agent,
      duration: duration,
      success: success,
      custom_parameter_2: agent,
    });
  }

  public trackAnalysisError(
    agent: string,
    errorType: string,
    errorMessage: string
  ): void {
    this.sendEvent("analysis_error", {
      event_category: "Analysis",
      agent: agent,
      error_type: errorType,
      error_message: errorMessage,
      custom_parameter_2: agent,
    });
  }

  public trackUserEngagement(
    action: string,
    component: string,
    details?: Record<string, any>
  ): void {
    this.sendEvent("user_engagement", {
      event_category: "User Interaction",
      action: action,
      component: component,
      ...details,
    });
  }

  public trackFeatureUsage(feature: string, usage_count: number = 1): void {
    this.sendEvent("feature_usage", {
      event_category: "Feature Usage",
      feature: feature,
      usage_count: usage_count,
    });
  }

  public trackConversion(conversionType: string, value?: number): void {
    const eventParams: EventParams = {
      event_category: "Conversion",
      conversion_type: conversionType,
    };
    if (value !== undefined) {
      eventParams.value = value;
    }
    this.sendEvent("conversion", eventParams);
  }

  public trackSearch(searchTerm: string, resultsCount?: number): void {
    this.sendEvent("search", {
      event_category: "Search",
      search_term: searchTerm,
      results_count: resultsCount,
    });
  }

  public trackDownload(fileType: string, fileName: string): void {
    this.sendEvent("file_download", {
      event_category: "Download",
      file_type: fileType,
      file_name: fileName,
      custom_parameter_1: fileType,
    });
  }

  public trackShare(shareType: string, content: string): void {
    this.sendEvent("share", {
      event_category: "Social",
      share_type: shareType,
      content: content,
    });
  }

  public trackCustomEvent(eventName: string, parameters?: EventParams): void {
    this.sendEvent(eventName, {
      event_category: "Custom",
      ...parameters,
    });
  }

  // Privacy and consent methods
  public setConsent(
    consentType: "analytics_storage" | "ad_storage",
    consent: boolean
  ): void {
    if (!this.isInitialized) return;

    window.gtag?.("consent", "update", {
      [consentType]: consent ? "granted" : "denied",
    });
  }

  public setPrivacyMode(enabled: boolean): void {
    if (!this.isInitialized) return;

    this.config.enablePrivacyMode = enabled;

    window.gtag?.("config", this.config.measurementId, {
      anonymize_ip: enabled,
      allow_google_signals: !enabled,
      allow_ad_personalization_signals: !enabled,
    });
  }

  // Utility methods
  public isEnabled(): boolean {
    return this.isInitialized && !!this.config.measurementId;
  }

  public getConfig(): GA4Config {
    return { ...this.config };
  }

  public getUserProperties(): UserProperties {
    return { ...this.userProperties };
  }

  public getCustomDimensions(): Record<string, any> {
    return { ...this.customDimensions };
  }

  public destroy(): void {
    // Clear data layer
    if (window.dataLayer) {
      window.dataLayer.length = 0;
    }

    // Clear global functions
    if (window.gtag) {
      delete (window as any).gtag;
    }

    this.isInitialized = false;
    log.info("🔒 Analytics service destroyed", null, "AnalyticsService");
  }
}

// Create singleton instance
let analyticsService: AnalyticsService | null = null;

export const initAnalytics = (config: Partial<GA4Config>) => {
  if (analyticsService) {
    log.warn(
      "⚠️ Analytics service already initialized",
      null,
      "AnalyticsService"
    );
    return analyticsService;
  }

  analyticsService = new AnalyticsService(config);
  return analyticsService;
};

export const getAnalyticsService = () => analyticsService;

export const destroyAnalytics = () => {
  if (analyticsService) {
    analyticsService.destroy();
    analyticsService = null;
  }
};

// Export types
export type { GA4Config, EventParams, UserProperties };
