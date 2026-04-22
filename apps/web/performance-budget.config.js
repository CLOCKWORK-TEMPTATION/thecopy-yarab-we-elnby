/**
 * Performance Budget Configuration
 *
 * This file defines strict performance budgets for the application.
 * These budgets are enforced in CI/CD pipeline to ensure optimal performance.
 *
 * @see https://web.dev/performance-budgets-101/
 */

module.exports = {
  // Resource Size Budgets (in KB)
  resourceSizes: {
    // JavaScript budgets
    javascript: {
      total: 350, // Total JS bundle size (compressed)
      mainBundle: 250, // Main bundle size
      vendorBundle: 200, // Third-party dependencies
      perRoute: 50, // Per-route chunk size
    },
    // CSS budgets
    css: {
      total: 100, // Total CSS size (compressed)
      critical: 20, // Critical CSS for above-the-fold
      perPage: 30, // Per-page CSS
    },
    // Image budgets
    images: {
      total: 500, // Total images size per page
      hero: 150, // Hero/banner images
      thumbnail: 30, // Thumbnail images
      icon: 10, // Icon images
    },
    // Font budgets
    fonts: {
      total: 100, // Total fonts size
      perFont: 30, // Per font file
    },
    // Total page weight
    pageWeight: {
      total: 1500, // Total page size (all resources)
      firstLoad: 1000, // First page load
      subsequentLoads: 500, // Subsequent page loads
    },
  },

  // Web Vitals Budgets
  webVitals: {
    // Largest Contentful Paint (LCP)
    lcp: {
      good: 2500, // Good: <= 2.5s
      needsImprovement: 4000, // Needs improvement: 2.5s - 4s
      // Poor: > 4s
    },
    // First Input Delay (FID)
    fid: {
      good: 100, // Good: <= 100ms
      needsImprovement: 300, // Needs improvement: 100ms - 300ms
      // Poor: > 300ms
    },
    // Cumulative Layout Shift (CLS)
    cls: {
      good: 0.1, // Good: <= 0.1
      needsImprovement: 0.25, // Needs improvement: 0.1 - 0.25
      // Poor: > 0.25
    },
    // First Contentful Paint (FCP)
    fcp: {
      good: 1800, // Good: <= 1.8s
      needsImprovement: 3000, // Needs improvement: 1.8s - 3s
      // Poor: > 3s
    },
    // Time to Interactive (TTI)
    tti: {
      good: 3800, // Good: <= 3.8s
      needsImprovement: 7300, // Needs improvement: 3.8s - 7.3s
      // Poor: > 7.3s
    },
    // Total Blocking Time (TBT)
    tbt: {
      good: 200, // Good: <= 200ms
      needsImprovement: 600, // Needs improvement: 200ms - 600ms
      // Poor: > 600ms
    },
    // Speed Index
    speedIndex: {
      good: 3400, // Good: <= 3.4s
      needsImprovement: 5800, // Needs improvement: 3.4s - 5.8s
      // Poor: > 5.8s
    },
  },

  // Lighthouse Score Budgets (0-1 scale)
  lighthouseScores: {
    performance: 0.9, // 90/100 minimum
    accessibility: 0.95, // 95/100 minimum
    bestPractices: 0.95, // 95/100 minimum
    seo: 0.95, // 95/100 minimum
    pwa: 0.8, // 80/100 minimum (if applicable)
  },

  // Network Request Budgets
  networkRequests: {
    total: 50, // Maximum total requests
    javascript: 15, // Maximum JS requests
    css: 5, // Maximum CSS requests
    images: 20, // Maximum image requests
    fonts: 5, // Maximum font requests
    thirdParty: 10, // Maximum third-party requests
  },

  // Timing Budgets (in milliseconds)
  timings: {
    serverResponseTime: 500, // TTFB - Time to First Byte
    domContentLoaded: 2000, // DOMContentLoaded event
    loadEvent: 4000, // Load event
    firstMeaningfulPaint: 2500, // First Meaningful Paint
    timeToInteractive: 3800, // Time to Interactive
  },

  // Bundle Analysis Budgets
  bundleAnalysis: {
    // Maximum number of duplicate dependencies
    maxDuplicateDependencies: 0,
    // Maximum size of individual chunk (KB)
    maxChunkSize: 244, // ~250KB is the recommended max
    // Minimum compression ratio
    minCompressionRatio: 0.3, // 30% of original size
  },

  // Cache Performance
  cachePerformance: {
    // Minimum cache hit rate (percentage)
    minCacheHitRate: 80,
    // Maximum cache miss penalty (ms)
    maxCacheMissPenalty: 500,
  },

  // Mobile-Specific Budgets (stricter)
  mobile: {
    pageWeight: {
      total: 1000, // 1MB total for mobile
      firstLoad: 700, // 700KB first load
    },
    javascript: {
      total: 250, // 250KB total JS
      mainBundle: 170, // 170KB main bundle
    },
    webVitals: {
      lcp: 2000, // 2s for mobile
      fid: 100, // 100ms for mobile
      cls: 0.05, // 0.05 for mobile
    },
  },

  // CI/CD Enforcement Rules
  enforcement: {
    // Fail build if exceeded
    strict: [
      "webVitals.lcp.needsImprovement",
      "webVitals.cls.needsImprovement",
      "lighthouseScores.performance",
      "lighthouseScores.accessibility",
      "resourceSizes.pageWeight.total",
    ],
    // Warn but don't fail
    warnings: [
      "resourceSizes.javascript.total",
      "resourceSizes.css.total",
      "networkRequests.total",
      "timings.serverResponseTime",
    ],
    // Track but don't enforce (for monitoring)
    tracking: [
      "bundleAnalysis.maxDuplicateDependencies",
      "cachePerformance.minCacheHitRate",
    ],
  },
};
