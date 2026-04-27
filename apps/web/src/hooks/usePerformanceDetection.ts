"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";

import {
  performanceDetector,
  type DeviceCapabilities,
  type ParticleConfig,
} from "@/lib/performance-detection";

function subscribePerformance(onStoreChange: () => void): () => void {
  return performanceDetector.subscribe(() => {
    onStoreChange();
  });
}

function getCapabilitiesSnapshot(): DeviceCapabilities {
  return performanceDetector.getCapabilities();
}

function getServerCapabilitiesSnapshot(): DeviceCapabilities | null {
  return null;
}

function getParticleConfigSnapshot(
  capabilities: DeviceCapabilities | null
): ParticleConfig | null {
  return capabilities ? performanceDetector.getParticleConfig() : null;
}

function getDetectorFlags(capabilities: DeviceCapabilities | null) {
  if (!capabilities) {
    return {
      shouldDisable: false,
      shouldReduceQuality: false,
      targetFrameRate: 60,
    };
  }

  return {
    shouldDisable: performanceDetector.shouldDisableParticles(),
    shouldReduceQuality: performanceDetector.shouldReduceQuality(),
    targetFrameRate: performanceDetector.getTargetFrameRate(),
  };
}

function getCapabilityDetails(capabilities: DeviceCapabilities | null) {
  if (!capabilities) {
    return {
      performanceScore: 0,
      isMobile: false,
      isTablet: false,
      isDesktop: false,
      batteryLevel: 1,
      isCharging: false,
      hasBattery: false,
      isBatteryLow: false,
      cpuCores: 4,
      deviceMemory: 8,
      maxTouchPoints: 0,
      effectiveNetworkType: "4g" as const,
      networkDownlink: 10,
      networkRTT: 50,
      saveDataMode: false,
      canUseWebGL: false,
      canUseWebGL2: false,
      maxFrameRate: 60,
    };
  }

  return {
    performanceScore: capabilities.performanceScore,
    isMobile: capabilities.deviceType === "mobile",
    isTablet: capabilities.deviceType === "tablet",
    isDesktop: capabilities.deviceType === "desktop",
    batteryLevel: capabilities.batteryLevel,
    isCharging: capabilities.isCharging,
    hasBattery: capabilities.hasBattery,
    isBatteryLow: capabilities.batteryLevel < 0.2 && !capabilities.isCharging,
    cpuCores: capabilities.cpuCores,
    deviceMemory: capabilities.deviceMemory,
    maxTouchPoints: capabilities.maxTouchPoints,
    effectiveNetworkType: capabilities.effectiveType,
    networkDownlink: capabilities.downlink,
    networkRTT: capabilities.rtt,
    saveDataMode: capabilities.saveData,
    canUseWebGL: capabilities.canUseWebGL,
    canUseWebGL2: capabilities.canUseWebGL2,
    maxFrameRate: capabilities.maxFrameRate,
  };
}

function getPerformanceLabelFor(
  capabilities: DeviceCapabilities | null
): string {
  if (!capabilities) return "Unknown";

  const score = capabilities.performanceScore;
  if (score >= 9) return "Excellent";
  if (score >= 7) return "Good";
  if (score >= 5) return "Average";
  if (score >= 3) return "Low";
  return "Very Low";
}

function getBatteryLabelFor(capabilities: DeviceCapabilities | null): string {
  if (!capabilities?.hasBattery) return "N/A";

  const level = Math.round(capabilities.batteryLevel * 100);
  const status = capabilities.isCharging ? "(charging)" : "(discharging)";
  return `${level}% ${status}`;
}

function getNetworkLabelFor(capabilities: DeviceCapabilities | null): string {
  if (!capabilities) return "Unknown";
  return capabilities.effectiveType.toUpperCase();
}

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
  const capabilities = useSyncExternalStore<DeviceCapabilities | null>(
    subscribePerformance,
    getCapabilitiesSnapshot,
    getServerCapabilitiesSnapshot
  );
  const particleConfig = useMemo<ParticleConfig | null>(
    () => getParticleConfigSnapshot(capabilities),
    [capabilities]
  );
  const detectorFlags = useMemo(
    () => getDetectorFlags(capabilities),
    [capabilities]
  );
  const capabilityDetails = useMemo(
    () => getCapabilityDetails(capabilities),
    [capabilities]
  );

  const getPerformanceLabel = useCallback((): string => {
    return getPerformanceLabelFor(capabilities);
  }, [capabilities]);

  const getBatteryLabel = useCallback((): string => {
    return getBatteryLabelFor(capabilities);
  }, [capabilities]);

  const getNetworkLabel = useCallback((): string => {
    return getNetworkLabelFor(capabilities);
  }, [capabilities]);

  const forceRefresh = useCallback(() => {
    performanceDetector.updateCapabilities();
  }, []);

  return {
    // Raw data
    capabilities,
    particleConfig,

    // Derived state
    ...detectorFlags,

    // Capability details
    ...capabilityDetails,

    // Label generators for UI display
    getPerformanceLabel,
    getBatteryLabel,
    getNetworkLabel,

    // Utility methods
    forceRefresh,
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
  const value = useSyncExternalStore<DeviceCapabilities[K] | null>(
    subscribePerformance,
    () => performanceDetector.getCapabilities()[metric],
    () => null
  );

  useEffect(() => {
    if (value !== null) {
      callback?.(value);
    }
  }, [callback, value]);

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
