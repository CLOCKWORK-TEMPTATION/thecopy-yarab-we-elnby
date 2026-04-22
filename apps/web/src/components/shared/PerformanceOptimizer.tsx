/**
 * Performance Optimizer Component
 *
 * Provides performance optimizations including:
 * - Image lazy loading
 * - Resource hints
 * - Component code splitting
 */

"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Extend Window interface for TypeScript
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Track page views and performance metrics
 */
export function PerformanceOptimizer() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Report Web Vitals on route change
    if (typeof window !== "undefined" && "performance" in window) {
      // Log navigation timing
      const navigationTiming = performance.getEntriesByType(
        "navigation"
      )[0] as PerformanceNavigationTiming;

      if (navigationTiming) {
        const pageLoadTime =
          navigationTiming.loadEventEnd - navigationTiming.fetchStart;
        console.log(`[Performance] Page load time: ${pageLoadTime}ms`);

        // Report to analytics if needed
        if (window.gtag) {
          window.gtag("event", "page_load_time", {
            value: pageLoadTime,
            page_path: pathname,
          });
        }
      }
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    // Implement Intersection Observer for lazy loading images
    if ("IntersectionObserver" in window) {
      const imageObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const img = entry.target as HTMLImageElement;
              const src = img.dataset.src;

              if (src) {
                img.src = src;
                img.removeAttribute("data-src");
                imageObserver.unobserve(img);
              }
            }
          });
        },
        {
          rootMargin: "50px 0px",
          threshold: 0.01,
        }
      );

      // Observe all images with data-src attribute
      document.querySelectorAll("img[data-src]").forEach((img) => {
        imageObserver.observe(img);
      });

      return () => {
        imageObserver.disconnect();
      };
    }

    return undefined;
  }, [pathname]);

  return null;
}

/**
 * Preload critical resources
 */
export function PreloadResources() {
  return (
    <>
      {/* Preload critical CSS */}
      <link
        rel="preload"
        href="/fonts/literata.woff2"
        as="font"
        type="font/woff2"
        crossOrigin="anonymous"
      />

      {/* Prefetch for next likely navigation */}
      <link rel="prefetch" href="/api/health" />
    </>
  );
}

export default PerformanceOptimizer;
