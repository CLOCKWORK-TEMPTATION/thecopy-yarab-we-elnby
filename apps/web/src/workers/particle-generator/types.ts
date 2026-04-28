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

export interface ParticleGenerationResult {
  type: "progress" | "complete" | "error";
  positions?: Float32Array;
  colors?: Float32Array;
  count?: number;
  originalPositions?: Float32Array;
  phases?: Float32Array;
  velocities?: Float32Array;
  progress?: number;
  error?: string;
}

export interface GeneratedParticlesPayload {
  positions: Float32Array;
  colors: Float32Array;
  count: number;
  originalPositions: Float32Array;
  phases: Float32Array;
  velocities: Float32Array;
}
