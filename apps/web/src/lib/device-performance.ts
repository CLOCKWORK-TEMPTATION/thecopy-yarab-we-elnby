import { logger } from "@/lib/ai/utils/logger";

/**
 * Device Performance Detection Utility
 *
 * Detects device capabilities to optimize particle rendering:
 * - Battery level and charging status
 * - Device memory
 * - CPU cores (hardware concurrency)
 * - Performance tier classification
 *
 * Usage:
 * ```ts
 * const detector = new DevicePerformanceDetector();
 * await detector.initialize();
 * const tier = detector.getPerformanceTier();
 * const particleCount = detector.getOptimalParticleCount();
 * ```
 */

export type PerformanceTier = "high" | "medium" | "low" | "minimal";

export interface DeviceCapabilities {
  /** Number of logical CPU cores */
  hardwareConcurrency: number;
  /** Device memory in GB (if available) */
  deviceMemory?: number;
  /** Battery level (0-1) if available */
  batteryLevel?: number;
  /** Whether device is charging */
  isCharging?: boolean;
  /** Whether device is on battery saver mode */
  isBatterySaver?: boolean;
  /** Screen width */
  screenWidth: number;
  /** Whether user prefers reduced motion */
  prefersReducedMotion: boolean;
}

export interface PerformanceConfig {
  /** Particle count for this tier */
  particleCount: number;
  /** Animation frame rate target */
  targetFPS: number;
  /** Whether to enable physics simulations */
  enablePhysics: boolean;
  /** Quality multiplier (0-1) */
  qualityMultiplier: number;
}

const PERFORMANCE_CONFIGS: Record<PerformanceTier, PerformanceConfig> = {
  high: {
    particleCount: 6000,
    targetFPS: 60,
    enablePhysics: true,
    qualityMultiplier: 1.0,
  },
  medium: {
    particleCount: 3000,
    targetFPS: 45,
    enablePhysics: true,
    qualityMultiplier: 0.7,
  },
  low: {
    particleCount: 1500,
    targetFPS: 30,
    enablePhysics: false,
    qualityMultiplier: 0.5,
  },
  minimal: {
    particleCount: 500,
    targetFPS: 20,
    enablePhysics: false,
    qualityMultiplier: 0.3,
  },
};

export class DevicePerformanceDetector {
  private capabilities: DeviceCapabilities | null = null;
  private performanceTier: PerformanceTier = "medium";

  /**
   * Initialize the detector and gather device capabilities
   */
  async initialize(): Promise<void> {
    if (typeof window === "undefined") {
      return;
    }

    const deviceMemory = this.getDeviceMemory();
    const capabilities: DeviceCapabilities = {
      hardwareConcurrency: this.getHardwareConcurrency(),
      ...(deviceMemory ? { deviceMemory } : {}),
      screenWidth: window.innerWidth,
      prefersReducedMotion: this.getPrefersReducedMotion(),
    };

    // Try to get battery info
    try {
      const battery = await this.getBatteryInfo();
      if (battery) {
        capabilities.batteryLevel = battery.level;
        capabilities.isCharging = battery.charging;
        capabilities.isBatterySaver = battery.level < 0.2 && !battery.charging;
      }
    } catch (error) {
      // Battery API not available or denied - not critical
      logger.debug("Battery API not available:", error);
    }

    this.capabilities = capabilities;
    this.performanceTier = this.calculatePerformanceTier(capabilities);

    logger.info("[DevicePerformance] Detected capabilities:", capabilities);
    logger.info("[DevicePerformance] Performance tier:", this.performanceTier);
  }

  /**
   * Get the current performance tier
   */
  getPerformanceTier(): PerformanceTier {
    return this.performanceTier;
  }

  /**
   * Get the optimal particle count for this device
   */
  getOptimalParticleCount(): number {
    const config = PERFORMANCE_CONFIGS[this.performanceTier];
    return config.particleCount;
  }

  /**
   * Get the full performance configuration
   */
  getPerformanceConfig(): PerformanceConfig {
    return PERFORMANCE_CONFIGS[this.performanceTier];
  }

  /**
   * Get device capabilities
   */
  getCapabilities(): DeviceCapabilities | null {
    return this.capabilities;
  }

  /**
   * Check if particles should be disabled entirely
   */
  shouldDisableParticles(): boolean {
    if (!this.capabilities) {
      return false;
    }

    // Disable if user prefers reduced motion
    if (this.capabilities.prefersReducedMotion) {
      return true;
    }

    // Disable if battery is critically low and not charging
    if (
      this.capabilities.batteryLevel !== undefined &&
      this.capabilities.batteryLevel < 0.15 &&
      !this.capabilities.isCharging
    ) {
      return true;
    }

    return false;
  }

  /**
   * Get hardware concurrency (CPU cores)
   */
  private getHardwareConcurrency(): number {
    if (typeof navigator !== "undefined" && navigator.hardwareConcurrency) {
      return navigator.hardwareConcurrency;
    }
    return 4; // Default fallback
  }

  /**
   * Get device memory in GB
   */
  private getDeviceMemory(): number | undefined {
    if (typeof navigator !== "undefined") {
      return (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    }
    return undefined;
  }

  /**
   * Check if user prefers reduced motion
   */
  private getPrefersReducedMotion(): boolean {
    if (typeof window === "undefined") {
      return false;
    }

    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  /**
   * Get battery information
   */
  private async getBatteryInfo(): Promise<{
    level: number;
    charging: boolean;
  } | null> {
    if (typeof navigator === "undefined") {
      return null;
    }

    const nav = navigator as Navigator & {
      getBattery?(): Promise<{ level: number; charging: boolean }>;
    };
    if (!nav.getBattery) {
      return null;
    }

    try {
      const battery = await nav.getBattery();
      return {
        level: battery.level,
        charging: battery.charging,
      };
    } catch {
      return null;
    }
  }

  /**
   * Calculate performance tier based on device capabilities
   */
  private calculatePerformanceTier(
    capabilities: DeviceCapabilities
  ): PerformanceTier {
    let score = 0;

    // CPU cores scoring (0-30 points)
    if (capabilities.hardwareConcurrency >= 8) {
      score += 30;
    } else if (capabilities.hardwareConcurrency >= 4) {
      score += 20;
    } else if (capabilities.hardwareConcurrency >= 2) {
      score += 10;
    }

    // Memory scoring (0-25 points)
    if (capabilities.deviceMemory !== undefined) {
      if (capabilities.deviceMemory >= 8) {
        score += 25;
      } else if (capabilities.deviceMemory >= 4) {
        score += 15;
      } else if (capabilities.deviceMemory >= 2) {
        score += 8;
      }
    } else {
      // No memory info - assume medium (15 points)
      score += 15;
    }

    // Screen size scoring (0-15 points)
    if (capabilities.screenWidth >= 1920) {
      score += 15;
    } else if (capabilities.screenWidth >= 1280) {
      score += 10;
    } else if (capabilities.screenWidth >= 768) {
      score += 5;
    }

    // Battery penalty (0-20 points deduction)
    if (capabilities.isBatterySaver) {
      score -= 20;
    } else if (
      capabilities.batteryLevel !== undefined &&
      capabilities.batteryLevel < 0.3 &&
      !capabilities.isCharging
    ) {
      score -= 10;
    }

    // Reduced motion check
    if (capabilities.prefersReducedMotion) {
      return "minimal";
    }

    // Determine tier based on score
    // Max possible score: 70 points
    if (score >= 55) {
      return "high";
    } else if (score >= 35) {
      return "medium";
    } else if (score >= 20) {
      return "low";
    } else {
      return "minimal";
    }
  }

  /**
   * Monitor battery changes and update tier if needed
   */
  async monitorBatteryChanges(
    onTierChange: (newTier: PerformanceTier) => void
  ): Promise<() => void> {
    if (typeof navigator === "undefined") {
      return () => {
        /* empty */
      };
    }

    const nav = navigator as Navigator & {
      getBattery?(): Promise<{
        level: number;
        charging: boolean;
        addEventListener(type: string, listener: () => void): void;
        removeEventListener(type: string, listener: () => void): void;
      }>;
    };
    if (!nav.getBattery) {
      return () => {
        /* empty */
      };
    }

    try {
      const battery = await nav.getBattery();

      const handleBatteryChange = () => {
        if (this.capabilities) {
          this.capabilities.batteryLevel = battery.level;
          this.capabilities.isCharging = battery.charging;
          this.capabilities.isBatterySaver =
            battery.level < 0.2 && !battery.charging;

          const newTier = this.calculatePerformanceTier(this.capabilities);
          if (newTier !== this.performanceTier) {
            logger.info("[DevicePerformance] Tier changed", {
              previousTier: this.performanceTier,
              nextTier: newTier,
            });
            this.performanceTier = newTier;
            onTierChange(newTier);
          }
        }
      };

      battery.addEventListener("levelchange", handleBatteryChange);
      battery.addEventListener("chargingchange", handleBatteryChange);

      // Return cleanup function
      return () => {
        battery.removeEventListener("levelchange", handleBatteryChange);
        battery.removeEventListener("chargingchange", handleBatteryChange);
      };
    } catch {
      return () => {
        /* empty */
      };
    }
  }
}

/**
 * Singleton instance for easy access
 */
let globalDetector: DevicePerformanceDetector | null = null;

export async function getDevicePerformanceDetector(): Promise<DevicePerformanceDetector> {
  if (!globalDetector) {
    globalDetector = new DevicePerformanceDetector();
    await globalDetector.initialize();
  }
  return globalDetector;
}
