import { onCLS, onFCP, onINP, onLCP, onTTFB } from "web-vitals";

import { logger } from "@/lib/ai/utils/logger";

/**
 * Web Vitals reporting
 */

export function reportWebVitals(onPerfEntry?: (metric: any) => void) {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    onCLS(onPerfEntry);
    onFCP(onPerfEntry);
    onINP(onPerfEntry); // INP replaced FID in web-vitals v3+
    onLCP(onPerfEntry);
    onTTFB(onPerfEntry);
  }
}

/**
 * Initialize Web Vitals reporting with default logging
 */
export function initializeWebVitals() {
  reportWebVitals((metric) => {
    if (process.env.NODE_ENV === "development") {
      logger.info(`[Web Vitals] ${metric.name}: ${metric.value}`);
    }
    // In production, you could send to analytics service
  });
}

export default reportWebVitals;
