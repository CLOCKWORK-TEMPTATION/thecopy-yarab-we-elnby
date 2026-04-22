"use client";

import { logger } from "@/lib/ai/utils/logger";
import { useEffect } from "react";
import { initializeWebVitals } from "@/lib/web-vitals";

/**
 * Web Vitals Reporter Component
 *
 * This client component initializes Web Vitals reporting when mounted.
 * It should be included in the root layout to track performance metrics
 * across the entire application.
 *
 * The component:
 * - Reports Core Web Vitals (CLS, INP, FCP, LCP, TTFB) to Sentry
 * - Logs metrics in development mode
 * - Automatically categorizes metrics as good/needs-improvement/poor
 */
export default function WebVitalsReporter() {
  useEffect(() => {
    // Initialize Web Vitals reporting on mount
    initializeWebVitals();

    if (process.env["NODE_ENV"] === "development") {
      logger.info("[WebVitalsReporter] Web Vitals tracking initialized");
    }
  }, []);

  // This component doesn't render anything
  return null;
}
