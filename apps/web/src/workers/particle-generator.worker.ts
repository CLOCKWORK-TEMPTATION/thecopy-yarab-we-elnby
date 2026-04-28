/**
 * Web Worker for particle generation
 * Offloads heavy SDF calculations and particle generation from main thread
 */

import type {
  GenerateParticlesMessage,
  ParticleGenerationResult,
} from "./particle-generator/types";
import { generateParticles } from "./particle-generator/particleGen";

function isTrustedWorkerMessage(event: MessageEvent<unknown>): boolean {
  return event.origin === "" || event.origin === self.location.origin;
}

self.addEventListener(
  "message",
  (event: MessageEvent<GenerateParticlesMessage>) => {
    if (!isTrustedWorkerMessage(event)) {
      return;
    }

    const { type, config } = event.data;

    if (type === "generate") {
      try {
        const result = generateParticles(config);
        const completeMessage: ParticleGenerationResult = {
          type: "complete",
          ...result,
        };

        self.postMessage(completeMessage, {
          transfer: [
            result.positions.buffer,
            result.colors.buffer,
            result.originalPositions.buffer,
            result.phases.buffer,
            result.velocities.buffer,
          ],
        });
      } catch (error) {
        const errorMessage: ParticleGenerationResult = {
          type: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        };
        self.postMessage(errorMessage);
      }
    }
  }
);

export {};
