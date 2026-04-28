import type {
  GenerateParticlesMessage,
  GeneratedParticlesPayload,
} from "./types";
import { dist_all } from "./letterShapes";

export function generateParticles(
  config: GenerateParticlesMessage["config"]
): GeneratedParticlesPayload {
  const { numParticles, thickness, minX, maxX, minY, maxY, maxAttempts } =
    config;

  const positions = new Float32Array(numParticles * 3);
  const colors = new Float32Array(numParticles * 3);

  let generatedCount = 0;
  let attempts = 0;

  while (generatedCount < numParticles && attempts < maxAttempts) {
    attempts++;

    const x = Math.random() * (maxX - minX) + minX;
    const y = Math.random() * (maxY - minY) + minY;
    const z = Math.random() * thickness - thickness / 2;

    const d = dist_all(x, y);
    const threshold = x > 2.5 ? 0.015 : 0.01;

    if (d <= threshold) {
      const idx = generatedCount * 3;
      positions[idx] = x;
      positions[idx + 1] = y;
      positions[idx + 2] = z;
      colors[idx] = 1;
      colors[idx + 1] = 1;
      colors[idx + 2] = 1;
      generatedCount++;
    }
  }

  // Fallback if not enough particles generated
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
  };
}
