"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

import { logger } from "@/lib/logger";
import { dist } from "@/lib/particle-letters-sdf";
import {
  PARTICLE_THRESHOLDS,
  SAMPLING_BOUNDS,
} from "@/lib/particle-letters.constants";
import {
  type Effect,
  updateCameraPosition,
  updateParticlePhysics,
} from "@/lib/particle-physics-utils";

import {
  getDeviceCapabilities,
  getParticleLODConfig,
  PerformanceMonitor,
  logDeviceCapabilities,
} from "./device-detection";

import type React from "react";

// Create a single performance monitor instance for the module
const performanceMonitor = new PerformanceMonitor();

interface SceneState {
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
}

/**
 * Get optimal particle configuration using LOD system
 */
function getOptimalParticleCount(): number {
  if (typeof window === "undefined") return 3000;
  const capabilities = getDeviceCapabilities();
  const lodConfig = getParticleLODConfig(capabilities);
  if (process.env.NODE_ENV === "development") logDeviceCapabilities();
  return lodConfig.particleCount;
}

function generateParticlesInBatches(
  numParticles: number,
  positions: Float32Array,
  colors: Float32Array,
  batchSize = 750
): Promise<number> {
  const { minX, maxX, minY, maxY } = SAMPLING_BOUNDS;
  const thickness = 0.15;

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
            x > 2.5 ? PARTICLE_THRESHOLDS.arabic : PARTICLE_THRESHOLDS.english;
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
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    };

    processBatch();
  });
}

function createAnimateLoop(
  sceneRef: React.MutableRefObject<SceneState | null>,
  currentEffect: Effect
) {
  const animate = () => {
    if (!sceneRef.current) return;
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

    if (!geometry || particleCount === 0 || !velocities || !originalPositions) {
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
      return;
    }

    const positionAttribute = geometry.getAttribute("position");
    const colorAttribute = geometry.getAttribute("color");
    if (!positionAttribute || !colorAttribute) {
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
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
    requestAnimationFrame(animate);
  };

  return animate;
}

function setupMouseHandlers(
  canvas: HTMLCanvasElement,
  sceneRef: React.MutableRefObject<SceneState | null>,
  camera: THREE.PerspectiveCamera
) {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

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
    if (sceneRef.current) sceneRef.current.intersectionPoint = null;
  };

  canvas.addEventListener("mousemove", handleMouseMove);
  canvas.addEventListener("mouseleave", handleMouseLeave);

  return () => {
    canvas.removeEventListener("mousemove", handleMouseMove);
    canvas.removeEventListener("mouseleave", handleMouseLeave);
  };
}

interface ParticleSceneBuildContext {
  colors: Float32Array;
  finalCount: number;
  originalPositions: Float32Array;
  positions: Float32Array;
  scene: THREE.Scene;
  sceneRef: React.MutableRefObject<SceneState | null>;
}

function buildParticleScene(
  context: ParticleSceneBuildContext
) {
  const {
    colors,
    finalCount,
    originalPositions,
    positions,
    scene,
    sceneRef,
  } = context;
  if (!sceneRef.current) return;
  sceneRef.current.particleCount = finalCount;
  const finalPositions = positions.slice(0, finalCount * 3);
  const finalColors = colors.slice(0, finalCount * 3);
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
  geometry.setAttribute("color", new THREE.BufferAttribute(finalColors, 3));
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
}

function cleanupParticleScene(
  sceneRef: React.MutableRefObject<SceneState | null>,
  renderer: THREE.WebGLRenderer,
  animationId: number,
  removeMouseHandlers: () => void
) {
  try {
    cancelAnimationFrame(animationId);
    removeMouseHandlers();
    if (sceneRef.current?.geometry) sceneRef.current.geometry.dispose();
    if (sceneRef.current?.points?.material) {
      const material = sceneRef.current.points.material;
      if (material && !Array.isArray(material)) material.dispose();
    }
    if (renderer) renderer.dispose();
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
}

export default function V0ParticleAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<SceneState | null>(null);
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

    const numParticles = getOptimalParticleCount();
    const positions = new Float32Array(numParticles * 3);
    const colors = new Float32Array(numParticles * 3);
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

    const removeMouseHandlers = setupMouseHandlers(canvas, sceneRef, camera);
    const animate = createAnimateLoop(sceneRef, currentEffect);
    const animationId = requestAnimationFrame(animate);

    generateParticlesInBatches(numParticles, positions, colors)
      .then((finalCount) => {
        logger.info("[v0] Generated particles:", finalCount);
        buildParticleScene({
          sceneRef,
          scene,
          originalPositions,
          positions,
          colors,
          finalCount,
        });
        logger.info("[v0] Particles added to scene");
      })
      .catch((error) => {
        logger.error("Failed to generate particles:", error);
      });

    const cleanup = () => {
      cleanupParticleScene(
        sceneRef,
        renderer,
        animationId,
        removeMouseHandlers
      );
    };

    const safetyCleanup = setTimeout(cleanup, 300000);

    return () => {
      clearTimeout(safetyCleanup);
      cleanup();
    };
  }, [currentEffect]);

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
    if (sceneRef.current) sceneRef.current.isDragging = false;
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
    if (sceneRef.current) sceneRef.current.isDragging = false;
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
