/**
 * Performance and Battery Detection Utility
 *
 * Detects device capabilities including:
 * - Battery status and charging state
 * - CPU cores and device memory
 * - Network connection quality
 * - Rendering capabilities
 * - Overall device performance level
 */

export interface DeviceCapabilities {
  // Battery info
  batteryLevel: number; // 0-1
  isCharging: boolean;
  chargingTime: number; // seconds
  dischargingTime: number; // seconds
  hasBattery: boolean;

  // Hardware info
  cpuCores: number;
  deviceMemory: number; // GB
  maxTouchPoints: number;

  // Network info
  effectiveType: "4g" | "3g" | "2g" | "slow-2g" | "unknown";
  downlink: number; // Mbps
  rtt: number; // milliseconds
  saveData: boolean;

  // Rendering capabilities
  maxFrameRate: number;
  canUseWebGL: boolean;
  canUseWebGL2: boolean;
  supportsOffscreenCanvas: boolean;
  supportsSharedArrayBuffer: boolean;

  // Performance level (0-10)
  performanceScore: number;
  deviceType:
    | "high-end"
    | "mid-range"
    | "low-end"
    | "mobile"
    | "tablet"
    | "desktop";
}

export interface ParticleConfig {
  maxParticles: number;
  particleSize: number;
  updateFrequency: number; // FPS
  enableBlur: boolean;
  enableGlow: boolean;
  enableShadows: boolean;
  textureQuality: "high" | "medium" | "low";
}

class PerformanceDetector {
  private capabilities: DeviceCapabilities | null = null;
  private batteryManager: any = null;
  private connectionInfo: any = null;
  private observers = new Set<(caps: DeviceCapabilities) => void>();

  constructor() {
    this.initializeBatteryAPI();
    this.initializeConnectionAPI();
    this.setupListeners();
  }

  private initializeBatteryAPI(): void {
    if ("getBattery" in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        this.batteryManager = battery;
        this.updateCapabilities();
        battery.addEventListener("levelchange", () =>
          this.updateCapabilities()
        );
        battery.addEventListener("chargingchange", () =>
          this.updateCapabilities()
        );
        battery.addEventListener("chargingtimechange", () =>
          this.updateCapabilities()
        );
        battery.addEventListener("dischargingtimechange", () =>
          this.updateCapabilities()
        );
      });
    }
  }

  private initializeConnectionAPI(): void {
    if ("connection" in navigator) {
      this.connectionInfo = (navigator as any).connection;
      this.updateCapabilities();
      this.connectionInfo.addEventListener("change", () =>
        this.updateCapabilities()
      );
    }
  }

  private setupListeners(): void {
    window.addEventListener("resize", () => this.updateCapabilities());
    document.addEventListener("visibilitychange", () =>
      this.updateCapabilities()
    );
  }

  private getBatteryInfo() {
    if (!this.batteryManager) {
      return {
        batteryLevel: 0.8,
        isCharging: false,
        chargingTime: Infinity,
        dischargingTime: Infinity,
        hasBattery: false,
      };
    }

    return {
      batteryLevel: this.batteryManager.level ?? 0.8,
      isCharging: this.batteryManager.charging ?? false,
      chargingTime: this.batteryManager.chargingTime ?? Infinity,
      dischargingTime: this.batteryManager.dischargingTime ?? Infinity,
      hasBattery: true,
    };
  }

  private getNetworkInfo() {
    if (!this.connectionInfo) {
      return {
        effectiveType: "4g" as const,
        downlink: 10,
        rtt: 50,
        saveData: false,
      };
    }

    return {
      effectiveType: (this.connectionInfo.effectiveType ?? "4g"),
      downlink: this.connectionInfo.downlink ?? 10,
      rtt: this.connectionInfo.rtt ?? 50,
      saveData: (this.connectionInfo.saveData ?? false) as boolean,
    };
  }

  private getHardwareInfo() {
    return {
      cpuCores: (navigator as any).hardwareConcurrency ?? 4,
      deviceMemory: (navigator as any).deviceMemory ?? 8,
      maxTouchPoints: navigator.maxTouchPoints || 0,
    };
  }

  private getRenderingCapabilities() {
    let canUseWebGL = false;
    let canUseWebGL2 = false;

    try {
      const canvas = document.createElement("canvas");
      canUseWebGL = !!canvas.getContext("webgl");
      canUseWebGL2 = !!canvas.getContext("webgl2");
    } catch {
      // WebGL not supported
    }

    return {
      maxFrameRate: this.getDeviceRefreshRate(),
      canUseWebGL,
      canUseWebGL2,
      supportsOffscreenCanvas: typeof OffscreenCanvas !== "undefined",
      supportsSharedArrayBuffer: typeof SharedArrayBuffer !== "undefined",
    };
  }

  private getDeviceRefreshRate(): number {
    if ("screen" in window && "refreshRate" in window.screen) {
      return (window.screen as any).refreshRate ?? 60;
    }
    return 60;
  }

  private calculatePerformanceScore(caps: Partial<DeviceCapabilities>): number {
    let score = 5; // Start at 5/10

    // Battery impact
    if (caps.hasBattery) {
      if (caps.batteryLevel! < 0.2) {
        score -= 2; // Low battery penalty
      } else if (caps.isCharging) {
        score += 1; // Charging bonus
      }
    }

    // CPU cores
    if (caps.cpuCores! >= 8) {
      score += 2;
    } else if (caps.cpuCores! >= 4) {
      score += 1;
    } else if (caps.cpuCores! <= 2) {
      score -= 1;
    }

    // Device memory
    if (caps.deviceMemory! >= 16) {
      score += 2;
    } else if (caps.deviceMemory! >= 8) {
      score += 1;
    } else if (caps.deviceMemory! <= 4) {
      score -= 1;
    }

    // Network
    if (caps.effectiveType === "4g") {
      score += 1;
    } else if (caps.effectiveType === "3g") {
      score -= 1;
    } else if (
      caps.effectiveType === "2g" ||
      caps.effectiveType === "slow-2g"
    ) {
      score -= 2;
    }

    // Rendering
    if (caps.canUseWebGL2) {
      score += 1;
    } else if (!caps.canUseWebGL) {
      score -= 1;
    }

    // Touch device
    if (caps.maxTouchPoints! > 0) {
      score -= 1; // Mobile devices typically have more constraints
    }

    return Math.max(0, Math.min(10, score));
  }

  private getDeviceType(): DeviceCapabilities["deviceType"] {
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
    const isTablet = /iPad|Android(?!.*Mobi)/i.test(navigator.userAgent);

    if (isTablet) return "tablet";
    if (isMobile) return "mobile";
    return "desktop";
  }

  public updateCapabilities(): DeviceCapabilities {
    const battery = this.getBatteryInfo();
    const network = this.getNetworkInfo();
    const hardware = this.getHardwareInfo();
    const rendering = this.getRenderingCapabilities();

    const capabilities: DeviceCapabilities = {
      ...battery,
      ...network,
      ...hardware,
      ...rendering,
      performanceScore: 0, // Will be calculated next
      deviceType: this.getDeviceType(),
    };

    capabilities.performanceScore =
      this.calculatePerformanceScore(capabilities);
    this.capabilities = capabilities;

    // Notify observers
    this.observers.forEach((observer) => observer(capabilities));

    return capabilities;
  }

  public getCapabilities(): DeviceCapabilities {
    if (!this.capabilities) {
      this.updateCapabilities();
    }
    return this.capabilities!;
  }

  public subscribe(observer: (caps: DeviceCapabilities) => void): () => void {
    this.observers.add(observer);
    return () => this.observers.delete(observer);
  }

  public getParticleConfig(): ParticleConfig {
    const caps = this.getCapabilities();

    // Base config
    const baseConfig: ParticleConfig = {
      maxParticles: 400,
      particleSize: 15,
      updateFrequency: 60,
      enableBlur: true,
      enableGlow: true,
      enableShadows: true,
      textureQuality: "high",
    };

    // Adjust based on performance score
    if (caps.performanceScore >= 9) {
      // High-end devices
      return {
        ...baseConfig,
        maxParticles: 800,
        particleSize: 20,
        updateFrequency: 120,
        textureQuality: "high",
      };
    } else if (caps.performanceScore >= 7) {
      // Mid-range devices
      return {
        ...baseConfig,
        maxParticles: 400,
        particleSize: 15,
        updateFrequency: 60,
        textureQuality: "high",
      };
    } else if (caps.performanceScore >= 5) {
      // Average devices
      return {
        ...baseConfig,
        maxParticles: 250,
        particleSize: 12,
        updateFrequency: 30,
        textureQuality: "medium",
      };
    } else if (caps.performanceScore >= 3) {
      // Low-end devices
      return {
        ...baseConfig,
        maxParticles: 150,
        particleSize: 10,
        updateFrequency: 24,
        enableShadows: false,
        enableGlow: false,
        textureQuality: "low",
      };
    } else {
      // Very low-end devices
      return {
        ...baseConfig,
        maxParticles: 50,
        particleSize: 8,
        updateFrequency: 12,
        enableBlur: false,
        enableShadows: false,
        enableGlow: false,
        textureQuality: "low",
      };
    }
  }

  public shouldDisableParticles(): boolean {
    const caps = this.getCapabilities();

    // Disable on very low battery
    if (caps.hasBattery && caps.batteryLevel < 0.15 && !caps.isCharging) {
      return true;
    }

    // Disable on very slow networks
    if (caps.effectiveType === "2g" || caps.effectiveType === "slow-2g") {
      return true;
    }

    // Disable on extremely low-end devices
    if (caps.performanceScore < 2) {
      return true;
    }

    // Disable when user prefers reduced motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return true;
    }

    return false;
  }

  public shouldReduceQuality(): boolean {
    const caps = this.getCapabilities();
    return caps.performanceScore <= 5;
  }

  public getTargetFrameRate(): number {
    const caps = this.getCapabilities();
    const config = this.getParticleConfig();

    return Math.min(config.updateFrequency, caps.maxFrameRate);
  }
}

// Create singleton instance
export const performanceDetector = new PerformanceDetector();

// Export for testing
export { PerformanceDetector };
