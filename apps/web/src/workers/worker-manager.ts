import { logger } from "@/lib/ai/utils/logger";

/**
 * Worker Manager for handling Web Worker lifecycle and communication
 */

import type {
  GenerateParticlesMessage,
  ParticleGenerationResult,
  UpdateParticlesMessage,
  UpdateParticlesResult,
  ParticleData,
  WorkerPool,
} from "@/workers/types";

export class ParticleWorkerManager {
  private workerPool: WorkerPool = {
    generatorWorker: null,
    physicsWorker: null,
  };

  /**
   * Initialize workers
   */
  async initializeWorkers(): Promise<void> {
    try {
      // Initialize particle generator worker
      this.workerPool.generatorWorker = new Worker(
        new URL("./particle-generator.worker.ts", import.meta.url),
        { type: "module" }
      );

      // Initialize particle physics worker
      this.workerPool.physicsWorker = new Worker(
        new URL("./particle-physics.worker.ts", import.meta.url),
        { type: "module" }
      );
    } catch (error) {
      logger.error("Failed to initialize workers");
      throw error;
    }
  }

  /**
   * Generate particles using Web Worker
   */
  generateParticles(
    config: GenerateParticlesMessage["config"],
    onProgress?: (progress: number, count: number) => void
  ): Promise<ParticleData> {
    return new Promise((resolve, reject) => {
      if (!this.workerPool.generatorWorker) {
        reject(new Error("Generator worker not initialized"));
        return;
      }

      const worker = this.workerPool.generatorWorker;

      const handleMessage = (event: MessageEvent<ParticleGenerationResult>) => {
        const result = event.data;

        if (result.type === "progress") {
          if (onProgress) {
            onProgress(result.progress, result.count);
          }
        } else if (result.type === "complete") {
          worker.removeEventListener("message", handleMessage);
          resolve({
            positions: result.positions,
            velocities: result.velocities,
            originalPositions: result.originalPositions,
            colors: result.colors,
            phases: result.phases,
            count: result.count,
          });
        } else if (result.type === "error") {
          worker.removeEventListener("message", handleMessage);
          reject(new Error(result.error));
        }
      };

      worker.addEventListener("message", handleMessage);

      // Send generation request
      const message: GenerateParticlesMessage = {
        type: "generate",
        config,
      };
      worker.postMessage(message);
    });
  }

  /**
   * Update particle positions and colors using Web Worker
   */
  updateParticles(data: UpdateParticlesMessage): Promise<{
    positions: Float32Array;
    velocities: Float32Array;
    colors: Float32Array;
  }> {
    return new Promise((resolve, reject) => {
      if (!this.workerPool.physicsWorker) {
        reject(new Error("Physics worker not initialized"));
        return;
      }

      const worker = this.workerPool.physicsWorker;

      const handleMessage = (event: MessageEvent<UpdateParticlesResult>) => {
        const result = event.data;

        if (result.type === "updated") {
          worker.removeEventListener("message", handleMessage);
          resolve({
            positions: result.positions,
            velocities: result.velocities,
            colors: result.colors,
          });
        } else if (result.type === "error") {
          worker.removeEventListener("message", handleMessage);
          reject(new Error(result.error));
        }
      };

      worker.addEventListener("message", handleMessage);

      // Send update request with transferable objects
      worker.postMessage(data, [
        data.positions.buffer,
        data.velocities.buffer,
        data.colors.buffer,
      ]);
    });
  }

  /**
   * Terminate all workers and cleanup
   */
  terminate(): void {
    if (this.workerPool.generatorWorker) {
      this.workerPool.generatorWorker.terminate();
      this.workerPool.generatorWorker = null;
    }

    if (this.workerPool.physicsWorker) {
      this.workerPool.physicsWorker.terminate();
      this.workerPool.physicsWorker = null;
    }
  }

  /**
   * Check if workers are initialized
   */
  isInitialized(): boolean {
    return !!(this.workerPool.generatorWorker && this.workerPool.physicsWorker);
  }
}
