/**
 * Web Worker for particle physics calculations
 * Offloads position, velocity, and color calculations from main thread
 */

interface ParticlePosition {
  px: number;
  py: number;
  pz: number;
}

interface ParticleVelocity {
  vx: number;
  vy: number;
  vz: number;
}

interface EffectConfig {
  effectRadius: number;
  repelStrength: number;
}

type Effect = "default" | "spark" | "wave" | "vortex";

interface UpdateParticlesMessage {
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

interface UpdateParticlesResult {
  type: "updated" | "error";
  positions?: Float32Array;
  velocities?: Float32Array;
  colors?: Float32Array;
  error?: string;
}

interface UpdatedParticlesPayload {
  positions: Float32Array;
  velocities: Float32Array;
  colors: Float32Array;
}

// ====== Physics Functions ======

function applySparkEffect(
  particle: ParticlePosition,
  intersection: { x: number; y: number; z: number },
  velocity: ParticleVelocity,
  config: EffectConfig
): ParticleVelocity {
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
}

function applyWaveEffect(
  particle: ParticlePosition,
  intersection: { x: number; y: number; z: number },
  velocity: ParticleVelocity,
  config: EffectConfig,
  time: number
): ParticleVelocity {
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
}

function applyVortexEffect(
  particle: ParticlePosition,
  intersection: { x: number; y: number; z: number },
  velocity: ParticleVelocity,
  config: EffectConfig
): ParticleVelocity {
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
    const tangentLength = Math.sqrt(tangentX * tangentX + tangentY * tangentY);

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
}

function applyDefaultEffect(
  particle: ParticlePosition,
  intersection: { x: number; y: number; z: number },
  velocity: ParticleVelocity,
  config: EffectConfig
): ParticleVelocity {
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
}

function applyParticleEffect(
  effect: Effect,
  position: ParticlePosition,
  intersection: { x: number; y: number; z: number },
  velocity: ParticleVelocity,
  config: EffectConfig,
  time: number
): ParticleVelocity {
  switch (effect) {
    case "spark":
      return applySparkEffect(position, intersection, velocity, config);
    case "wave":
      return applyWaveEffect(position, intersection, velocity, config, time);
    case "vortex":
      return applyVortexEffect(position, intersection, velocity, config);
    case "default":
      return applyDefaultEffect(position, intersection, velocity, config);
  }
}

function applyAttraction(
  position: ParticlePosition,
  target: { x: number; y: number; z: number },
  velocity: ParticleVelocity,
  attractStrength: number
): ParticleVelocity {
  return {
    vx: velocity.vx + (target.x - position.px) * attractStrength,
    vy: velocity.vy + (target.y - position.py) * attractStrength,
    vz: velocity.vz + (target.z - position.pz) * attractStrength,
  };
}

function applyDamping(
  velocity: ParticleVelocity,
  damping: number
): ParticleVelocity {
  return {
    vx: velocity.vx * damping,
    vy: velocity.vy * damping,
    vz: velocity.vz * damping,
  };
}

function updatePosition(
  position: ParticlePosition,
  velocity: ParticleVelocity
): ParticlePosition {
  return {
    px: position.px + velocity.vx,
    py: position.py + velocity.vy,
    pz: position.pz + velocity.vz,
  };
}

// ====== Color Calculation Functions ======

function calculateWaveColor(
  particle: ParticlePosition,
  intersection: { x: number; y: number; z: number },
  effectRadius: number,
  time: number
): { r: number; g: number; b: number } {
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
}

function calculateVortexColor(
  particle: ParticlePosition,
  intersection: { x: number; y: number; z: number },
  effectRadius: number,
  time: number
): { r: number; g: number; b: number } {
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
}

function calculateParticleColor(
  effect: Effect,
  position: ParticlePosition,
  intersection: { x: number; y: number; z: number } | null,
  effectRadius: number,
  time: number
): { r: number; g: number; b: number } {
  if (!intersection) {
    return { r: 1, g: 1, b: 1 };
  }

  if (effect === "wave") {
    return calculateWaveColor(position, intersection, effectRadius, time);
  }
  if (effect === "vortex") {
    return calculateVortexColor(position, intersection, effectRadius, time);
  }

  return { r: 1, g: 1, b: 1 };
}

// ====== Main Update Function ======

function updateParticles(
  message: UpdateParticlesMessage
): UpdatedParticlesPayload {
  const {
    positions,
    velocities,
    originalPositions,
    colors,
    particleCount,
    config,
  } = message;

  const {
    effect,
    effectRadius,
    repelStrength,
    attractStrength,
    damping,
    intersectionPoint,
    time,
  } = config;

  const effectConfig: EffectConfig = {
    effectRadius,
    repelStrength,
  };

  // Process all particles
  for (let j = 0; j < particleCount; j++) {
    const idx = j * 3;

    // Get current position
    const position: ParticlePosition = {
      px: positions[idx] ?? 0,
      py: positions[idx + 1] ?? 0,
      pz: positions[idx + 2] ?? 0,
    };

    // Get target (original) position
    const target = {
      x: originalPositions[idx] ?? 0,
      y: originalPositions[idx + 1] ?? 0,
      z: originalPositions[idx + 2] ?? 0,
    };

    // Get current velocity
    let velocity: ParticleVelocity = {
      vx: velocities[idx] ?? 0,
      vy: velocities[idx + 1] ?? 0,
      vz: velocities[idx + 2] ?? 0,
    };

    // Apply effect if mouse is hovering
    if (intersectionPoint) {
      velocity = applyParticleEffect(
        effect,
        position,
        intersectionPoint,
        velocity,
        effectConfig,
        time
      );
    }

    // Attract back to original position
    velocity = applyAttraction(position, target, velocity, attractStrength);
    velocity = applyDamping(velocity, damping);

    // Update position
    const newPos = updatePosition(position, velocity);
    positions[idx] = newPos.px;
    positions[idx + 1] = newPos.py;
    positions[idx + 2] = newPos.pz;

    // Update velocity
    velocities[idx] = velocity.vx;
    velocities[idx + 1] = velocity.vy;
    velocities[idx + 2] = velocity.vz;

    // Calculate and apply color
    const color = calculateParticleColor(
      effect,
      newPos,
      intersectionPoint,
      effectRadius,
      time
    );
    colors[idx] = color.r;
    colors[idx + 1] = color.g;
    colors[idx + 2] = color.b;
  }

  return {
    positions,
    velocities,
    colors,
  };
}

// ====== Worker Message Handler ======

function isTrustedWorkerMessage(event: MessageEvent<unknown>): boolean {
  return event.origin === "" || event.origin === self.location.origin;
}

self.addEventListener(
  "message",
  (event: MessageEvent<UpdateParticlesMessage>) => {
    if (!isTrustedWorkerMessage(event)) {
      return;
    }

    const { type } = event.data;

    if (type === "update") {
      try {
        const result = updateParticles(event.data);
        const updatedMessage: UpdateParticlesResult = {
          type: "updated",
          ...result,
        };

        self.postMessage(updatedMessage, {
          transfer: [
            result.positions.buffer,
            result.velocities.buffer,
            result.colors.buffer,
          ],
        });
      } catch (error) {
        const errorMessage: UpdateParticlesResult = {
          type: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        };
        self.postMessage(errorMessage);
      }
    }
  }
);

export {};
