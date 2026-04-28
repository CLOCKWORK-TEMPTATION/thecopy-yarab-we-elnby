// Pure per-frame helpers for the optimized particle animation.
// Shared between particle-background-optimized variants.

import type * as THREE from "three";

import {
  applyDefaultEffect,
  applySparkEffect,
  applyVortexEffect,
  applyWaveEffect,
  calculateVortexColor,
  calculateWaveColor,
  type EffectConfig,
  type ParticlePosition,
  type ParticleVelocity,
} from "@/components/particle-effects";

export type ParticleEffect = "default" | "spark" | "wave" | "vortex";

/**
 * Update camera position based on rotation.
 */
export const updateCameraPosition = (
  camera: THREE.PerspectiveCamera,
  rotationX: number,
  rotationY: number
): void => {
  camera.position.x = Math.sin(rotationY) * 3.5;
  camera.position.z = Math.cos(rotationY) * 3.5;
  camera.position.y = rotationX * 0.5;
  camera.lookAt(0, 0, 0);
};

/**
 * Apply attraction to original position.
 */
export const applyAttraction = (
  position: ParticlePosition,
  target: { x: number; y: number; z: number },
  velocity: ParticleVelocity,
  attractStrength: number
): ParticleVelocity => {
  return {
    vx: velocity.vx + (target.x - position.px) * attractStrength,
    vy: velocity.vy + (target.y - position.py) * attractStrength,
    vz: velocity.vz + (target.z - position.pz) * attractStrength,
  };
};

/**
 * Apply damping to velocity.
 */
export const applyDamping = (
  velocity: ParticleVelocity,
  damping: number
): ParticleVelocity => {
  return {
    vx: velocity.vx * damping,
    vy: velocity.vy * damping,
    vz: velocity.vz * damping,
  };
};

/**
 * Update position based on velocity.
 */
export const updatePosition = (
  position: ParticlePosition,
  velocity: ParticleVelocity
): ParticlePosition => {
  return {
    px: position.px + velocity.vx,
    py: position.py + velocity.vy,
    pz: position.pz + velocity.vz,
  };
};

/**
 * Calculate particle color based on effect.
 */
export const calculateParticleColor = (
  effect: ParticleEffect,
  position: ParticlePosition,
  intersection: THREE.Vector3 | null,
  effectRadius: number,
  time: number
): { r: number; g: number; b: number } => {
  if (!intersection) {
    return { r: 1, g: 1, b: 1 };
  }

  const intersectionPoint = {
    x: intersection.x,
    y: intersection.y,
    z: intersection.z,
  };

  if (effect === "wave") {
    return calculateWaveColor(position, intersectionPoint, effectRadius, time);
  }
  if (effect === "vortex") {
    return calculateVortexColor(
      position,
      intersectionPoint,
      effectRadius,
      time
    );
  }

  return { r: 1, g: 1, b: 1 };
};

/**
 * Apply particle effect using lookup strategy.
 */
export const applyParticleEffect = (
  effect: ParticleEffect,
  position: ParticlePosition,
  intersection: THREE.Vector3,
  velocity: ParticleVelocity,
  config: EffectConfig,
  time: number
): ParticleVelocity => {
  const intersectionPoint = {
    x: intersection.x,
    y: intersection.y,
    z: intersection.z,
  };

  switch (effect) {
    case "spark":
      return applySparkEffect(position, intersectionPoint, velocity, config);
    case "wave":
      return applyWaveEffect(
        position,
        intersectionPoint,
        velocity,
        config,
        time
      );
    case "vortex":
      return applyVortexEffect(position, intersectionPoint, velocity, config);
    case "default":
      return applyDefaultEffect(position, intersectionPoint, velocity, config);
  }
};
