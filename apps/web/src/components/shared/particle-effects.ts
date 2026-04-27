/**
 * Particle effect helper functions with LOD support
 * Extracted from particle-background.tsx to reduce complexity
 *
 * Features:
 * - Device detection and performance adaptation
 * - Level of Detail (LOD) system
 * - Dynamic quality adjustment
 */

import {
  getDeviceCapabilities,
  getParticleLODConfig,
  PerformanceMonitor,
} from "@/components/device-detection";

/**
 * Enhanced requestIdleCallback with fallback
 */
export const requestIdle = (
  callback: IdleRequestCallback,
  options?: IdleRequestOptions
): number => {
  if (typeof requestIdleCallback !== "undefined") {
    return requestIdleCallback(callback, options);
  } else {
    // Fallback to setTimeout
    return setTimeout(
      () =>
        callback({
          timeRemaining: () => Math.max(0, 50), // Simulate 50ms remaining time
          didTimeout: false,
        }),
      options?.timeout ?? 0
    ) as unknown as number;
  }
};

/**
 * Cancel idle callback
 */
export const cancelIdle = (id: number): void => {
  if (typeof cancelIdleCallback !== "undefined") {
    cancelIdleCallback(id);
  } else {
    clearTimeout(id);
  }
};

/**
 * Batch processor for particle operations
 */
export class BatchProcessor<T = unknown> {
  private items: T[] = [];
  private batchSize: number;

  constructor(batchSize = 500) {
    this.batchSize = batchSize;
  }

  add(item: T): void {
    this.items.push(item);
  }

  processBatch(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const batch = this.items.splice(0, this.batchSize);

        if (batch.length === 0) {
          resolve();
          return;
        }

        requestIdle(
          () => {
            try {
              void batch;
              resolve();
            } catch (error) {
              reject(error instanceof Error ? error : new Error(String(error)));
            }
          },
          { timeout: 100 }
        );
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }
}

export interface ParticleVelocity {
  vx: number;
  vy: number;
  vz: number;
}

export interface ParticlePosition {
  px: number;
  py: number;
  pz: number;
}

export interface EffectConfig {
  effectRadius: number;
  repelStrength: number;
}

/**
 * Apply spark effect to particle with error handling
 */
export function applySparkEffect(
  particle: ParticlePosition,
  intersection: { x: number; y: number; z: number },
  velocity: ParticleVelocity,
  config: EffectConfig
): ParticleVelocity {
  try {
    const dx = particle.px - intersection.x;
    const dy = particle.py - intersection.y;
    const dz = particle.pz - intersection.z;
    const distSq = dx * dx + dy * dy + dz * dz;

    if (distSq < config.effectRadius * config.effectRadius && distSq > 0.0001) {
      const dist = Math.sqrt(distSq);
      const force = (1 - dist / config.effectRadius) * config.repelStrength * 3;
      return {
        vx: velocity.vx + (dx / dist) * force,
        vy: velocity.vy + (dy / dist) * force,
        vz: velocity.vz + (dz / dist) * force,
      };
    }

    return velocity;
  } catch (error) {
    console.warn("خطأ في تأثير الشرر:", error);
    return velocity;
  }
}

/**
 * Apply wave effect to particle with error handling
 */
export function applyWaveEffect(
  particle: ParticlePosition,
  intersection: { x: number; y: number; z: number },
  velocity: ParticleVelocity,
  config: EffectConfig,
  time: number
): ParticleVelocity {
  try {
    const dx = particle.px - intersection.x;
    const dy = particle.py - intersection.y;
    const dz = particle.pz - intersection.z;
    const distSq = dx * dx + dy * dy + dz * dz;

    if (distSq < config.effectRadius * config.effectRadius) {
      const dist = Math.sqrt(distSq);
      const wavePhase = time * 8 - dist * 12;
      const waveStrength = 0.12;
      const waveForce =
        Math.sin(wavePhase) * waveStrength * (1 - dist / config.effectRadius);
      if (dist > 0.001) {
        return {
          vx: velocity.vx + (dx / dist) * waveForce,
          vy: velocity.vy + (dy / dist) * waveForce,
          vz: velocity.vz + waveForce * 0.5,
        };
      }
    }

    return velocity;
  } catch (error) {
    console.warn("خطأ في تأثير الموجة:", error);
    return velocity;
  }
}

/**
 * Apply vortex effect to particle with error handling
 */
export function applyVortexEffect(
  particle: ParticlePosition,
  intersection: { x: number; y: number; z: number },
  velocity: ParticleVelocity,
  config: EffectConfig
): ParticleVelocity {
  try {
    const dx = particle.px - intersection.x;
    const dy = particle.py - intersection.y;
    const dz = particle.pz - intersection.z;
    const distSq = dx * dx + dy * dy + dz * dz;
    const dist = Math.sqrt(distSq);

    if (distSq < config.effectRadius * config.effectRadius && dist > 0.05) {
      const vortexStrength = 0.15;
      const spiralForce = vortexStrength * (1 - dist / config.effectRadius);

      const tangentX = -dy;
      const tangentY = dx;
      const tangentLength = Math.sqrt(
        tangentX * tangentX + tangentY * tangentY
      );

      let newVx = velocity.vx;
      let newVy = velocity.vy;

      if (tangentLength > 0.001) {
        newVx += (tangentX / tangentLength) * spiralForce;
        newVy += (tangentY / tangentLength) * spiralForce;
      }

      const pullStrength = spiralForce * 0.3;
      newVx -= (dx / dist) * pullStrength;
      newVy -= (dy / dist) * pullStrength;

      return {
        vx: newVx,
        vy: newVy,
        vz: velocity.vz,
      };
    }

    return velocity;
  } catch (error) {
    console.warn("خطأ في تأثير الدوامة:", error);
    return velocity;
  }
}

/**
 * Apply default repel effect to particle with error handling
 */
export function applyDefaultEffect(
  particle: ParticlePosition,
  intersection: { x: number; y: number; z: number },
  velocity: ParticleVelocity,
  config: EffectConfig
): ParticleVelocity {
  try {
    const dx = particle.px - intersection.x;
    const dy = particle.py - intersection.y;
    const dz = particle.pz - intersection.z;
    const distSq = dx * dx + dy * dy + dz * dz;
    const dist = Math.sqrt(distSq);

    if (distSq < config.effectRadius * config.effectRadius && distSq > 0.0001) {
      const force = (1 - dist / config.effectRadius) * config.repelStrength;
      return {
        vx: velocity.vx + (dx / dist) * force,
        vy: velocity.vy + (dy / dist) * force,
        vz: velocity.vz + (dz / dist) * force,
      };
    }

    return velocity;
  } catch (error) {
    console.warn("خطأ في التأثير الافتراضي:", error);
    return velocity;
  }
}

/**
 * Calculate color for wave effect with error handling
 */
export function calculateWaveColor(
  particle: ParticlePosition,
  intersection: { x: number; y: number; z: number },
  effectRadius: number,
  time: number
): { r: number; g: number; b: number } {
  try {
    const dx = particle.px - intersection.x;
    const dy = particle.py - intersection.y;
    const dz = particle.pz - intersection.z;
    const distSq = dx * dx + dy * dy + dz * dz;
    const dist = Math.sqrt(distSq);

    if (distSq < effectRadius * effectRadius) {
      const wavePhase = time * 8 - dist * 15;
      const intensity =
        Math.abs(Math.sin(wavePhase)) * (1 - dist / effectRadius) + 1;
      return {
        r: intensity * 0.5 + 0.8,
        g: intensity * 0.8 + 0.6,
        b: intensity * 1.2 + 0.4,
      };
    }

    return { r: 1, g: 1, b: 1 };
  } catch (error) {
    console.warn("خطأ في حساب لون الموجة:", error);
    return { r: 1, g: 1, b: 1 };
  }
}

/**
 * Calculate color for vortex effect with error handling
 */
export function calculateVortexColor(
  particle: ParticlePosition,
  intersection: { x: number; y: number; z: number },
  effectRadius: number,
  time: number
): { r: number; g: number; b: number } {
  try {
    const dx = particle.px - intersection.x;
    const dy = particle.py - intersection.y;
    const dz = particle.pz - intersection.z;
    const distSq = dx * dx + dy * dy + dz * dz;
    const dist = Math.sqrt(distSq);

    if (distSq < effectRadius * effectRadius) {
      const angle = Math.atan2(dy, dx) + time * 5;
      const intensity = (1 - dist / effectRadius) * 2 + 1;
      return {
        r: (Math.sin(angle) * 0.5 + 0.5) * intensity,
        g: (Math.sin(angle + (Math.PI * 2) / 3) * 0.5 + 0.5) * intensity,
        b: (Math.sin(angle + (Math.PI * 4) / 3) * 0.5 + 0.5) * intensity,
      };
    }

    return { r: 1, g: 1, b: 1 };
  } catch (error) {
    console.warn("خطأ في حساب لون الدوامة:", error);
    return { r: 1, g: 1, b: 1 };
  }
}

/**
 * Get optimized particle configuration based on device capabilities
 */
export function getOptimizedParticleConfig() {
  const capabilities = getDeviceCapabilities();
  const lodConfig = getParticleLODConfig(capabilities);

  return {
    capabilities,
    lodConfig,
    shouldUseSimplifiedPhysics: capabilities.performanceTier === "low",
    shouldSkipFrames: capabilities.isLowPowerMode,
  };
}

/**
 * Export performance monitor instance
 */
export const performanceMonitor = new PerformanceMonitor();
