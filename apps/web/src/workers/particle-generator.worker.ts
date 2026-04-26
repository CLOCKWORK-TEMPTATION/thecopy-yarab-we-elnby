/**
 * Web Worker for particle generation
 * Offloads heavy SDF calculations and particle generation from main thread
 */

interface GenerateParticlesMessage {
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

interface ParticleGenerationResult {
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

interface GeneratedParticlesPayload {
  positions: Float32Array;
  colors: Float32Array;
  count: number;
  originalPositions: Float32Array;
  phases: Float32Array;
  velocities: Float32Array;
}

// Utility function
const clamp = (value: number, min: number, max: number) => {
  return Math.max(min, Math.min(max, value));
};

// ====== SDF Functions ======

const sdBox = (
  px: number,
  py: number,
  bx: number,
  by: number,
  r: number
): number => {
  const dx = Math.abs(px) - bx;
  const dy = Math.abs(py) - by;
  return (
    Math.sqrt(Math.max(dx, 0) ** 2 + Math.max(dy, 0) ** 2) +
    Math.min(Math.max(dx, dy), 0) -
    r
  );
};

const sdCircle = (
  px: number,
  py: number,
  cx: number,
  cy: number,
  r: number
): number => {
  return Math.hypot(px - cx, py - cy) - r;
};

const sdRing = (
  px: number,
  py: number,
  cx: number,
  cy: number,
  r: number,
  thickness: number
): number => {
  return Math.abs(sdCircle(px, py, cx, cy, r)) - thickness;
};

const sdSegment = (
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  r: number
): number => {
  const pax = px - ax;
  const pay = py - ay;
  const bax = bx - ax;
  const bay = by - ay;
  const h = clamp((pax * bax + pay * bay) / (bax * bax + bay * bay), 0, 1);
  const dx = pax - bax * h;
  const dy = pay - bay * h;
  return Math.sqrt(dx * dx + dy * dy) - r;
};

const sdArc = (
  px: number,
  py: number,
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
  thickness: number
): number => {
  const dx = px - cx;
  const dy = py - cy;
  const angle = Math.atan2(dy, dx);

  let normAngle = angle;
  while (normAngle < startAngle) normAngle += Math.PI * 2;
  while (normAngle > endAngle + Math.PI * 2) normAngle -= Math.PI * 2;

  const clampedAngle = clamp(normAngle, startAngle, endAngle);
  const targetX = cx + Math.cos(clampedAngle) * r;
  const targetY = cy + Math.sin(clampedAngle) * r;

  return Math.hypot(px - targetX, py - targetY) - thickness;
};

// SDF boolean operations
const opUnion = (a: number, b: number): number => Math.min(a, b);
const opSubtract = (a: number, b: number): number => Math.max(a, -b);

// Character definitions
const STROKE_WIDTH = 0.035;
const BASELINE = 0.0;
const X_HEIGHT = 0.35;
const ASCENDER_HEIGHT = 0.65;
const DESCENDER_DEPTH = -0.25;
const ARABIC_HEIGHT = 0.45;

// Letters SDF definitions
const dist_t = (px: number, py: number): number => {
  const x = -1.7;
  const stem = sdSegment(
    px,
    py,
    x,
    BASELINE + ASCENDER_HEIGHT - 0.05,
    x,
    BASELINE,
    STROKE_WIDTH
  );
  const crossbar = sdSegment(
    px,
    py,
    x - 0.15,
    BASELINE + ASCENDER_HEIGHT,
    x + 0.15,
    BASELINE + ASCENDER_HEIGHT,
    STROKE_WIDTH
  );
  return opUnion(stem, crossbar);
};

const dist_h = (px: number, py: number): number => {
  const x = -1.25;
  const stem = sdSegment(
    px,
    py,
    x,
    BASELINE + ASCENDER_HEIGHT,
    x,
    BASELINE,
    STROKE_WIDTH
  );
  const shoulder = sdArc(
    px,
    py,
    x,
    BASELINE + X_HEIGHT * 0.8,
    0.22,
    -Math.PI / 2,
    0,
    STROKE_WIDTH
  );
  const rightLeg = sdSegment(
    px,
    py,
    x + 0.22,
    BASELINE + X_HEIGHT * 0.8,
    x + 0.22,
    BASELINE,
    STROKE_WIDTH
  );
  return opUnion(opUnion(stem, shoulder), rightLeg);
};

const dist_e = (px: number, py: number): number => {
  const cx = -0.6;
  const cy = BASELINE + X_HEIGHT * 0.5;
  const r = 0.2;
  let ring = sdRing(px, py, cx, cy, r, STROKE_WIDTH);
  const cutBox = sdBox(px - (cx + r * 0.5), py - cy, 0.15, 0.14, 0);
  ring = opSubtract(ring, cutBox);
  const bar = sdSegment(px, py, cx - r, cy, cx + r * 0.7, cy, STROKE_WIDTH);
  return opUnion(ring, bar);
};

const dist_c = (px: number, py: number): number => {
  const cx = 0.0;
  const cy = BASELINE + X_HEIGHT * 0.5;
  const r = 0.2;
  const ring = sdRing(px, py, cx, cy, r, STROKE_WIDTH);
  const cutBox = sdBox(px - (cx + r * 0.5), py - cy, 0.15, 0.14, 0);
  return opSubtract(ring, cutBox);
};

const dist_o = (px: number, py: number): number => {
  const cx = 0.5;
  const cy = BASELINE + X_HEIGHT * 0.5;
  const r = 0.2;
  return sdRing(px, py, cx, cy, r, STROKE_WIDTH);
};

const dist_p = (px: number, py: number): number => {
  const x = 1.0;
  const cy = BASELINE + X_HEIGHT * 0.5;
  const stem = sdSegment(
    px,
    py,
    x,
    BASELINE + X_HEIGHT,
    x,
    BASELINE + DESCENDER_DEPTH,
    STROKE_WIDTH
  );
  const bowl = sdRing(px, py, x + 0.2, cy, 0.17, STROKE_WIDTH);
  return opUnion(stem, bowl);
};

const dist_y = (px: number, py: number): number => {
  const x = 1.9;
  const top = BASELINE + X_HEIGHT;
  const mid = BASELINE + X_HEIGHT * 0.2;
  const leftArm = sdSegment(px, py, x - 0.15, top, x, mid, STROKE_WIDTH);
  const rightArm = sdSegment(px, py, x + 0.15, top, x, mid, STROKE_WIDTH);
  const descender = sdSegment(
    px,
    py,
    x,
    mid,
    x + 0.05,
    BASELINE + DESCENDER_DEPTH,
    STROKE_WIDTH
  );
  return opUnion(opUnion(leftArm, rightArm), descender);
};

const dist_dash = (px: number, py: number): number => {
  const x = 2.4;
  return sdSegment(
    px,
    py,
    x - 0.1,
    BASELINE + X_HEIGHT * 0.5,
    x + 0.1,
    BASELINE + X_HEIGHT * 0.5,
    STROKE_WIDTH * 0.8
  );
};

const dist_alef = (px: number, py: number): number => {
  const x = 2.9;
  const stem = sdSegment(
    px,
    py,
    x,
    BASELINE + ARABIC_HEIGHT * 0.95,
    x,
    BASELINE,
    STROKE_WIDTH * 1.2
  );
  const base = sdSegment(
    px,
    py,
    x - 0.03,
    BASELINE,
    x + 0.03,
    BASELINE,
    STROKE_WIDTH * 1.5
  );
  return opUnion(stem, base);
};

const dist_lam = (px: number, py: number): number => {
  const x = 3.3;
  const stem = sdSegment(
    px,
    py,
    x,
    BASELINE + ARABIC_HEIGHT * 0.95,
    x,
    BASELINE + 0.08,
    STROKE_WIDTH * 1.2
  );
  const hook = sdArc(
    px,
    py,
    x - 0.12,
    BASELINE + 0.08,
    0.12,
    0,
    Math.PI / 2,
    STROKE_WIDTH * 1.1
  );
  const hookEnd = sdSegment(
    px,
    py,
    x - 0.24,
    BASELINE,
    x - 0.15,
    BASELINE,
    STROKE_WIDTH
  );
  return opUnion(opUnion(stem, hook), hookEnd);
};

const dist_noon = (px: number, py: number): number => {
  const x = 3.75;
  const cy = BASELINE + ARABIC_HEIGHT * 0.4;
  const mainArc = sdArc(
    px,
    py,
    x,
    cy,
    0.18,
    -Math.PI * 0.15,
    Math.PI * 0.85,
    STROKE_WIDTH * 1.1
  );
  const connector = sdSegment(
    px,
    py,
    x - 0.17,
    cy - 0.05,
    x - 0.08,
    BASELINE + 0.02,
    STROKE_WIDTH
  );
  const base = sdSegment(
    px,
    py,
    x - 0.08,
    BASELINE + 0.02,
    x + 0.1,
    BASELINE,
    STROKE_WIDTH
  );
  const dot = sdCircle(px, py, x, cy + 0.28, 0.035);
  return opUnion(opUnion(opUnion(mainArc, connector), base), dot);
};

const dist_seen = (px: number, py: number): number => {
  const x = 4.25;
  const baseY = BASELINE + 0.02;
  const toothHeight = ARABIC_HEIGHT * 0.35;
  const baseLine = sdSegment(
    px,
    py,
    x - 0.28,
    baseY,
    x + 0.28,
    baseY,
    STROKE_WIDTH * 1.1
  );
  const tooth1 = sdArc(
    px,
    py,
    x - 0.18,
    baseY + toothHeight * 0.6,
    0.1,
    Math.PI * 0.9,
    Math.PI * 0.1,
    STROKE_WIDTH
  );
  const tooth2 = sdArc(
    px,
    py,
    x,
    baseY + toothHeight * 0.8,
    0.12,
    Math.PI * 0.9,
    Math.PI * 0.1,
    STROKE_WIDTH
  );
  const tooth3 = sdArc(
    px,
    py,
    x + 0.18,
    baseY + toothHeight * 0.6,
    0.1,
    Math.PI * 0.9,
    Math.PI * 0.1,
    STROKE_WIDTH
  );
  const connect1 = sdSegment(
    px,
    py,
    x - 0.18,
    baseY,
    x - 0.18,
    baseY + toothHeight * 0.5,
    STROKE_WIDTH * 0.8
  );
  const connect2 = sdSegment(
    px,
    py,
    x,
    baseY,
    x,
    baseY + toothHeight * 0.7,
    STROKE_WIDTH * 0.8
  );
  const connect3 = sdSegment(
    px,
    py,
    x + 0.18,
    baseY,
    x + 0.18,
    baseY + toothHeight * 0.5,
    STROKE_WIDTH * 0.8
  );
  return opUnion(
    opUnion(
      opUnion(
        opUnion(opUnion(opUnion(baseLine, tooth1), tooth2), tooth3),
        connect1
      ),
      connect2
    ),
    connect3
  );
};

const dist_khaa = (px: number, py: number): number => {
  const x = 4.75;
  const cy = BASELINE + ARABIC_HEIGHT * 0.4;
  const mainArc = sdArc(
    px,
    py,
    x,
    cy,
    0.2,
    Math.PI * 0.6,
    Math.PI * 2.4,
    STROKE_WIDTH * 1.1
  );
  const rightConnect = sdSegment(
    px,
    py,
    x + 0.15,
    cy - 0.12,
    x + 0.12,
    BASELINE,
    STROKE_WIDTH
  );
  const leftConnect = sdSegment(
    px,
    py,
    x - 0.15,
    cy - 0.12,
    x - 0.08,
    BASELINE,
    STROKE_WIDTH
  );
  const dot = sdCircle(px, py, x, cy + 0.28, 0.035);
  return opUnion(opUnion(opUnion(mainArc, rightConnect), leftConnect), dot);
};

const dist_taa_marbouta = (px: number, py: number): number => {
  const x = 5.2;
  const cy = BASELINE + ARABIC_HEIGHT * 0.4;
  let circle = sdRing(px, py, x, cy, 0.17, STROKE_WIDTH * 1.1);
  const opening = sdBox(px - x, py - (cy - 0.05), 0.08, 0.08, 0);
  circle = opSubtract(circle, opening);
  const dot1 = sdCircle(px, py, x - 0.07, cy + 0.28, 0.03);
  const dot2 = sdCircle(px, py, x + 0.07, cy + 0.28, 0.03);
  return opUnion(opUnion(circle, dot1), dot2);
};

// Combine all letters
const dist_all = (px: number, py: number): number => {
  return Math.min(
    dist_t(px, py),
    dist_h(px, py),
    dist_e(px, py),
    dist_c(px, py),
    dist_o(px, py),
    dist_p(px, py),
    dist_y(px, py),
    dist_dash(px, py),
    dist_alef(px, py),
    dist_lam(px, py),
    dist_noon(px, py),
    dist_seen(px, py),
    dist_khaa(px, py),
    dist_taa_marbouta(px, py)
  );
};

// ====== Particle Generation Logic ======

function generateParticles(
  config: GenerateParticlesMessage["config"]
): GeneratedParticlesPayload {
  const { numParticles, thickness, minX, maxX, minY, maxY, maxAttempts } =
    config;

  const positions = new Float32Array(numParticles * 3);
  const colors = new Float32Array(numParticles * 3);

  let generatedCount = 0;
  let attempts = 0;
  let lastProgressReport = 0;

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

      // Report progress every 10%
      const progress = (generatedCount / numParticles) * 100;
      if (progress - lastProgressReport >= 10) {
        lastProgressReport = progress;
        const progressMessage: ParticleGenerationResult = {
          type: "progress",
          progress,
          count: generatedCount,
        };
        self.postMessage(progressMessage);
      }
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

// ====== Worker Message Handler ======

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
