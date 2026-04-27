// Async batched particle generation for the wordmark animation.
// Shared between particle-background-optimized variants.
//
// The error reporter is injected so each consumer can keep its own
// logger style (structured logger vs console).

import {
  PARTICLE_THRESHOLDS,
  SAMPLING_BOUNDS,
} from "@/components/particle-letters.constants";
import { dist } from "@/lib/particle-letters-sdf";
import { type ParticleLODConfig } from "@/components/device-detection";

import { getOptimalParticleCount, requestIdle } from "./particle-lod-utils";

export type ParticleErrorReporter = (error: unknown) => void;

export interface GeneratedParticles {
  positions: Float32Array;
  colors: Float32Array;
  count: number;
  originalPositions: Float32Array;
  phases: Float32Array;
  velocities: Float32Array;
  lodConfig: ParticleLODConfig | null;
}

/**
 * Generate particles in batches using requestIdleCallback.
 * @param reportError Called with the thrown error before re-throwing.
 *                    Allows each variant to log via its own logger style.
 */
export const generateParticlesInBatches = async (
  reportError: ParticleErrorReporter
): Promise<GeneratedParticles> => {
  try {
    // Get optimal particle count based on device capabilities
    const particleConfig = getOptimalParticleCount();

    // If no particles should be rendered (reduced motion preference)
    if (particleConfig.count === 0) {
      return {
        positions: new Float32Array(0),
        colors: new Float32Array(0),
        count: 0,
        originalPositions: new Float32Array(0),
        phases: new Float32Array(0),
        velocities: new Float32Array(0),
        lodConfig: null,
      };
    }

    const numParticles = particleConfig.count;
    const batchSize = particleConfig.batchSize;
    const thickness = 0.15;

    const positions = new Float32Array(numParticles * 3);
    const colors = new Float32Array(numParticles * 3);

    // Sampling bounds
    const { minX, maxX, minY, maxY } = SAMPLING_BOUNDS;

    let generatedCount = 0;
    const maxAttempts = 3000000;
    let attempts = 0;
    let batchAttempts = 0;
    const maxBatchAttempts = 50000;

    const processBatch = (): Promise<void> => {
      return new Promise((resolve) => {
        let batchGenerated = 0;

        while (
          batchGenerated < batchSize &&
          generatedCount < numParticles &&
          attempts < maxAttempts &&
          batchAttempts < maxBatchAttempts
        ) {
          attempts++;
          batchAttempts++;

          const x = Math.random() * (maxX - minX) + minX;
          const y = Math.random() * (maxY - minY) + minY;
          const z = Math.random() * thickness - thickness / 2;

          const d = dist(x, y);
          const threshold =
            x > 2.5 ? PARTICLE_THRESHOLDS.arabic : PARTICLE_THRESHOLDS.english;

          if (d <= threshold) {
            const idx = generatedCount * 3;
            positions[idx] = x;
            positions[idx + 1] = y;
            positions[idx + 2] = z;
            colors[idx] = 1;
            colors[idx + 1] = 1;
            colors[idx + 2] = 1;
            generatedCount++;
            batchGenerated++;
          }
        }

        if (
          generatedCount < numParticles &&
          attempts < maxAttempts &&
          batchAttempts < maxBatchAttempts
        ) {
          requestIdle(() => resolve(), { timeout: 100 });
        } else {
          resolve();
        }
      });
    };

    // Process all batches
    while (generatedCount < numParticles && attempts < maxAttempts) {
      await processBatch();
    }

    // If SDF sampling produced too few points, fall back to a simple starfield
    if (generatedCount < 200) {
      const fallbackCount = Math.min(numParticles, 3000);
      for (let j = 0; j < fallbackCount; j++) {
        const idx = j * 3;
        positions[idx] = (Math.random() - 0.5) * 6;
        positions[idx + 1] = (Math.random() - 0.5) * 3.5;
        positions[idx + 2] = (Math.random() - 0.5) * 0.3;
        colors[idx] = 1;
        colors[idx + 1] = 1;
        colors[idx + 2] = 1;
      }
      generatedCount = fallbackCount;
    }

    // Create final arrays
    const finalPositions = positions.slice(0, generatedCount * 3);
    const finalColors = colors.slice(0, generatedCount * 3);
    const originalPositions = positions.slice(0, generatedCount * 3);
    const phases = new Float32Array(generatedCount);
    const velocities = new Float32Array(generatedCount * 3);

    for (let j = 0; j < generatedCount; j++) {
      phases[j] = Math.random() * Math.PI * 2;
    }

    return {
      positions: finalPositions,
      colors: finalColors,
      count: generatedCount,
      originalPositions,
      phases,
      velocities,
      lodConfig: particleConfig.config,
    };
  } catch (error) {
    reportError(error);
    throw error;
  }
};
