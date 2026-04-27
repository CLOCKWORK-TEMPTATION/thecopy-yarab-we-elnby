/* eslint-disable */
// Virtual Production Engine Utilities
// دوال مساعدة لمحاكاة الإنتاج الافتراضي

import type { LensInfo, VPCamera, VisualEffect } from "./types";
import { VFX_DEFAULTS } from "./constants";

export function calculateFOV(focalLength: number, sensorSize: { width: number; height: number }): number {
  return 2 * Math.atan(sensorSize.width / (2 * focalLength)) * (180 / Math.PI);
}

export function calculateFrustum(
  focalLength: number,
  sensorWidth: number,
  sensorHeight: number,
  subjectDistance: number,
  ledWallDistance?: number
) {
  const fovH = 2 * Math.atan(sensorWidth / (2 * focalLength)) * (180 / Math.PI);
  const fovV = 2 * Math.atan(sensorHeight / (2 * focalLength)) * (180 / Math.PI);

  const coverageWidth = 2 * subjectDistance * Math.tan(((fovH / 2) * Math.PI) / 180);
  const coverageHeight = 2 * subjectDistance * Math.tan(((fovV / 2) * Math.PI) / 180);

  let ledWallCoverage = null;
  if (ledWallDistance) {
    ledWallCoverage = {
      width: 2 * ledWallDistance * Math.tan(((fovH / 2) * Math.PI) / 180),
      height: 2 * ledWallDistance * Math.tan(((fovV / 2) * Math.PI) / 180),
    };
  }

  return {
    fovH,
    fovV,
    coverageWidth,
    coverageHeight,
    ledWallCoverage,
  };
}

export function createCamera(
  name: string,
  type: VPCamera["type"],
  lens: Partial<LensInfo>,
  trackingSystem?: VPCamera["trackingSystem"]
): Omit<VPCamera, "id"> {
  const sensorSize = lens.sensorSize || { width: 36, height: 24 };
  const focalLength = lens.focalLength || 35;
  const fov = calculateFOV(focalLength, sensorSize);

  return {
    name,
    type,
    tracked: type !== "virtual" && !!trackingSystem,
    trackingSystem: trackingSystem || "inside-out",
    lens: {
      focalLength,
      aperture: lens.aperture || 2.8,
      sensorSize,
      calibrated: false,
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
}

export function createLEDWall(
  name: string,
  dimensions: { width: number; height: number },
  pixelPitch: number,
  curvature?: number,
  colorSpace?: "rec709" | "rec2020" | "dci-p3"
) {
  const resolutionWidth = Math.round((dimensions.width * 1000) / pixelPitch);
  const resolutionHeight = Math.round((dimensions.height * 1000) / pixelPitch);
  const panelCount = Math.ceil((dimensions.width * dimensions.height) / 0.25);

  return {
    name,
    dimensions,
    pixelPitch,
    resolution: { width: resolutionWidth, height: resolutionHeight },
    curvature: curvature || 0,
    panels: panelCount,
    brightness: 1500,
    colorSpace: colorSpace || "rec709",
  };
}

export function calculateOpticalIllusion(
  illusionType: VisualEffect["type"],
  parameters: {
    subjectSize?: { width: number; height: number };
    desiredApparentSize?: { width: number; height: number };
    cameraDistance?: number;
    focalLength?: number;
    miniatureScale?: number;
  }
): Record<string, unknown> {
  switch (illusionType) {
    case "forced-perspective":
      if (parameters.subjectSize && parameters.desiredApparentSize && parameters.cameraDistance) {
        const scaleRatio = parameters.desiredApparentSize.height / parameters.subjectSize.height;
        const subjectDistance = parameters.cameraDistance / scaleRatio;

        return {
          type: "forced-perspective",
          originalSize: parameters.subjectSize,
          apparentSize: parameters.desiredApparentSize,
          subjectPlacement: {
            distanceFromCamera: Math.round(subjectDistance * 100) / 100,
            scaleEffect: `${Math.round(scaleRatio * 100) / 100}x`,
          },
          requirements: {
            depthOfField: "Maximum (f/11-f/22)",
            focalLength: "Wide angle (24-35mm)",
            focusPoint: "Hyperfocal distance",
          },
          tips: [
            "Match lighting on both subjects",
            "Keep both subjects in focus plane",
            "Avoid revealing shadows",
          ],
        };
      }
      break;

    case "miniature":
      if (parameters.miniatureScale) {
        const scale = parameters.miniatureScale;
        const frameRateMultiplier = Math.sqrt(1 / scale);
        const recommendedFps = Math.round(24 * frameRateMultiplier);

        return {
          type: "miniature",
          scale: `1:${Math.round(1 / scale)}`,
          filming: {
            recommendedFrameRate: recommendedFps,
            playbackRate: 24,
            slowdownFactor: Math.round((recommendedFps / 24) * 10) / 10,
          },
          physics: {
            waterDropScale: Math.round(scale * 100) / 100,
            fireScale: Math.round(Math.pow(scale, 0.5) * 100) / 100,
            smokeScale: Math.round(Math.pow(scale, 0.75) * 100) / 100,
          },
          tips: [
            "Use high-speed camera for realistic physics",
            "Scale lighting to match miniature proportions",
            "Consider wind and atmosphere scaling",
          ],
        };
      }
      break;
  }

  return {};
}

export function getDefaultVFXParameters(type: VisualEffect["type"]): Record<string, unknown> {
  return VFX_DEFAULTS[type] || {};
}

export function getTrackingSpecs(trackingSystem: VPCamera["trackingSystem"]): {
  latency: number;
  accuracy: number;
} {
  switch (trackingSystem) {
    case "mocap":
      return { latency: 8, accuracy: 0.5 };
    case "lidar":
      return { latency: 15, accuracy: 1 };
    default:
      return { latency: 20, accuracy: 2 };
  }
}
