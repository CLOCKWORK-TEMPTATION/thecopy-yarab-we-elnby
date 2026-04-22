/**
 * Revalidation Configuration for Next.js App Router
 *
 * استراتيجيات الكاش والـ Revalidation لتحسين الأداء على Vercel
 */

export const REVALIDATION_TIMES = {
  // Static pages - revalidate every 24 hours
  STATIC: 86400, // 24 hours

  // Semi-static pages - revalidate every hour
  SEMI_STATIC: 3600, // 1 hour

  // Dynamic pages - revalidate every 5 minutes
  DYNAMIC: 300, // 5 minutes

  // Real-time pages - no caching
  REALTIME: 0,
} as const;

export const PAGE_REVALIDATION = {
  // Landing page - static content
  home: REVALIDATION_TIMES.STATIC,

  // Directors Studio - semi-static (user-specific but cacheable)
  directorsStudio: REVALIDATION_TIMES.SEMI_STATIC,

  // Analysis pages - dynamic
  analysis: REVALIDATION_TIMES.DYNAMIC,

  // Real-time features
  metrics: REVALIDATION_TIMES.REALTIME,
} as const;
