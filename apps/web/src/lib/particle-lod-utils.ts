// LOD configuration + idle scheduling for particle animations.
// Shared between particle-background-optimized variants in apps/web/src/components/.

import {
  getDeviceCapabilities,
  getParticleLODConfig,
  logDeviceCapabilities,
  type ParticleLODConfig,
} from "@/components/device-detection";

/**
 * Get optimal particle configuration using device detection.
 */
export function getOptimalParticleCount(): {
  count: number;
  batchSize: number;
  config: ParticleLODConfig | null;
} {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return { count: 3000, batchSize: 400, config: null };
  }

  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  if (prefersReducedMotion) {
    return { count: 0, batchSize: 0, config: null };
  }

  // Use device detection system
  const capabilities = getDeviceCapabilities();
  const lodConfig = getParticleLODConfig(capabilities);

  // Calculate batch size based on particle count (20-25% of total)
  const batchSize = Math.floor(lodConfig.particleCount * 0.22);

  // Log device capabilities in development
  if (process.env.NODE_ENV === "development") {
    logDeviceCapabilities();
  }

  return {
    count: lodConfig.particleCount,
    batchSize: batchSize,
    config: lodConfig,
  };
}

/**
 * Enhanced requestIdleCallback with fallback for environments without it.
 */
export const requestIdle = (
  callback: IdleRequestCallback,
  options?: IdleRequestOptions
): number => {
  if (typeof requestIdleCallback !== "undefined") {
    return requestIdleCallback(callback, options);
  } else {
    return setTimeout(
      () =>
        callback({
          timeRemaining: () => Math.max(0, 50),
          didTimeout: false,
        }),
      options?.timeout ?? 0
    ) as unknown as number;
  }
};
