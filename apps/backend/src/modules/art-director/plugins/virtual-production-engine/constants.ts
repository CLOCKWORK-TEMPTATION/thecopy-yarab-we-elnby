/* eslint-disable */
// Virtual Production Engine Constants
// ثوابت وقواعد بيانات محرك الإنتاج الافتراضي

import type { OpticalIllusion, VirtualProduction, VisualEffect } from "./types";

export const productions = new Map<string, VirtualProduction>();

export const illusionLibrary: OpticalIllusion[] = [
  {
    id: "fp-001",
    name: "Forced Perspective - Giant",
    type: "forced-perspective",
    description: "Make subject appear larger by positioning closer to camera",
    setup: {
      scaleRatio: 2.5,
      distanceFromCamera: 1.5,
      lightingMatch: true,
      focusPlane: 2.5,
      specialEquipment: ["Wide-angle lens", "Deep focus setup"],
    },
    cameraRequirements: [
      { parameter: "aperture", value: "f/11-f/16", critical: true },
      { parameter: "focal-length", value: "24-35mm", critical: true },
      { parameter: "focus", value: "hyperfocal", critical: false },
    ],
  },
  {
    id: "mp-001",
    name: "Digital Matte Painting Integration",
    type: "matte-painting",
    description: "Seamlessly blend live action with digital backgrounds",
    setup: {
      lightingMatch: true,
      specialEquipment: ["Green screen", "Motion control rig", "Reference markers"],
    },
    cameraRequirements: [
      { parameter: "tracking-markers", value: "minimum 8 visible", critical: true },
      { parameter: "exposure", value: "match painted elements", critical: true },
    ],
  },
  {
    id: "min-001",
    name: "Miniature Set Extension",
    type: "miniature",
    description: "Use scaled models to extend practical sets",
    setup: {
      scaleRatio: 0.125,
      distanceFromCamera: 0.5,
      lightingMatch: true,
      specialEquipment: ["High-speed camera", "Micro-lighting", "Scale models"],
    },
    cameraRequirements: [
      { parameter: "frame-rate", value: "96-120fps for 1:8 scale", critical: true },
      { parameter: "depth-of-field", value: "scaled proportionally", critical: true },
    ],
  },
];

export const ILLUSION_CATEGORIES = [
  "forced-perspective",
  "matte-painting",
  "miniature",
  "projection",
  "practical-effect",
] as const;

export const CALIBRATION_STEPS: Record<string, string[]> = {
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

export const VFX_DEFAULTS: Record<VisualEffect["type"], Record<string, unknown>> = {
  particle: { count: 10000, lifetime: 5, size: 0.1, gravity: -9.8 },
  fluid: { resolution: 256, viscosity: 0.1, density: 1.0 },
  destruction: { pieces: 500, force: 100, debris: true },
  weather: { type: "rain", intensity: 0.5, wind: { x: 1, y: 0, z: 0 } },
  creature: { rig: "biped", muscles: true, skin: "subsurface" },
  environment: { type: "foliage", density: 100, wind: 0.3 },
};

export const OUTPUT_FORMATS = {
  hd: { width: 1920, height: 1080, bandwidth: "3Gbps" },
  "4k": { width: 3840, height: 2160, bandwidth: "12Gbps" },
  "8k": { width: 7680, height: 4320, bandwidth: "48Gbps" },
} as const;

export const EXPORT_FORMATS = {
  mp4: { codec: "H.264", container: "MP4", use: "Review and sharing" },
  prores: { codec: "ProRes 4444", container: "MOV", use: "Editorial" },
  "exr-sequence": { codec: "OpenEXR", container: "Image sequence", use: "VFX and grading" },
  usd: { codec: "USD/USDZ", container: "Scene description", use: "Pipeline integration" },
} as const;
