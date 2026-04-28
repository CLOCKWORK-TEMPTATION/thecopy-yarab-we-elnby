import { v4 as uuidv4 } from "uuid";

import { definedProps } from "@/lib/defined-props";

import { productions } from "./state";
import { updateProductionTimestamp } from "./utils";

import type {
  LEDWall,
  LensInfo,
  TrackingSession,
  VPCamera,
  VPScene,
  VisualEffect,
} from "./types";
import type { PluginOutput } from "../../types";

export function setupLedWallOperation(data: {
  productionId: string;
  name: string;
  dimensions: { width: number; height: number };
  pixelPitch: number;
  curvature?: number;
  colorSpace?: "rec709" | "rec2020" | "dci-p3";
}): PluginOutput {
  const production = productions.get(data.productionId);
  if (!production) {
    return { success: false, error: "Production not found" };
  }

  const resolutionWidth = Math.round(
    (data.dimensions.width * 1000) / data.pixelPitch
  );
  const resolutionHeight = Math.round(
    (data.dimensions.height * 1000) / data.pixelPitch
  );
  const panelCount = Math.ceil(
    (data.dimensions.width * data.dimensions.height) / 0.25
  );

  const ledWall: LEDWall = {
    id: uuidv4(),
    name: data.name,
    dimensions: data.dimensions,
    pixelPitch: data.pixelPitch,
    resolution: { width: resolutionWidth, height: resolutionHeight },
    curvature: data.curvature ?? 0,
    panels: panelCount,
    brightness: 1500,
    colorSpace: data.colorSpace ?? "rec709",
  };

  production.ledWalls.push(ledWall);
  updateProductionTimestamp(data.productionId);

  return {
    success: true,
    data: {
      ledWall: ledWall as unknown as Record<string, unknown>,
      specifications: {
        totalPixels: resolutionWidth * resolutionHeight,
        totalPanels: panelCount,
        recommendedDistance: data.pixelPitch * 1.5,
        powerConsumption: `~${Math.round(panelCount * 150)}W`,
        dataRate: `${Math.round((resolutionWidth * resolutionHeight * 24 * 60) / 1000000)}Mbps`,
      },
      calibrationUrl: `/vp/calibrate/${production.id}/${ledWall.id}`,
      message: "LED wall configured",
      messageAr: "تم تكوين جدار LED",
    },
  };
}

export function configureCameraOperation(data: {
  productionId: string;
  name: string;
  type: VPCamera["type"];
  lens: Partial<LensInfo>;
  trackingSystem?: VPCamera["trackingSystem"];
}): PluginOutput {
  const production = productions.get(data.productionId);
  if (!production) {
    return { success: false, error: "Production not found" };
  }

  const sensorSize = data.lens.sensorSize ?? { width: 36, height: 24 };
  const focalLength = data.lens.focalLength ?? 35;
  const fov =
    2 * Math.atan(sensorSize.width / (2 * focalLength)) * (180 / Math.PI);

  const camera: VPCamera = {
    id: uuidv4(),
    name: data.name,
    type: data.type,
    tracked: data.type !== "virtual" && !!data.trackingSystem,
    trackingSystem: data.trackingSystem ?? "inside-out",
    lens: {
      focalLength,
      aperture: data.lens.aperture ?? 2.8,
      sensorSize,
      calibrated: false,
      ...definedProps({
        distortionModel: data.lens.distortionModel,
      }),
    },
    position: { x: 0, y: 1.5, z: 5 },
    rotation: { x: 0, y: 0, z: 0 },
    frustum: {
      nearPlane: 0.1,
      farPlane: 1000,
      fov,
      aspectRatio: sensorSize.width / sensorSize.height,
    },
  };

  production.cameras.push(camera);
  production.updatedAt = new Date();

  return {
    success: true,
    data: {
      camera: camera as unknown as Record<string, unknown>,
      frustumVisualization: {
        fov: Math.round(fov * 10) / 10,
        coverageAtDistance: buildDistanceCoverage(fov, sensorSize),
      },
      calibrationRequired: !camera.lens.calibrated,
      message: "Camera configured for virtual production",
      messageAr: "تم تكوين الكاميرا للإنتاج الافتراضي",
    },
  };
}

function buildDistanceCoverage(
  fov: number,
  sensorSize: LensInfo["sensorSize"]
): Record<string, { width: number; height: number }> {
  return Object.fromEntries(
    [3, 5, 10].map((distance) => {
      const width = 2 * distance * Math.tan(((fov / 2) * Math.PI) / 180);
      return [
        `${distance}m`,
        { width, height: width / (sensorSize.width / sensorSize.height) },
      ];
    })
  );
}

export function startTrackingOperation(data: {
  productionId: string;
  cameraId: string;
  targetFps?: number;
}): PluginOutput {
  const production = productions.get(data.productionId);
  if (!production) {
    return { success: false, error: "Production not found" };
  }

  const camera = production.cameras.find((c) => c.id === data.cameraId);
  if (!camera) {
    return { success: false, error: "Camera not found" };
  }

  const session: TrackingSession = {
    id: uuidv4(),
    startTime: new Date(),
    cameraId: camera.id,
    fps: data.targetFps ?? 120,
    latency: getTrackingLatency(camera.trackingSystem),
    accuracy: getTrackingAccuracy(camera.trackingSystem),
    dataPoints: 0,
  };

  production.trackingData.push(session);
  production.updatedAt = new Date();

  return {
    success: true,
    data: {
      session: session as unknown as Record<string, unknown>,
      trackingInfo: {
        system: camera.trackingSystem,
        expectedLatency: `${session.latency}ms`,
        accuracy: `±${session.accuracy}mm`,
        fps: session.fps,
      },
      streamUrl: `/vp/tracking/${production.id}/${session.id}/stream`,
      monitorUrl: `/vp/tracking/${production.id}/${session.id}/monitor`,
      message: "Camera tracking started",
      messageAr: "بدأ تتبع الكاميرا",
    },
  };
}

function getTrackingLatency(
  trackingSystem: VPCamera["trackingSystem"]
): number {
  if (trackingSystem === "mocap") {
    return 8;
  }

  return trackingSystem === "lidar" ? 15 : 20;
}

function getTrackingAccuracy(
  trackingSystem: VPCamera["trackingSystem"]
): number {
  if (trackingSystem === "mocap") {
    return 0.5;
  }

  return trackingSystem === "lidar" ? 1 : 2;
}

export function setupSceneOperation(data: {
  productionId: string;
  name: string;
  environment: string;
  hdriBackground: string;
}): PluginOutput {
  const production = productions.get(data.productionId);
  if (!production) {
    return { success: false, error: "Production not found" };
  }

  const scene: VPScene = {
    id: uuidv4(),
    name: data.name,
    environment: data.environment,
    hdriBackground: data.hdriBackground,
    ledContent: `/content/scenes/${data.environment}.exr`,
    realTimeRendering: true,
    frustumCulling: true,
    parallaxCorrection: true,
  };

  production.scenes.push(scene);
  production.updatedAt = new Date();

  return {
    success: true,
    data: {
      scene: scene as unknown as Record<string, unknown>,
      renderSettings: {
        engine: "Unreal Engine 5",
        raytracing: true,
        nDisplay: true,
        innerFrustum: "camera-linked",
      },
      previewUrl: `/vp/scene/${production.id}/${scene.id}`,
      message: "Virtual production scene configured",
      messageAr: "تم تكوين مشهد الإنتاج الافتراضي",
    },
  };
}

export function addVisualEffectOperation(data: {
  productionId: string;
  name: string;
  type: VisualEffect["type"];
  realTime: boolean;
  parameters?: Record<string, unknown>;
}): PluginOutput {
  const production = productions.get(data.productionId);
  if (!production) {
    return { success: false, error: "Production not found" };
  }

  const effect: VisualEffect = {
    id: uuidv4(),
    name: data.name,
    type: data.type,
    realTime: data.realTime,
    gpuAccelerated: true,
    parameters: data.parameters ?? getDefaultVFXParameters(data.type),
  };

  production.visualEffects.push(effect);
  production.updatedAt = new Date();

  return {
    success: true,
    data: {
      effect: effect as unknown as Record<string, unknown>,
      performance: {
        realTimeCapable: effect.realTime,
        estimatedGpuUsage: effect.realTime ? "40-60%" : "80-100%",
        recommendedHardware: "RTX 4090 or better for real-time",
      },
      previewUrl: `/vp/vfx/${production.id}/${effect.id}`,
      message: "Visual effect added",
      messageAr: "تم إضافة التأثير البصري",
    },
  };
}

function getDefaultVFXParameters(
  type: VisualEffect["type"]
): Record<string, unknown> {
  const defaults: Record<VisualEffect["type"], Record<string, unknown>> = {
    particle: { count: 10000, lifetime: 5, size: 0.1, gravity: -9.8 },
    fluid: { resolution: 256, viscosity: 0.1, density: 1.0 },
    destruction: { pieces: 500, force: 100, debris: true },
    weather: { type: "rain", intensity: 0.5, wind: { x: 1, y: 0, z: 0 } },
    creature: { rig: "biped", muscles: true, skin: "subsurface" },
    environment: { type: "foliage", density: 100, wind: 0.3 },
  };

  return defaults[type];
}

export function calibrateSystemOperation(data: {
  productionId: string;
  components: ("camera" | "led-wall" | "tracking")[];
}): PluginOutput {
  const production = productions.get(data.productionId);
  if (!production) {
    return { success: false, error: "Production not found" };
  }

  const calibrationSteps: Record<"camera" | "led-wall" | "tracking", string[]> =
    {
      camera: [
        "Capture lens distortion chart",
        "Calculate distortion coefficients",
        "Store lens profile",
        "Verify with test pattern",
      ],
      "led-wall": [
        "Display color calibration pattern",
        "Measure color accuracy",
        "Adjust per-panel brightness",
        "Set color space mapping",
      ],
      tracking: [
        "Place calibration markers",
        "Capture reference positions",
        "Calculate transformation matrix",
        "Verify tracking accuracy",
      ],
    };

  const selectedSteps = Object.fromEntries(
    data.components.map((component) => [component, calibrationSteps[component]])
  );

  return {
    success: true,
    data: {
      calibrationPlan: selectedSteps,
      estimatedTime: `${data.components.length * 15} minutes`,
      calibrationUrl: `/vp/calibrate/${production.id}`,
      requirements: {
        camera: "Lens calibration chart",
        "led-wall": "Color meter, Pattern generator",
        tracking: "Reference markers",
      },
      message: "Calibration plan generated",
      messageAr: "تم توليد خطة المعايرة",
    },
  };
}

export function realTimeCompositeOperation(data: {
  productionId: string;
  sceneId: string;
  cameraId: string;
  outputFormat: "4k" | "8k" | "hd";
}): PluginOutput {
  const production = productions.get(data.productionId);
  if (!production) {
    return { success: false, error: "Production not found" };
  }

  const scene = production.scenes.find((s) => s.id === data.sceneId);
  const camera = production.cameras.find((c) => c.id === data.cameraId);

  if (!scene || !camera) {
    return { success: false, error: "Scene or camera not found" };
  }

  return {
    success: true,
    data: {
      compositing: {
        scene: scene.name,
        camera: camera.name,
        resolution: getOutputResolution(data.outputFormat),
        latency: camera.tracked
          ? `${camera.trackingSystem === "mocap" ? "8" : "15"}ms`
          : "N/A",
        colorSpace: production.ledWalls[0]?.colorSpace ?? "rec709",
      },
      streamUrl: `/vp/composite/${production.id}/live`,
      recordUrl: `/vp/composite/${production.id}/record`,
      monitorUrl: `/vp/composite/${production.id}/monitor`,
      message: "Real-time composite started",
      messageAr: "بدأ الدمج في الوقت الفعلي",
    },
  };
}

function getOutputResolution(outputFormat: "4k" | "8k" | "hd"): {
  width: number;
  height: number;
  bandwidth: string;
} {
  const resolutions = {
    hd: { width: 1920, height: 1080, bandwidth: "3Gbps" },
    "4k": { width: 3840, height: 2160, bandwidth: "12Gbps" },
    "8k": { width: 7680, height: 4320, bandwidth: "48Gbps" },
  };

  return resolutions[outputFormat];
}

export function exportPrevizOperation(data: {
  productionId: string;
  format: "mp4" | "prores" | "exr-sequence" | "usd";
  includeMetadata: boolean;
}): PluginOutput {
  const production = productions.get(data.productionId);
  if (!production) {
    return { success: false, error: "Production not found" };
  }

  return {
    success: true,
    data: {
      export: {
        productionId: production.id,
        format: data.format,
        formatDetails: getExportFormatInfo(data.format),
        includesMetadata: data.includeMetadata,
      },
      contents: {
        scenes: production.scenes.length,
        cameras: production.cameras.length,
        vfx: production.visualEffects.length,
        trackingData: production.trackingData.length,
      },
      exportUrl: `/vp/export/${production.id}/${data.format}`,
      message: "Pre-visualization exported",
      messageAr: "تم تصدير التصور المسبق",
    },
  };
}

function getExportFormatInfo(
  format: "mp4" | "prores" | "exr-sequence" | "usd"
): { codec: string; container: string; use: string } | undefined {
  const formatInfo = {
    mp4: { codec: "H.264", container: "MP4", use: "Review and sharing" },
    prores: { codec: "ProRes 4444", container: "MOV", use: "Editorial" },
    "exr-sequence": {
      codec: "OpenEXR",
      container: "Image sequence",
      use: "VFX and grading",
    },
    usd: {
      codec: "USD/USDZ",
      container: "Scene description",
      use: "Pipeline integration",
    },
  };

  return formatInfo[format];
}
