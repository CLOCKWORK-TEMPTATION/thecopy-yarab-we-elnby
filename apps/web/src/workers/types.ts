/**
 * Type definitions for Web Workers
 */

export interface ParticlePosition {
  px: number;
  py: number;
  pz: number;
}

export interface ParticleVelocity {
  vx: number;
  vy: number;
  vz: number;
}

export interface EffectConfig {
  effectRadius: number;
  repelStrength: number;
}

export type Effect = "default" | "spark" | "wave" | "vortex";

// ====== Particle Generator Worker Types ======

export interface GenerateParticlesMessage {
  type: "generate";
  config: {
    numParticles: number;
    thickness: number;
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    maxAttempts: number;
    batchSize: number;
  };
}

export interface ParticleGenerationProgressResult {
  type: "progress";
  progress: number;
  count: number;
}

export interface ParticleGenerationCompleteResult {
  type: "complete";
  positions: Float32Array;
  colors: Float32Array;
  count: number;
  originalPositions: Float32Array;
  phases: Float32Array;
  velocities: Float32Array;
}

export interface ParticleGenerationErrorResult {
  type: "error";
  error: string;
}

export type ParticleGenerationResult =
  | ParticleGenerationProgressResult
  | ParticleGenerationCompleteResult
  | ParticleGenerationErrorResult;

// ====== Particle Physics Worker Types ======

export interface UpdateParticlesMessage {
  type: "update";
  positions: Float32Array;
  velocities: Float32Array;
  originalPositions: Float32Array;
  colors: Float32Array;
  particleCount: number;
  config: {
    effect: Effect;
    effectRadius: number;
    repelStrength: number;
    attractStrength: number;
    damping: number;
    intersectionPoint: { x: number; y: number; z: number } | null;
    time: number;
  };
}

export interface UpdateParticlesSuccessResult {
  type: "updated";
  positions: Float32Array;
  velocities: Float32Array;
  colors: Float32Array;
}

export interface UpdateParticlesErrorResult {
  type: "error";
  error: string;
}

export type UpdateParticlesResult =
  | UpdateParticlesSuccessResult
  | UpdateParticlesErrorResult;

// ====== Worker Manager Types ======

export interface WorkerPool {
  generatorWorker: Worker | null;
  physicsWorker: Worker | null;
}

export interface ParticleData {
  positions: Float32Array;
  velocities: Float32Array;
  originalPositions: Float32Array;
  colors: Float32Array;
  phases: Float32Array;
  count: number;
}
