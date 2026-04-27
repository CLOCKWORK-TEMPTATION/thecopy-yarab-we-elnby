"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

import { ParticleWorkerManager } from "@/workers/worker-manager";

import {
  getDeviceCapabilities,
  getParticleLODConfig,
  logDeviceCapabilities,
  type ParticleLODConfig,
} from "./device-detection";

import type { Effect } from "@/workers/types";

/**
 * Get optimal particle configuration using comprehensive LOD system
 */
function getOptimalParticleConfig(): {
  count: number;
  batchSize: number;
  config: ParticleLODConfig;
} {
  if (typeof window === "undefined") {
    return {
      count: 3000,
      batchSize: 400,
      config: {
        particleCount: 3000,
        effectRadius: 150,
        updateFrequency: 33,
        enableAdvancedEffects: false,
        enableShadows: false,
        textureQuality: "medium",
      },
    };
  }

  // Use comprehensive device detection system
  const capabilities = getDeviceCapabilities();
  const lodConfig = getParticleLODConfig(capabilities);

  // Calculate batch size based on particle count (20-25% of total)
  const batchSize = Math.floor(lodConfig.particleCount * 0.22);

  // Log device capabilities in development
  if (process.env.NODE_ENV === "development") {
    logDeviceCapabilities();
  }

  return {
    count: lodConfig.particleCount,
    batchSize: batchSize,
    config: lodConfig,
  };
}

export default function WorkerParticleAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const workerManagerRef = useRef<ParticleWorkerManager | null>(null);
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState<boolean>(true);

  const currentEffect: Effect = "spark";

  // Check for reduced motion preference
  const prefersReducedMotion = false;

  // Scene reference with all necessary data
  const sceneRef = useRef<{
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
  } | null>(null);

  /**
   * Update camera position based on rotation
   */
  const updateCameraPosition = (
    camera: THREE.PerspectiveCamera,
    rotationX: number,
    rotationY: number
  ): void => {
    camera.position.x = Math.sin(rotationY) * 3.5;
    camera.position.z = Math.cos(rotationY) * 3.5;
    camera.position.y = rotationX * 0.5;
    camera.lookAt(0, 0, 0);
  };

  useEffect(() => {
    if (!canvasRef.current || typeof window === "undefined") return;

    // Skip animation if user prefers reduced motion
    if (prefersReducedMotion) return;

    const canvas = canvasRef.current;

    // Initialize Three.js scene
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

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

    // Initialize geometry
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

    // Handle resize
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", handleResize);

    // Initialize scene reference
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

    // Initialize worker manager
    const workerManager = new ParticleWorkerManager();
    workerManagerRef.current = workerManager;

    // Initialize workers and generate particles
    const initializeAndGenerate = async () => {
      try {
        workerManager.initializeWorkers();

        // Determine device capabilities and particle count using LOD system
        const particleConfig = getOptimalParticleConfig();
        const numParticles = particleConfig.count;
        const thickness = 0.15;

        // Sampling bounds
        const minX = -2.1;
        const maxX = 5.6;
        const minY = -0.4;
        const maxY = 0.85;

        // Generate particles using worker with LOD-optimized batch size
        const result = await workerManager.generateParticles(
          {
            numParticles,
            thickness,
            minX,
            maxX,
            minY,
            maxY,
            maxAttempts: 3000000,
            batchSize: particleConfig.batchSize,
          },
          (progress) => {
            setGenerationProgress(progress);
          }
        );

        if (!sceneRef.current) return;

        const {
          positions,
          colors,
          count,
          originalPositions,
          phases,
          velocities,
        } = result;

        // Update geometry
        sceneRef.current.geometry.setAttribute(
          "position",
          new THREE.BufferAttribute(positions, 3)
        );
        sceneRef.current.geometry.setAttribute(
          "color",
          new THREE.BufferAttribute(colors, 3)
        );

        // Update scene reference
        sceneRef.current.originalPositions = originalPositions;
        sceneRef.current.phases = phases;
        sceneRef.current.velocities = velocities;
        sceneRef.current.particleCount = count;
        sceneRef.current.isGenerated = true;

        setIsGenerating(false);
        setGenerationProgress(100);
      } catch (error) {
        console.error("Failed to generate particles:", error);
        setIsGenerating(false);
      }
    };

    // Use requestIdleCallback for initialization to avoid blocking main thread
    if ("requestIdleCallback" in window) {
      requestIdleCallback(() => initializeAndGenerate(), { timeout: 2000 });
    } else {
      setTimeout(initializeAndGenerate, 100);
    }

    // Pause animation when tab is hidden (save battery and CPU)
    const handleVisibilityChange = () => {
      if (document.hidden && animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      } else if (
        !document.hidden &&
        sceneRef.current &&
        !animationRef.current
      ) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Mouse interaction handlers
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
      if (sceneRef.current) {
        sceneRef.current.intersectionPoint = null;
      }
    };

    canvas.addEventListener("mousemove", handleCanvasMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    // Animation loop - now uses worker for physics calculations
    const animate = async () => {
      if (!sceneRef.current?.isGenerated) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const time = Date.now() * 0.001;
      const {
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

      const positionAttribute = geometry.getAttribute(
        "position"
      ) as THREE.BufferAttribute;
      const colorAttribute = geometry.getAttribute(
        "color"
      ) as THREE.BufferAttribute;

      // Apply rotation
      updateCameraPosition(camera, rotationX, rotationY);

      // Clone arrays for worker (using transferable objects)
      const positions = new Float32Array(positionAttribute.array);
      const colors = new Float32Array(colorAttribute.array);
      const vels = new Float32Array(velocities);

      try {
        // Update particles using worker
        if (
          workerManagerRef.current &&
          workerManagerRef.current.isInitialized()
        ) {
          const result = await workerManagerRef.current.updateParticles({
            type: "update",
            positions,
            velocities: vels,
            originalPositions,
            colors,
            particleCount,
            config: {
              effect: currentEffect,
              effectRadius: 0.5,
              repelStrength: 0.08,
              attractStrength: 0.15,
              damping: 0.92,
              intersectionPoint: intersectionPoint
                ? {
                    x: intersectionPoint.x,
                    y: intersectionPoint.y,
                    z: intersectionPoint.z,
                  }
                : null,
              time,
            },
          });

          // Update geometry with new data
          positionAttribute.set(result.positions);
          colorAttribute.set(result.colors);
          sceneRef.current.velocities = result.velocities;

          positionAttribute.needsUpdate = true;
          colorAttribute.needsUpdate = true;
        }
      } catch (error) {
        console.warn("Worker update failed, skipping frame:", error);
      }

      renderer.render(scene, camera);
      animationRef.current = requestAnimationFrame(animate);
    };

    // Start animation loop
    animationRef.current = requestAnimationFrame(animate);

    // Mouse drag handlers
    const handleMouseDown = (e: MouseEvent) => {
      if (!sceneRef.current) return;
      sceneRef.current.isDragging = true;
      sceneRef.current.previousMouseX = e.clientX;
      sceneRef.current.previousMouseY = e.clientY;
    };

    const handleMouseMoveRotate = (e: MouseEvent) => {
      if (!sceneRef.current?.isDragging) return;

      const deltaX = e.clientX - sceneRef.current.previousMouseX;
      const deltaY = e.clientY - sceneRef.current.previousMouseY;

      sceneRef.current.rotationY -= deltaX * 0.005;
      sceneRef.current.rotationX -= deltaY * 0.005;

      sceneRef.current.previousMouseX = e.clientX;
      sceneRef.current.previousMouseY = e.clientY;
    };

    const handleMouseUp = () => {
      if (sceneRef.current) {
        sceneRef.current.isDragging = false;
      }
    };

    // Touch handlers
    const handleTouchStart = (e: TouchEvent) => {
      if (!sceneRef.current || !e.touches[0]) return;
      sceneRef.current.isDragging = true;
      sceneRef.current.previousMouseX = e.touches[0].clientX;
      sceneRef.current.previousMouseY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!sceneRef.current || !sceneRef.current.isDragging || !e.touches[0])
        return;

      const deltaX = e.touches[0].clientX - sceneRef.current.previousMouseX;
      const deltaY = e.touches[0].clientY - sceneRef.current.previousMouseY;

      sceneRef.current.rotationY -= deltaX * 0.005;
      sceneRef.current.rotationX -= deltaY * 0.005;

      sceneRef.current.previousMouseX = e.touches[0].clientX;
      sceneRef.current.previousMouseY = e.touches[0].clientY;
    };

    const handleTouchEnd = () => {
      if (sceneRef.current) {
        sceneRef.current.isDragging = false;
      }
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMoveRotate);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mouseleave", handleMouseUp);
    canvas.addEventListener("touchstart", handleTouchStart, { passive: true });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: true });
    canvas.addEventListener("touchend", handleTouchEnd);

    // Cleanup function
    const cleanup = () => {
      try {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }

        canvas.removeEventListener("mousemove", handleCanvasMouseMove);
        canvas.removeEventListener("mouseleave", handleMouseLeave);
        canvas.removeEventListener("mousedown", handleMouseDown);
        canvas.removeEventListener("mousemove", handleMouseMoveRotate);
        canvas.removeEventListener("mouseup", handleMouseUp);
        canvas.removeEventListener("touchstart", handleTouchStart);
        canvas.removeEventListener("touchmove", handleTouchMove);
        canvas.removeEventListener("touchend", handleTouchEnd);

        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange
        );

        if (geometry) geometry.dispose();
        if (material) material.dispose();
        if (renderer) renderer.dispose();

        window.removeEventListener("resize", handleResize);

        // Terminate workers
        if (workerManagerRef.current) {
          workerManagerRef.current.terminate();
          workerManagerRef.current = null;
        }

        if (sceneRef.current) {
          sceneRef.current = null;
        }
      } catch (error) {
        console.error("Cleanup error:", error);
      }
    };

    return cleanup;
  }, [prefersReducedMotion]);

  return (
    <div className="absolute inset-0 z-0 flex items-center justify-center w-full h-full bg-black">
      <canvas
        ref={canvasRef}
        width={1400}
        height={600}
        className="block"
        style={{ touchAction: "none", pointerEvents: "auto" }}
      />

      {/* Progress indicator during generation */}
      {isGenerating && (
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-lg">
          <div className="text-sm">
            توليد الجسيمات: {Math.round(generationProgress)}%
          </div>
          <div className="w-48 h-2 bg-gray-700 rounded-full mt-2">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${generationProgress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
