"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  performanceDetector,
  type DeviceCapabilities,
  type ParticleConfig,
} from "@/lib/performance-detection";

/**
 * Hook for detecting and monitoring device performance capabilities
 *
 * Provides real-time updates to performance profile and particle configuration
 * based on battery status, network conditions, and hardware capabilities.
 *
 * @example
 * ```tsx
 * function ParticleComponent() {
 *   const { config, shouldDisable, performanceScore } = usePerformanceDetection();
 *
 *   if (shouldDisable) {
 *     return null; // Don't render particles on low-end devices
 *   }
 *
 *   return (
 *     <canvas
 *       ref={canvasRef}
 *       {...config}
 *     />
 *   );
 * }
 * ```
 */
export function usePerformanceDetection() {
  const [capabilities, setCapabilities] = useState<DeviceCapabilities | null>(
    null
  );
  const [particleConfig, setParticleConfig] = useState<ParticleConfig | null>(
    null
  );
  const [shouldDisable, setShouldDisable] = useState(false);
  const [shouldReduceQuality, setShouldReduceQuality] = useState(false);
  const [targetFrameRate, setTargetFrameRate] = useState(60);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Initialize detection
  useEffect(() => {
    // Get initial capabilities
    const initialCaps = performanceDetector.getCapabilities();
    setCapabilities(initialCaps);
    setParticleConfig(performanceDetector.getParticleConfig());
    setShouldDisable(performanceDetector.shouldDisableParticles());
    setShouldReduceQuality(performanceDetector.shouldReduceQuality());
    setTargetFrameRate(performanceDetector.getTargetFrameRate());

    // Subscribe to capability changes
    const unsubscribe = performanceDetector.subscribe((newCaps) => {
      setCapabilities(newCaps);
      setParticleConfig(performanceDetector.getParticleConfig());
      setShouldDisable(performanceDetector.shouldDisableParticles());
      setShouldReduceQuality(performanceDetector.shouldReduceQuality());
      setTargetFrameRate(performanceDetector.getTargetFrameRate());
    });

    unsubscribeRef.current = unsubscribe;

    // Cleanup
    return () => {
      unsubscribeRef.current?.();
    };
  }, []);

  const getPerformanceLabel = useCallback((): string => {
    if (!capabilities) return "Unknown";

    const score = capabilities.performanceScore;
    if (score >= 9) return "Excellent";
    if (score >= 7) return "Good";
    if (score >= 5) return "Average";
    if (score >= 3) return "Low";
    return "Very Low";
  }, [capabilities]);

  const getBatteryLabel = useCallback((): string => {
    if (!capabilities || !capabilities.hasBattery) return "N/A";

    const level = Math.round(capabilities.batteryLevel * 100);
    const status = capabilities.isCharging ? "(charging)" : "(discharging)";
    return `${level}% ${status}`;
  }, [capabilities]);

  const getNetworkLabel = useCallback((): string => {
    if (!capabilities) return "Unknown";
    return capabilities.effectiveType.toUpperCase();
  }, [capabilities]);

  return {
    // Raw data
    capabilities,
    particleConfig,

    // Derived state
    shouldDisable,
    shouldReduceQuality,
    targetFrameRate,

    // Device info
    performanceScore: capabilities?.performanceScore ?? 0,
    isMobile: capabilities?.deviceType === "mobile",
    isTablet: capabilities?.deviceType === "tablet",
    isDesktop: capabilities?.deviceType === "desktop",

    // Battery info
    batteryLevel: capabilities?.batteryLevel ?? 1,
    isCharging: capabilities?.isCharging ?? false,
    hasBattery: capabilities?.hasBattery ?? false,
    isBatteryLow:
      (capabilities?.batteryLevel ?? 1) < 0.2 && !capabilities?.isCharging,

    // Hardware info
    cpuCores: capabilities?.cpuCores ?? 4,
    deviceMemory: capabilities?.deviceMemory ?? 8,
    maxTouchPoints: capabilities?.maxTouchPoints ?? 0,

    // Network info
    effectiveNetworkType: capabilities?.effectiveType ?? "4g",
    networkDownlink: capabilities?.downlink ?? 10,
    networkRTT: capabilities?.rtt ?? 50,
    saveDataMode: capabilities?.saveData ?? false,

    // Rendering capabilities
    canUseWebGL: capabilities?.canUseWebGL ?? false,
    canUseWebGL2: capabilities?.canUseWebGL2 ?? false,
    maxFrameRate: capabilities?.maxFrameRate ?? 60,

    // Label generators for UI display
    getPerformanceLabel,
    getBatteryLabel,
    getNetworkLabel,

    // Utility methods
    forceRefresh: () => {
      const updated = performanceDetector.updateCapabilities();
      setCapabilities(updated);
      setParticleConfig(performanceDetector.getParticleConfig());
      setShouldDisable(performanceDetector.shouldDisableParticles());
      setShouldReduceQuality(performanceDetector.shouldReduceQuality());
      setTargetFrameRate(performanceDetector.getTargetFrameRate());
    },
  };
}

/**
 * Hook for subscribing to specific performance metrics
 *
 * @param metric - The metric to monitor
 * @param callback - Function called when metric changes
 *
 * @example
 * ```tsx
 * usePerformanceMetric('batteryLevel', (level) => {
 *   console.log('Battery level changed:', level);
 * });
 * ```
 */
export function usePerformanceMetric<K extends keyof DeviceCapabilities>(
  metric: K,
  callback?: (value: DeviceCapabilities[K]) => void
) {
  const [value, setValue] = useState<DeviceCapabilities[K] | null>(null);

  useEffect(() => {
    const unsubscribe = performanceDetector.subscribe((caps) => {
      const newValue = caps[metric];
      setValue(newValue);
      callback?.(newValue);
    });

    // Set initial value
    const initialCaps = performanceDetector.getCapabilities();
    setValue(initialCaps[metric]);

    return () => unsubscribe();
  }, [metric, callback]);

  return value;
}

/**
 * Hook for battery status monitoring
 *
 * @example
 * ```tsx
 * const battery = useBatteryStatus();
 * if (battery.isCritical) {
 *   // Disable heavy animations
 * }
 * ```
 */
export function useBatteryStatus() {
  const perf = usePerformanceDetection();

  return {
    level: perf.batteryLevel,
    isCharging: perf.isCharging,
    hasBattery: perf.hasBattery,
    isCritical: perf.isBatteryLow,
    label: perf.getBatteryLabel(),
  };
}

/**
 * Hook for network condition monitoring
 *
 * @example
 * ```tsx
 * const network = useNetworkCondition();
 * if (network.isSlowConnection) {
 *   // Reduce asset quality
 * }
 * ```
 */
export function useNetworkCondition() {
  const perf = usePerformanceDetection();

  const isSlowConnection =
    perf.effectiveNetworkType === "2g" ||
    perf.effectiveNetworkType === "slow-2g" ||
    perf.saveDataMode;

  return {
    type: perf.effectiveNetworkType,
    downlink: perf.networkDownlink,
    rtt: perf.networkRTT,
    saveDataMode: perf.saveDataMode,
    isSlowConnection,
    label: perf.getNetworkLabel(),
  };
}

/**
 * Hook for determining if heavy animations should be disabled
 *
 * @example
 * ```tsx
 * const shouldReduceAnimations = useShouldReduceAnimations();
 * return shouldReduceAnimations ? <div /> : <AnimatedComponent />;
 * ```
 */
export function useShouldReduceAnimations() {
  const perf = usePerformanceDetection();

  // Disable if:
  // 1. Battery is critically low
  // 2. Network is very slow
  // 3. Performance is very low
  // 4. User prefers reduced motion
  const shouldReduce =
    perf.shouldDisable ||
    perf.isBatteryLow ||
    perf.effectiveNetworkType === "2g" ||
    perf.effectiveNetworkType === "slow-2g" ||
    perf.performanceScore < 3 ||
    (typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  return shouldReduce;
}

/**
 * Hook for adaptive animation frame rate
 *
 * Provides adaptive frame rate based on device capabilities
 *
 * @example
 * ```tsx
 * const frameRate = useAdaptiveFrameRate();
 * useEffect(() => {
 *   const interval = setInterval(() => {
 *     // Animate at adaptive frame rate
 *   }, 1000 / frameRate);
 * }, [frameRate]);
 * ```
 */
export function useAdaptiveFrameRate() {
  const perf = usePerformanceDetection();
  return perf.targetFrameRate;
}
