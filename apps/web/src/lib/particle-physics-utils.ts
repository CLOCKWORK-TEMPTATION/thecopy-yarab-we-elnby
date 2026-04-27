/**
 * Particle physics utilities (camera positioning + per-frame physics step).
 * Pure math; no DOM, no logging.
 *
 * Shared across all particle-background variants in apps/web/src/components/.
 */

import type * as THREE from "three";

export type Effect = "default" | "spark" | "wave" | "vortex";

export interface ParticleAnimationConfig {
  intersectionPoint: { x: number; y: number; z: number } | null;
  effect?: Effect;
  repelStrength: number;
  damping: number;
}

export function updateCameraPosition(
  camera: THREE.PerspectiveCamera,
  rotationX: number,
  rotationY: number
): void {
  camera.position.x = Math.sin(rotationY) * 3.5;
  camera.position.z = Math.cos(rotationY) * 3.5;
  camera.position.y = rotationX * 0.5;
  camera.lookAt(0, 0, 0);
}

export function updateParticlePhysics(
  ...[
    positions,
    velocities,
    originalPositions,
    _colors,
    particleCount,
    config,
  ]: [
    Float32Array,
    Float32Array,
    Float32Array,
    Float32Array,
    number,
    ParticleAnimationConfig,
  ]
): void {
  const { intersectionPoint, repelStrength, damping } = config;

  for (let i = 0; i < particleCount; i++) {
    const idx = i * 3;

    // Current state
    const px = positions[idx] ?? 0;
    const py = positions[idx + 1] ?? 0;
    const pz = positions[idx + 2] ?? 0;

    const vx = velocities[idx] ?? 0;
    const vy = velocities[idx + 1] ?? 0;
    const vz = velocities[idx + 2] ?? 0;

    // Original position for attraction
    const opx = originalPositions[idx] ?? 0;
    const opy = originalPositions[idx + 1] ?? 0;
    const opz = originalPositions[idx + 2] ?? 0;

    let nvx = vx * damping;
    let nvy = vy * damping;
    let nvz = vz * damping;

    // Attraction to original position
    const adx = opx - px;
    const ady = opy - py;
    const adz = opz - pz;
    const aDist = Math.sqrt(adx * adx + ady * ady + adz * adz);

    if (aDist > 0.01) {
      const aNorm = 0.02 / (aDist + 0.001);
      nvx += adx * aNorm;
      nvy += ady * aNorm;
      nvz += adz * aNorm;
    }

    // Repulsion from intersection point
    if (intersectionPoint) {
      const rdx = px - intersectionPoint.x;
      const rdy = py - intersectionPoint.y;
      const rdz = pz - intersectionPoint.z;
      const rDist = Math.sqrt(rdx * rdx + rdy * rdy + rdz * rdz);

      if (rDist < 0.5) {
        const rForce = repelStrength / (rDist + 0.01);
        nvx += (rdx / (rDist + 0.001)) * rForce;
        nvy += (rdy / (rDist + 0.001)) * rForce;
        nvz += (rdz / (rDist + 0.001)) * rForce;
      }
    }

    // Update velocities
    velocities[idx] = nvx;
    velocities[idx + 1] = nvy;
    velocities[idx + 2] = nvz;

    // Update positions
    positions[idx] = px + nvx;
    positions[idx + 1] = py + nvy;
    positions[idx + 2] = pz + nvz;
  }
}
