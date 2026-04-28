// Environment Preset Utilities

import type { Environment3D, EnvironmentLighting, AtmosphereSettings } from "../types";

export const environmentPresets: Record<string, Partial<Environment3D>> = {
  daylight: {
    lighting: {
      sunPosition: { azimuth: 180, elevation: 60 },
      sunColor: "#fff5e6",
      sunIntensity: 1.2,
      ambientColor: "#87ceeb",
      ambientIntensity: 0.4,
      shadowSoftness: 0.3,
    },
    atmosphere: { fog: false, haze: 0.1 },
  },
  sunset: {
    lighting: {
      sunPosition: { azimuth: 270, elevation: 10 },
      sunColor: "#ff6b35",
      sunIntensity: 0.8,
      ambientColor: "#ffa07a",
      ambientIntensity: 0.3,
      shadowSoftness: 0.5,
    },
    atmosphere: {
      fog: true,
      fogColor: "#ff8c69",
      fogDensity: 0.02,
      haze: 0.3,
    },
  },
  night: {
    lighting: {
      sunPosition: { azimuth: 0, elevation: -30 },
      sunColor: "#c0d6e4",
      sunIntensity: 0.1,
      ambientColor: "#1a1a2e",
      ambientIntensity: 0.15,
      shadowSoftness: 0.8,
    },
    atmosphere: { fog: false, haze: 0.05 },
  },
  overcast: {
    lighting: {
      sunPosition: { azimuth: 180, elevation: 45 },
      sunColor: "#d0d0d0",
      sunIntensity: 0.6,
      ambientColor: "#b8c5d0",
      ambientIntensity: 0.5,
      shadowSoftness: 0.9,
    },
    atmosphere: {
      fog: true,
      fogColor: "#c8c8c8",
      fogDensity: 0.01,
      haze: 0.2,
    },
  },
  studio: {
    lighting: {
      sunPosition: { azimuth: 45, elevation: 45 },
      sunColor: "#ffffff",
      sunIntensity: 1.0,
      ambientColor: "#ffffff",
      ambientIntensity: 0.6,
      shadowSoftness: 0.4,
    },
    atmosphere: { fog: false, haze: 0 },
  },
};

export function getEnvironmentPreset(
  presetName: string
): Partial<Environment3D> {
  return (
    environmentPresets[presetName] ??
    environmentPresets["daylight"] ?? {
      lighting: {
        sunPosition: { azimuth: 180, elevation: 60 },
        sunColor: "#fff5e6",
        sunIntensity: 1.2,
        ambientColor: "#87ceeb",
        ambientIntensity: 0.4,
        shadowSoftness: 0.3,
      },
      atmosphere: { fog: false, haze: 0.1 },
    }
  );
}
