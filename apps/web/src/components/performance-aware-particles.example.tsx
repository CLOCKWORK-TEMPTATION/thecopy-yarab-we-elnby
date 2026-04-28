"use client";

/**
 * Performance-Aware Particles Example Component
 *
 * Demonstrates how to integrate the performance detection system
 * with a particle component for optimal rendering across all devices.
 *
 * This example shows:
 * - Battery-aware rendering
 * - Network-adaptive quality
 * - Performance-based particle count
 * - Graceful degradation on low-end devices
 */

import { useEffect, useRef, useState } from "react";

import {
  usePerformanceDetection,
  useBatteryStatus,
  useNetworkCondition,
  useShouldReduceAnimations,
} from "@/hooks/usePerformanceDetection";
import { OptimizedParticleSystem } from "@/lib/particle-system";

export interface PerformanceAwareParticlesProps {
  /**
   * Show debug panel
   * @default process.env["NODE_ENV"] === 'development'
   */
  showDebug?: boolean;

  /**
   * Callback when performance changes
   */
  onPerformanceChange?: (profile: {
    score: number;
    particleCount: number;
    frameRate: number;
    quality: string;
  }) => void;

  /**
   * Custom className for container
   */
  className?: string;

  /**
   * Z-index for canvas
   */
  zIndex?: number;
}

/**
 * Main component with performance detection
 */
export function PerformanceAwareParticles({
  showDebug = process.env.NODE_ENV === "development",
  onPerformanceChange,
  className = "",
  zIndex = -1,
}: PerformanceAwareParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const systemRef = useRef<OptimizedParticleSystem | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Performance detection
  const perf = usePerformanceDetection();
  const battery = useBatteryStatus();
  const network = useNetworkCondition();
  const shouldReduceAnimations = useShouldReduceAnimations();

  // Initialize particle system
  useEffect(() => {
    if (!canvasRef.current || !perf.particleConfig) return;

    // Don't initialize if we should disable particles
    if (perf.shouldDisable) {
      setIsInitialized(false);
      return;
    }

    try {
      systemRef.current = new OptimizedParticleSystem({
        canvas: canvasRef.current,
        width: window.innerWidth,
        height: window.innerHeight,
        config: perf.particleConfig,
        onPerformanceWarning: (warning) => {
          console.warn("[Particles] Performance warning:", warning);
        },
      });

      setIsInitialized(true);

      // Notify parent component
      if (onPerformanceChange) {
        onPerformanceChange({
          score: perf.performanceScore,
          particleCount: perf.particleConfig.maxParticles,
          frameRate: perf.particleConfig.updateFrequency,
          quality: perf.particleConfig.textureQuality,
        });
      }
    } catch (error) {
      console.error("[Particles] Failed to initialize:", error);
      setIsInitialized(false);
    }

    return () => {
      if (systemRef.current?.isHealthy?.()) {
        systemRef.current.dispose();
        systemRef.current = null;
      }
    };
  }, [
    perf.particleConfig,
    perf.shouldDisable,
    onPerformanceChange,
    perf.performanceScore,
  ]);

  // Update particle config on performance changes
  useEffect(() => {
    if (
      !systemRef.current ||
      !perf.particleConfig ||
      !isInitialized ||
      !systemRef.current.isHealthy?.()
    ) {
      return;
    }

    systemRef.current.updateConfig(perf.particleConfig);

    if (onPerformanceChange) {
      onPerformanceChange({
        score: perf.performanceScore,
        particleCount: perf.particleConfig.maxParticles,
        frameRate: perf.particleConfig.updateFrequency,
        quality: perf.particleConfig.textureQuality,
      });
    }
  }, [
    perf.particleConfig,
    perf.performanceScore,
    isInitialized,
    onPerformanceChange,
  ]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!systemRef.current?.isHealthy?.()) return;

      systemRef.current.onWindowResize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Don't render if particles should be disabled
  if (perf.shouldDisable) {
    return null;
  }

  return (
    <>
      {/* Particle Canvas */}
      <canvas
        ref={canvasRef}
        className={className}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex,
        }}
        aria-label="Performance-optimized particle background"
      />

      {/* Debug Panel */}
      {showDebug && (
        <PerformanceDebugPanel
          perf={perf}
          battery={battery}
          network={network}
          isInitialized={isInitialized}
          shouldReduceAnimations={shouldReduceAnimations}
        />
      )}
    </>
  );
}

/**
 * Debug panel showing performance metrics
 */
function PerformanceDebugPanel({
  perf,
  battery,
  network,
  isInitialized,
  shouldReduceAnimations,
}: {
  perf: ReturnType<typeof usePerformanceDetection>;
  battery: ReturnType<typeof useBatteryStatus>;
  network: ReturnType<typeof useNetworkCondition>;
  isInitialized: boolean;
  shouldReduceAnimations: boolean;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div
      style={{
        position: "fixed",
        top: "1rem",
        right: "1rem",
        background: "rgba(0, 0, 0, 0.9)",
        color: "#0f0",
        padding: "1rem",
        borderRadius: "8px",
        fontFamily: "monospace",
        fontSize: "12px",
        zIndex: 9999,
        maxWidth: isCollapsed ? "300px" : "400px",
        transition: "all 0.2s ease",
        border: "1px solid #0f0",
      }}
    >
      {/* Header */}
      <div
        role="button"
        tabIndex={0}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.5rem",
          paddingBottom: "0.5rem",
          borderBottom: "1px solid #0f0",
          cursor: "pointer",
        }}
        onClick={() => setIsCollapsed(!isCollapsed)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            setIsCollapsed((current) => !current);
          }
        }}
      >
        <span style={{ fontWeight: "bold" }}>Performance Monitor</span>
        <span>{isCollapsed ? "▶" : "▼"}</span>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <>
          {/* Performance Score */}
          <div style={{ marginBottom: "0.5rem" }}>
            <div>📊 Performance: {perf.getPerformanceLabel()}</div>
            <div style={{ marginLeft: "1rem", fontSize: "11px", opacity: 0.8 }}>
              Score: {perf.performanceScore}/10
            </div>
          </div>

          {/* Device Info */}
          <div style={{ marginBottom: "0.5rem" }}>
            <div>🖥️ Device: {perf.capabilities?.deviceType ?? "Unknown"}</div>
            <div style={{ marginLeft: "1rem", fontSize: "11px", opacity: 0.8 }}>
              CPU: {perf.cpuCores} cores | RAM: {perf.deviceMemory}GB
            </div>
          </div>

          {/* Battery Status */}
          <div style={{ marginBottom: "0.5rem" }}>
            <div>
              🔋 Battery:{" "}
              {battery.isCritical
                ? "⚠️ CRITICAL"
                : battery.isCharging
                  ? "🔌 Charging"
                  : "Discharging"}
            </div>
            <div style={{ marginLeft: "1rem", fontSize: "11px", opacity: 0.8 }}>
              {(battery.level * 100).toFixed(0)}%
            </div>
          </div>

          {/* Network Status */}
          <div style={{ marginBottom: "0.5rem" }}>
            <div>
              🌐 Network:{" "}
              {network.isSlowConnection
                ? "⚠️ SLOW"
                : network.type.toUpperCase()}
            </div>
            <div style={{ marginLeft: "1rem", fontSize: "11px", opacity: 0.8 }}>
              {network.downlink}Mbps | {network.rtt}ms RTT
            </div>
          </div>

          {/* Particle Config */}
          <div style={{ marginBottom: "0.5rem" }}>
            <div>✨ Particles: {perf.particleConfig?.maxParticles ?? 0}</div>
            <div style={{ marginLeft: "1rem", fontSize: "11px", opacity: 0.8 }}>
              {perf.particleConfig?.updateFrequency ?? 0} FPS |{" "}
              {perf.particleConfig?.textureQuality ?? "N/A"}
            </div>
          </div>

          {/* Flags */}
          <div
            style={{
              marginBottom: "0.5rem",
              borderTop: "1px solid #0f0",
              paddingTop: "0.5rem",
            }}
          >
            <div>{perf.shouldDisable ? "✓" : "✗"} Disable Particles</div>
            <div>{perf.shouldReduceQuality ? "✓" : "✗"} Reduce Quality</div>
            <div>{shouldReduceAnimations ? "✓" : "✗"} Reduce Animations</div>
            <div>{isInitialized ? "✓" : "✗"} Initialized</div>
          </div>

          {/* Warnings */}
          {battery.isCritical && (
            <div
              style={{
                color: "#ff0000",
                marginTop: "0.5rem",
                fontWeight: "bold",
              }}
            >
              ⚠️ Battery critical - particles should be disabled
            </div>
          )}
          {network.isSlowConnection && (
            <div
              style={{
                color: "#ffaa00",
                marginTop: "0.5rem",
                fontWeight: "bold",
              }}
            >
              ⚠️ Slow network detected
            </div>
          )}
          {perf.shouldDisable && (
            <div
              style={{
                color: "#ffaa00",
                marginTop: "0.5rem",
                fontWeight: "bold",
              }}
            >
              ℹ️ Particles disabled for this device
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Hook to use performance profile in other components
 */
export function usePerformanceProfile() {
  const perf = usePerformanceDetection();
  const battery = useBatteryStatus();
  const network = useNetworkCondition();

  return {
    performanceScore: perf.performanceScore,
    deviceType: perf.capabilities?.deviceType,
    batteryLevel: battery.level,
    isBatteryLow: battery.isCritical,
    isCharging: battery.isCharging,
    networkType: network.type,
    isSlowNetwork: network.isSlowConnection,
    shouldDisable: perf.shouldDisable,
    shouldReduceQuality: perf.shouldReduceQuality,
    particleCount: perf.particleConfig?.maxParticles ?? 0,
    frameRate: perf.particleConfig?.updateFrequency ?? 0,
    textureQuality: perf.particleConfig?.textureQuality ?? "low",
  };
}

/**
 * Standalone debug component for any page
 */
export function PerformanceStatsOverlay() {
  const perf = usePerformanceDetection();

  if (!perf.capabilities) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: "1rem",
        left: "1rem",
        background: "rgba(0, 0, 0, 0.8)",
        color: "#fff",
        padding: "1rem",
        borderRadius: "8px",
        fontSize: "12px",
        fontFamily: "monospace",
        zIndex: 9998,
      }}
    >
      <p>Performance: {perf.getPerformanceLabel()}</p>
      <p>Battery: {perf.getBatteryLabel()}</p>
      <p>Network: {perf.getNetworkLabel()}</p>
    </div>
  );
}
