"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

import { logger } from "@/lib/logger";
import {
  BASELINE,
  STROKE_WIDTH,
  X_HEIGHT,
  ASCENDER_HEIGHT,
  DESCENDER_DEPTH,
  ARABIC_HEIGHT,
  LETTER_POSITIONS,
  SAMPLING_BOUNDS,
  PARTICLE_THRESHOLDS,
} from "@/lib/particle-letters.constants";

import {
  getDeviceCapabilities,
  getParticleLODConfig,
  PerformanceMonitor,
  logDeviceCapabilities,
} from "./device-detection";

import type React from "react";

// Create a single performance monitor instance for the module
const performanceMonitor = new PerformanceMonitor();

type Effect = "default" | "spark" | "wave" | "vortex";

// نوع إعدادات التحريك للجسيم — يستخدم في updateParticlePhysics
interface ParticleAnimationConfig {
  intersectionPoint: { x: number; y: number; z: number } | null;
  effect?: Effect;
  repelStrength: number;
  damping: number;
}

function updateCameraPosition(
  camera: THREE.PerspectiveCamera,
  rotationX: number,
  rotationY: number
): void {
  camera.position.x = Math.sin(rotationY) * 3.5;
  camera.position.z = Math.cos(rotationY) * 3.5;
  camera.position.y = rotationX * 0.5;
  camera.lookAt(0, 0, 0);
}

/**
 * Get optimal particle configuration using LOD system
 */
function getOptimalParticleCount(): number {
  if (typeof window === "undefined") {
    return 3000;
  }

  // Use comprehensive device detection system
  const capabilities = getDeviceCapabilities();
  const lodConfig = getParticleLODConfig(capabilities);

  // Log device capabilities in development
  if (process.env.NODE_ENV === "development") {
    logDeviceCapabilities();
  }

  return lodConfig.particleCount;
}

function updateParticlePhysics(
  positions: Float32Array,
  velocities: Float32Array,
  originalPositions: Float32Array,
  _colors: Float32Array,
  particleCount: number,
  config: ParticleAnimationConfig
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

const clamp = (value: number, min: number, max: number) => {
  return Math.max(min, Math.min(max, value));
};

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

const opUnion = (a: number, b: number): number => Math.min(a, b);
const opSubtract = (a: number, b: number): number => Math.max(a, -b);

const dist_t = (px: number, py: number): number => {
  const x = LETTER_POSITIONS.T;
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
  const x = LETTER_POSITIONS.H;
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
  const cx = LETTER_POSITIONS.E;
  const cy = BASELINE + X_HEIGHT * 0.5;
  const r = 0.2;

  let ring = sdRing(px, py, cx, cy, r, STROKE_WIDTH);
  const cutBox = sdBox(px - (cx + r * 0.5), py - cy, 0.15, 0.14, 0);
  ring = opSubtract(ring, cutBox);

  const bar = sdSegment(px, py, cx - r, cy, cx + r * 0.7, cy, STROKE_WIDTH);

  return opUnion(ring, bar);
};

const dist_c = (px: number, py: number): number => {
  const cx = LETTER_POSITIONS.C;
  const cy = BASELINE + X_HEIGHT * 0.5;
  const r = 0.2;

  let ring = sdRing(px, py, cx, cy, r, STROKE_WIDTH);
  const cutBox = sdBox(px - (cx + r * 0.5), py - cy, 0.15, 0.14, 0);
  ring = opSubtract(ring, cutBox);

  return ring;
};

const dist_o = (px: number, py: number): number => {
  const cx = LETTER_POSITIONS.O;
  const cy = BASELINE + X_HEIGHT * 0.5;
  const r = 0.2;
  return sdRing(px, py, cx, cy, r, STROKE_WIDTH);
};

const dist_p = (px: number, py: number): number => {
  const x = LETTER_POSITIONS.P;
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
  const x = LETTER_POSITIONS.Y;
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
  const x = LETTER_POSITIONS.DASH;
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
  const x = LETTER_POSITIONS.ALEF;
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
  const x = LETTER_POSITIONS.LAM;
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
  const x = LETTER_POSITIONS.NOON;
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
  const x = LETTER_POSITIONS.SEEN;
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
  const x = LETTER_POSITIONS.KHAA;
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
  const x = LETTER_POSITIONS.TAA_MARBOUTA;
  const cy = BASELINE + ARABIC_HEIGHT * 0.4;

  let circle = sdRing(px, py, x, cy, 0.17, STROKE_WIDTH * 1.1);
  const opening = sdBox(px - x, py - (cy - 0.05), 0.08, 0.08, 0);
  circle = opSubtract(circle, opening);

  const dot1 = sdCircle(px, py, x - 0.07, cy + 0.28, 0.03);
  const dot2 = sdCircle(px, py, x + 0.07, cy + 0.28, 0.03);

  return opUnion(opUnion(circle, dot1), dot2);
};

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

const dist = (px: number, py: number): number => dist_all(px, py);

export default function V0ParticleAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    points: THREE.Points | null;
    geometry: THREE.BufferGeometry | null;
    originalPositions: Float32Array | null;
    velocities: Float32Array | null;
    phases: Float32Array | null;
    intersectionPoint: THREE.Vector3 | null;
    rotationX: number;
    rotationY: number;
    isDragging: boolean;
    previousMouseX: number;
    previousMouseY: number;
    particleCount: number;
  } | null>(null);

  const currentEffect: Effect = "spark";

  useEffect(() => {
    if (typeof window === "undefined") return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) return;

    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      canvas.width / canvas.height,
      0.1,
      1000
    );
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });

    renderer.setSize(canvas.width, canvas.height);
    renderer.setClearColor(0x000000);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

    // Use LOD system to determine optimal particle count
    const numParticles = getOptimalParticleCount();

    const thickness = 0.15;
    const positions = new Float32Array(numParticles * 3);
    const colors = new Float32Array(numParticles * 3);

    const { minX, maxX, minY, maxY } = SAMPLING_BOUNDS;

    const originalPositions = new Float32Array(numParticles * 3);
    const velocities = new Float32Array(numParticles * 3);
    const phases = new Float32Array(numParticles);

    camera.position.set(0, 0, 3.2);

    sceneRef.current = {
      scene,
      camera,
      renderer,
      points: null,
      geometry: null,
      originalPositions,
      velocities,
      phases,
      intersectionPoint: null,
      rotationX: 0,
      rotationY: 0,
      isDragging: false,
      previousMouseX: 0,
      previousMouseY: 0,
      particleCount: 0,
    };

    let animationId: number;

    const handleMouseMove = (event: MouseEvent) => {
      if (!sceneRef.current) return;

      const rect = canvas.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / canvas.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / canvas.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersection = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, intersection);
      sceneRef.current.intersectionPoint = intersection;
    };

    const handleMouseLeave = () => {
      if (sceneRef.current) {
        sceneRef.current.intersectionPoint = null;
      }
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    const animate = () => {
      if (!sceneRef.current) return;

      // Record frame time for performance monitoring
      const currentTime = performance.now();
      performanceMonitor.recordFrame(currentTime);

      const {
        scene,
        camera,
        renderer,
        geometry,
        originalPositions,
        velocities,
        intersectionPoint,
        rotationY,
        particleCount,
      } = sceneRef.current;

      if (
        !geometry ||
        particleCount === 0 ||
        !velocities ||
        !originalPositions
      ) {
        renderer.render(scene, camera);
        animationId = requestAnimationFrame(animate);
        return;
      }

      const positionAttribute = geometry.getAttribute("position");
      const colorAttribute = geometry.getAttribute("color");

      if (!positionAttribute || !colorAttribute) {
        renderer.render(scene, camera);
        animationId = requestAnimationFrame(animate);
        return;
      }

      updateCameraPosition(camera, 0, rotationY);

      const positions = new Float32Array(positionAttribute.array);
      const colors = new Float32Array(colorAttribute.array);

      updateParticlePhysics(
        positions,
        velocities,
        originalPositions,
        colors,
        particleCount,
        {
          intersectionPoint,
          effect: currentEffect,
          repelStrength: 0.08,
          damping: 0.92,
        }
      );

      if (positionAttribute instanceof THREE.BufferAttribute) {
        positionAttribute.set(positions);
        positionAttribute.needsUpdate = true;
      }
      if (colorAttribute instanceof THREE.BufferAttribute) {
        colorAttribute.set(colors);
        colorAttribute.needsUpdate = true;
      }

      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    const generateParticlesInBatches = (batchSize = 750): Promise<number> => {
      return new Promise((resolve, reject) => {
        let generatedCount = 0;
        const maxAttempts = 3000000;
        let attempts = 0;
        let batchAttempts = 0;
        const maxBatchAttempts = 50000;

        const processBatch = () => {
          try {
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
                x > 2.5
                  ? PARTICLE_THRESHOLDS.arabic
                  : PARTICLE_THRESHOLDS.english;

              if (d <= threshold) {
                positions[generatedCount * 3] = x;
                positions[generatedCount * 3 + 1] = y;
                positions[generatedCount * 3 + 2] = z;
                colors[generatedCount * 3] = 1;
                colors[generatedCount * 3 + 1] = 1;
                colors[generatedCount * 3 + 2] = 1;
                generatedCount++;
                batchGenerated++;
              }
            }

            if (
              generatedCount < numParticles &&
              attempts < maxAttempts &&
              batchAttempts < maxBatchAttempts
            ) {
              if (typeof requestIdleCallback !== "undefined") {
                requestIdleCallback(processBatch, { timeout: 100 });
              } else {
                setTimeout(processBatch, 0);
              }
            } else {
              resolve(generatedCount);
            }
          } catch (error) {
            reject(error);
          }
        };

        processBatch();
      });
    };

    generateParticlesInBatches()
      .then((finalCount) => {
        logger.info("[v0] Generated particles:", finalCount);
        if (!sceneRef.current) return;

        sceneRef.current.particleCount = finalCount;

        const finalPositions = positions.slice(0, finalCount * 3);
        const finalColors = colors.slice(0, finalCount * 3);

        // Copy to original positions
        if (finalCount > 0) {
          for (let i = 0; i < finalCount * 3; i++) {
            originalPositions[i] = finalPositions[i] ?? 0;
          }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          "position",
          new THREE.BufferAttribute(finalPositions, 3)
        );
        geometry.setAttribute(
          "color",
          new THREE.BufferAttribute(finalColors, 3)
        );

        const material = new THREE.PointsMaterial({
          size: 0.0045,
          sizeAttenuation: true,
          vertexColors: true,
          transparent: true,
          opacity: 0.95,
        });

        const points = new THREE.Points(geometry, material);
        scene.add(points);

        sceneRef.current.geometry = geometry;
        sceneRef.current.points = points;

        logger.info("[v0] Particles added to scene");
      })
      .catch((error) => {
        logger.error("Failed to generate particles:", error);
      });

    const cleanup = () => {
      try {
        cancelAnimationFrame(animationId);
        canvas.removeEventListener("mousemove", handleMouseMove);
        canvas.removeEventListener("mouseleave", handleMouseLeave);

        if (sceneRef.current?.geometry) sceneRef.current.geometry.dispose();
        if (sceneRef.current?.points?.material) {
          const material = sceneRef.current.points.material;
          if (material && !Array.isArray(material)) {
            material.dispose();
          }
        }
        if (renderer) renderer.dispose();

        // Cleanup performance monitor
        performanceMonitor.reset();
        performanceMonitor.destroy();

        if (sceneRef.current) {
          sceneRef.current.originalPositions = null;
          sceneRef.current.velocities = null;
          sceneRef.current.phases = null;
          sceneRef.current = null;
        }
      } catch (error) {
        logger.error("Cleanup error:", error);
      }
    };

    const safetyCleanup = setTimeout(cleanup, 300000);

    return () => {
      clearTimeout(safetyCleanup);
      cleanup();
    };
  }, []);

  const handleMouseDown = (event: React.MouseEvent) => {
    if (!sceneRef.current) return;
    sceneRef.current.isDragging = true;
    sceneRef.current.previousMouseX = event.clientX;
    sceneRef.current.previousMouseY = event.clientY;
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!sceneRef.current?.isDragging) return;

    const deltaX = event.clientX - sceneRef.current.previousMouseX;
    const deltaY = event.clientY - sceneRef.current.previousMouseY;

    sceneRef.current.rotationY -= deltaX * 0.005;
    sceneRef.current.rotationX -= deltaY * 0.005;

    sceneRef.current.previousMouseX = event.clientX;
    sceneRef.current.previousMouseY = event.clientY;
  };

  const handleMouseUp = () => {
    if (sceneRef.current) {
      sceneRef.current.isDragging = false;
    }
  };

  const handleTouchStart = (event: React.TouchEvent) => {
    if (!sceneRef.current || !event.touches[0]) return;
    sceneRef.current.isDragging = true;
    sceneRef.current.previousMouseX = event.touches[0].clientX;
    sceneRef.current.previousMouseY = event.touches[0].clientY;
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    if (!sceneRef.current || !sceneRef.current.isDragging || !event.touches[0])
      return;

    const deltaX = event.touches[0].clientX - sceneRef.current.previousMouseX;
    const deltaY = event.touches[0].clientY - sceneRef.current.previousMouseY;

    sceneRef.current.rotationY -= deltaX * 0.005;
    sceneRef.current.rotationX -= deltaY * 0.005;

    sceneRef.current.previousMouseX = event.touches[0].clientX;
    sceneRef.current.previousMouseY = event.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    if (sceneRef.current) {
      sceneRef.current.isDragging = false;
    }
  };

  return (
    <div className="relative flex items-center justify-center w-full h-full bg-black">
      <canvas
        ref={canvasRef}
        width={1400}
        height={600}
        className="block"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
    </div>
  );
}
