"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

import {
  performanceMonitor,
  type EffectConfig,
  type ParticlePosition,
  type ParticleVelocity,
} from "@/components/particle-effects";
import { createModuleLogger } from "@/lib/logger";
import { generateParticlesInBatches } from "@/lib/particle-batch-generator";
import {
  applyAttraction,
  applyDamping,
  applyParticleEffect,
  calculateParticleColor,
  updateCameraPosition,
  updatePosition,
  type ParticleEffect,
} from "@/lib/particle-frame-helpers";

const logger = createModuleLogger("components.particle-background-optimized");

interface SceneState {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  points: THREE.Points;
  geometry: THREE.BufferGeometry;
  originalPositions: Float32Array;
  velocities: Float32Array;
  phases: Float32Array;
  intersectionPoint: THREE.Vector3 | null;
  rotationX: number;
  rotationY: number;
  isDragging: boolean;
  previousMouseX: number;
  previousMouseY: number;
  particleCount: number;
  isGenerated: boolean;
  lastFrameTime?: number;
}

interface ParticleBatchContext {
  attractStrength: number;
  colorAttribute: THREE.BufferAttribute;
  config: EffectConfig;
  currentEffect: ParticleEffect;
  damping: number;
  intersectionPoint: THREE.Vector3 | null;
  originalPositions: Float32Array;
  positionAttribute: THREE.BufferAttribute;
  time: number;
  velocities: Float32Array;
}

function processParticleBatch(
  startIdx: number,
  endIdx: number,
  context: ParticleBatchContext
) {
  const {
    attractStrength,
    colorAttribute,
    config,
    currentEffect,
    damping,
    intersectionPoint,
    originalPositions,
    positionAttribute,
    time,
    velocities,
  } = context;
  for (let j = startIdx; j < endIdx; j++) {
    const idx = j * 3;
    const position: ParticlePosition = {
      px: positionAttribute.getX(j),
      py: positionAttribute.getY(j),
      pz: positionAttribute.getZ(j),
    };
    const target = {
      x: originalPositions[idx] ?? 0,
      y: originalPositions[idx + 1] ?? 0,
      z: originalPositions[idx + 2] ?? 0,
    };
    let velocity: ParticleVelocity = {
      vx: velocities[idx] ?? 0,
      vy: velocities[idx + 1] ?? 0,
      vz: velocities[idx + 2] ?? 0,
    };

    if (intersectionPoint) {
      try {
        velocity = applyParticleEffect({
          config,
          effect: currentEffect,
          intersection: intersectionPoint,
          position,
          time,
          velocity,
        });
      } catch (error) {
        logger.warn({ err: error }, "particle effect computation failed");
      }
    }

    velocity = applyAttraction(position, target, velocity, attractStrength);
    velocity = applyDamping(velocity, damping);
    const newPos = updatePosition(position, velocity);
    positionAttribute.setXYZ(j, newPos.px, newPos.py, newPos.pz);
    velocities[idx] = velocity.vx;
    velocities[idx + 1] = velocity.vy;
    velocities[idx + 2] = velocity.vz;

    try {
      const color = calculateParticleColor(
        currentEffect,
        newPos,
        intersectionPoint,
        config.effectRadius,
        time
      );
      colorAttribute.setXYZ(j, color.r, color.g, color.b);
    } catch (error) {
      logger.warn({ err: error }, "particle color calculation failed");
    }
  }
}

function runBatchedParticleProcessing(
  sceneRef: React.MutableRefObject<SceneState | null>,
  animationRef: React.MutableRefObject<number | null>,
  currentEffect: ParticleEffect,
  batchSize = 800
) {
  if (!sceneRef.current?.isGenerated) return;
  const {
    scene,
    camera,
    renderer,
    geometry,
    originalPositions,
    velocities,
    intersectionPoint,
    rotationX,
    rotationY,
    particleCount,
  } = sceneRef.current;
  const currentTime = performance.now();
  const time = currentTime * 0.001;
  performanceMonitor.recordFrame(currentTime);

  const positionAttribute = geometry.getAttribute(
    "position"
  ) as THREE.BufferAttribute;
  const colorAttribute = geometry.getAttribute(
    "color"
  ) as THREE.BufferAttribute;

  const config: EffectConfig = { effectRadius: 0.5, repelStrength: 0.08 };
  const attractStrength = 0.15;
  const damping = 0.92;

  updateCameraPosition(camera, rotationX, rotationY);

  let currentIndex = 0;

  const processBatch = () => {
    const endIndex = Math.min(
      currentIndex + Math.min(batchSize, 200),
      particleCount
    );
    processParticleBatch(
      currentIndex,
      endIndex,
      {
        attractStrength,
        colorAttribute,
        config,
        currentEffect,
        damping,
        intersectionPoint,
        originalPositions,
        positionAttribute,
        time,
        velocities,
      }
    );
    currentIndex = endIndex;

    if (currentIndex < particleCount) {
      requestAnimationFrame(processBatch);
    } else {
      positionAttribute.needsUpdate = true;
      colorAttribute.needsUpdate = true;
      renderer.render(scene, camera);
      animationRef.current = requestAnimationFrame(() =>
        scheduleAnimationFrame(sceneRef, animationRef, currentEffect)
      );
    }
  };

  processBatch();
}

function scheduleAnimationFrame(
  sceneRef: React.MutableRefObject<SceneState | null>,
  animationRef: React.MutableRefObject<number | null>,
  currentEffect: ParticleEffect
) {
  if (!sceneRef.current?.isGenerated) {
    animationRef.current = requestAnimationFrame(() =>
      scheduleAnimationFrame(sceneRef, animationRef, currentEffect)
    );
    return;
  }

  const currentTime = performance.now();
  if (currentTime - (sceneRef.current.lastFrameTime ?? 0) > 16) {
    sceneRef.current.lastFrameTime = currentTime;
    runBatchedParticleProcessing(sceneRef, animationRef, currentEffect);
  } else {
    animationRef.current = requestAnimationFrame(() =>
      scheduleAnimationFrame(sceneRef, animationRef, currentEffect)
    );
  }
}

function setupInteractionHandlers(
  canvas: HTMLCanvasElement,
  sceneRef: React.MutableRefObject<SceneState | null>,
  camera: THREE.PerspectiveCamera
) {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

  const handleCanvasMouseMove = (event: MouseEvent) => {
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

  const handleMouseDown = (event: MouseEvent) => {
    if (!sceneRef.current) return;
    sceneRef.current.isDragging = true;
    sceneRef.current.previousMouseX = event.clientX;
    sceneRef.current.previousMouseY = event.clientY;
  };

  const handleMouseMove = (event: MouseEvent) => {
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

  const handleTouchStart = (event: TouchEvent) => {
    if (!sceneRef.current || !event.touches[0]) return;
    sceneRef.current.isDragging = true;
    sceneRef.current.previousMouseX = event.touches[0].clientX;
    sceneRef.current.previousMouseY = event.touches[0].clientY;
  };

  const handleTouchMove = (event: TouchEvent) => {
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

  canvas.addEventListener("mousemove", handleCanvasMouseMove);
  canvas.addEventListener("mouseleave", handleMouseLeave);
  canvas.addEventListener("mousedown", handleMouseDown);
  canvas.addEventListener("mousemove", handleMouseMove);
  canvas.addEventListener("mouseup", handleMouseUp);
  canvas.addEventListener("mouseleave", handleMouseUp);
  canvas.addEventListener("touchstart", handleTouchStart, { passive: true });
  canvas.addEventListener("touchmove", handleTouchMove, { passive: true });
  canvas.addEventListener("touchend", handleTouchEnd);

  return () => {
    canvas.removeEventListener("mousemove", handleCanvasMouseMove);
    canvas.removeEventListener("mouseleave", handleMouseLeave);
    canvas.removeEventListener("mousedown", handleMouseDown);
    canvas.removeEventListener("mousemove", handleMouseMove);
    canvas.removeEventListener("mouseup", handleMouseUp);
    canvas.removeEventListener("mouseleave", handleMouseUp);
    canvas.removeEventListener("touchstart", handleTouchStart);
    canvas.removeEventListener("touchmove", handleTouchMove);
    canvas.removeEventListener("touchend", handleTouchEnd);
  };
}

export default function OptimizedParticleAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sceneRef = useRef<SceneState | null>(null);

  const currentEffect: ParticleEffect = "spark";
  const canRenderInBrowser = typeof window !== "undefined";
  const prefersReducedMotion =
    canRenderInBrowser &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (!canRenderInBrowser || prefersReducedMotion) return;
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000);

    const geometry = new THREE.BufferGeometry();
    const material = new THREE.PointsMaterial({
      size: 0.008,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);
    camera.position.set(0, 0, 3.2);

    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", handleResize);

    sceneRef.current = {
      scene,
      camera,
      renderer,
      points,
      geometry,
      originalPositions: new Float32Array(0),
      velocities: new Float32Array(0),
      phases: new Float32Array(0),
      intersectionPoint: null,
      rotationX: 0,
      rotationY: 0,
      isDragging: false,
      previousMouseX: 0,
      previousMouseY: 0,
      particleCount: 0,
      isGenerated: false,
    };

    generateParticlesInBatches((error) => {
      logger.error({ err: error }, "particle generation failed");
    })
      .then((result) => {
        if (!sceneRef.current) return;
        const {
          positions,
          colors,
          count,
          originalPositions,
          phases,
          velocities,
        } = result;
        sceneRef.current.geometry.setAttribute(
          "position",
          new THREE.BufferAttribute(positions, 3)
        );
        sceneRef.current.geometry.setAttribute(
          "color",
          new THREE.BufferAttribute(colors, 3)
        );
        sceneRef.current.originalPositions = originalPositions;
        sceneRef.current.phases = phases;
        sceneRef.current.velocities = velocities;
        sceneRef.current.particleCount = count;
        sceneRef.current.isGenerated = true;
      })
      .catch((error) => {
        logger.error({ err: error }, "particle generation pipeline failed");
      });

    const removeInteractionHandlers = setupInteractionHandlers(
      canvas,
      sceneRef,
      camera
    );

    animationRef.current = requestAnimationFrame(() =>
      scheduleAnimationFrame(sceneRef, animationRef, currentEffect)
    );

    const cleanup = () => {
      try {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        if (cleanupTimeoutRef.current) clearTimeout(cleanupTimeoutRef.current);
        removeInteractionHandlers();
        if (geometry) geometry.dispose();
        if (material) material.dispose();
        if (renderer) renderer.dispose();
        window.removeEventListener("resize", handleResize);
        performanceMonitor.reset();
        if (sceneRef.current) {
          sceneRef.current.originalPositions = new Float32Array(0);
          sceneRef.current.velocities = new Float32Array(0);
          sceneRef.current.phases = new Float32Array(0);
          sceneRef.current = null;
        }
      } catch (error) {
        logger.error({ err: error }, "particle resource cleanup failed");
      }
    };

    cleanupTimeoutRef.current = setTimeout(cleanup, 300000);
    return cleanup;
  }, [canRenderInBrowser, prefersReducedMotion, currentEffect]);

  if (!canRenderInBrowser || prefersReducedMotion) return null;

  return (
    <div className="absolute inset-0 z-0 flex items-center justify-center w-full h-full bg-black">
      <canvas
        ref={canvasRef}
        width={1400}
        height={600}
        className="block"
        style={{ touchAction: "none" }}
      />
    </div>
  );
}
