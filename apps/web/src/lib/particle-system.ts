import { logger } from "@/lib/ai/utils/logger";

/**
 * Optimized Particle System with Performance Detection
 *
 * Dynamically adjusts particle count, animation frame rate, and quality
 * based on device capabilities, battery status, and network conditions.
 */

import * as THREE from "three";
import type { ParticleConfig } from "./performance-detection";

export interface ParticleSystemOptions {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  config: ParticleConfig;
  onPerformanceWarning?: (warning: string) => void;
}

export class OptimizedParticleSystem {
  private canvas: HTMLCanvasElement;
  private scene!: THREE.Scene;
  private camera!: THREE.OrthographicCamera;
  private renderer!: THREE.WebGLRenderer;
  private particles: THREE.Points | null = null;
  private particleCount: number;
  private velocities!: Float32Array;
  private alphas!: Float32Array;
  private animationId: number | null = null;
  private lastFrameTime: number = 0;
  private config: ParticleConfig;
  private targetFrameRate: number;
  private frameSkipCounter: number = 0;
  private isDestroyed: boolean = false;

  constructor(options: ParticleSystemOptions) {
    this.canvas = options.canvas;
    this.config = options.config;
    this.particleCount = options.config.maxParticles;
    this.targetFrameRate = options.config.updateFrequency;
    this.velocities = new Float32Array(this.particleCount);
    this.alphas = new Float32Array(this.particleCount);

    try {
      // Initialize Three.js
      this.scene = new THREE.Scene();
      this.camera = new THREE.OrthographicCamera(
        -options.width / 2,
        options.width / 2,
        options.height / 2,
        -options.height / 2,
        0.1,
        1000
      );
      this.camera.position.z = 1;

      const rendererOptions: THREE.WebGLRendererParameters = {
        canvas: this.canvas,
        antialias: this.config.textureQuality !== "low",
        alpha: true,
        preserveDrawingBuffer: false,
        powerPreference: "low-power",
      };

      this.renderer = new THREE.WebGLRenderer(rendererOptions);
      this.renderer.setSize(options.width, options.height);
      this.renderer.setClearColor(0x000000, 0);

      // Set pixel ratio based on quality
      const pixelRatio =
        this.config.textureQuality === "high" ? window.devicePixelRatio : 1;
      this.renderer.setPixelRatio(Math.min(pixelRatio, 2));

      this.createParticles();
      this.startAnimation();
    } catch {
      logger.error("Failed to initialize particle system");
      options.onPerformanceWarning?.("WebGL not available, particles disabled");
      this.isDestroyed = true;
    }
  }

  private createParticles(): void {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);
    const sizes = new Float32Array(this.particleCount);

    // Create particle texture
    const textureCanvas = document.createElement("canvas");
    textureCanvas.width = 100;
    textureCanvas.height = 100;
    const ctx = textureCanvas.getContext("2d");
    if (!ctx) return;

    // Draw particle texture based on quality
    const hue = 217;
    const gradient = ctx.createRadialGradient(50, 50, 0, 50, 50, 50);

    if (this.config.textureQuality === "high") {
      gradient.addColorStop(0.025, "#fff");
      gradient.addColorStop(0.1, `hsl(${hue}, 61%, 33%)`);
      gradient.addColorStop(0.25, `hsl(${hue}, 64%, 6%)`);
      gradient.addColorStop(1, "transparent");
    } else if (this.config.textureQuality === "medium") {
      gradient.addColorStop(0.1, `hsl(${hue}, 61%, 33%)`);
      gradient.addColorStop(0.5, `hsl(${hue}, 64%, 6%)`);
      gradient.addColorStop(1, "transparent");
    } else {
      // Low quality: simpler gradient
      gradient.addColorStop(0.2, `hsl(${hue}, 61%, 33%)`);
      gradient.addColorStop(1, "transparent");
    }

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(50, 50, 50, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(textureCanvas);
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    // Initialize particles
    for (let i = 0; i < this.particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * window.innerWidth * 2;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 250;
      positions[i * 3 + 2] = 0;

      colors[i * 3] = 1;
      colors[i * 3 + 1] = 1;
      colors[i * 3 + 2] = 1;

      const orbitRadius = Math.random() * 200 + 100;
      sizes[i] = Math.max(1, (Math.random() * (orbitRadius - 60) + 60) / 8);

      this.velocities[i] = Math.random() * 60 + 30;
      this.alphas[i] = (Math.random() * 8 + 2) / 10;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute("alpha", new THREE.BufferAttribute(this.alphas, 1));

    // Create shader material
    const material = new THREE.ShaderMaterial({
      uniforms: {
        pointTexture: { value: texture },
        size: { value: this.config.particleSize || 15.0 },
      },
      vertexShader: `
        attribute float alpha;
        varying float vAlpha;
        varying vec3 vColor;
        uniform float size;

        void main() {
          vAlpha = alpha;
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / length(mvPosition));
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D pointTexture;
        varying float vAlpha;
        varying vec3 vColor;

        void main() {
          gl_FragColor = vec4(vColor, vAlpha) * texture2D(pointTexture, gl_PointCoord);
        }
      `,
      transparent: true,
      blending: this.config.enableGlow
        ? THREE.AdditiveBlending
        : THREE.NormalBlending,
      depthWrite: false,
      vertexColors: true,
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  private startAnimation(): void {
    if (this.isDestroyed) return;

    const animate = () => {
      this.animationId = requestAnimationFrame(animate);

      // Frame skipping for lower frame rates
      const now = performance.now();
      const frameDelta = now - this.lastFrameTime;
      const targetFrameDelta = 1000 / this.targetFrameRate;

      this.frameSkipCounter++;
      const shouldSkipFrame = frameDelta < targetFrameDelta;

      if (shouldSkipFrame && this.frameSkipCounter < 5) {
        return;
      }

      this.frameSkipCounter = 0;
      this.lastFrameTime = now;

      this.updateParticles();
      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  private updateParticles(): void {
    if (!this.particles) return;

    const positionAttr = this.particles.geometry.attributes.position;
    const alphaAttr = this.particles.geometry.attributes.alpha;

    if (!positionAttr || !alphaAttr) return;

    const positions = positionAttr.array as Float32Array;
    const alphas = alphaAttr.array as Float32Array;
    const time = Date.now() * 0.001;

    for (let i = 0; i < this.particleCount; i++) {
      const velocity = this.velocities[i];
      const posX = positions[i * 3];

      if (velocity !== undefined && posX !== undefined) {
        positions[i * 3] = posX + velocity * 0.016;
      }

      const currentPosX = positions[i * 3];
      if (
        currentPosX !== undefined &&
        currentPosX > window.innerWidth / 2 + 100
      ) {
        positions[i * 3] = -window.innerWidth / 2 - 100;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 250;
      }

      const currentPosY = positions[i * 3 + 1];
      if (currentPosY !== undefined) {
        positions[i * 3 + 1] = currentPosY + Math.sin(time + i * 0.1) * 0.5;
      }

      // Reduced twinkle on low quality
      if (this.config.textureQuality === "high") {
        const twinkle = Math.floor(Math.random() * 10);
        const currentAlpha = alphas[i];

        if (currentAlpha !== undefined) {
          let newAlpha = currentAlpha;
          if (twinkle === 1 && currentAlpha > 0) {
            newAlpha = currentAlpha - 0.05;
          } else if (twinkle === 2 && currentAlpha < 1) {
            newAlpha = currentAlpha + 0.05;
          }
          alphas[i] = Math.max(0, Math.min(1, newAlpha));
        }
      }
    }

    positionAttr.needsUpdate = true;
    alphaAttr.needsUpdate = true;
  }

  public updateConfig(newConfig: ParticleConfig): void {
    this.config = newConfig;
    this.targetFrameRate = newConfig.updateFrequency;

    // Update particle count if changed
    if (newConfig.maxParticles !== this.particleCount) {
      this.dispose();
      this.particleCount = newConfig.maxParticles;
      this.velocities = new Float32Array(this.particleCount);
      this.alphas = new Float32Array(this.particleCount);
      this.createParticles();
      this.startAnimation();
    }
  }

  public onWindowResize(width: number, height: number): void {
    this.camera.left = -width / 2;
    this.camera.right = width / 2;
    this.camera.top = height / 2;
    this.camera.bottom = -height / 2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }

    if (this.particles) {
      this.scene.remove(this.particles);
      this.particles.geometry.dispose();
      (this.particles.material as THREE.Material).dispose();
    }

    this.renderer.dispose();
    this.isDestroyed = true;
  }

  public isHealthy(): boolean {
    return !this.isDestroyed && !!this.renderer && !!this.renderer.domElement;
  }
}
