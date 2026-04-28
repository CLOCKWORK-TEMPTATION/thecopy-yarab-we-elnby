// CineArchitect AI - Mixed Reality Pre-visualization Studio Constants
// الثوابت لاستوديو التصور المسبق بالواقع المختلط

import type { XRDevice } from "./types";

export const supportedDevices: XRDevice[] = [
  {
    type: "vr-headset",
    name: "Meta Quest Pro",
    capabilities: [
      "6dof-tracking",
      "hand-tracking",
      "passthrough",
      "eye-tracking",
    ],
    resolution: { width: 1800, height: 1920 },
    trackingType: "inside-out",
  },
  {
    type: "mr-headset",
    name: "Apple Vision Pro",
    capabilities: [
      "mixed-reality",
      "hand-tracking",
      "eye-tracking",
      "spatial-audio",
    ],
    resolution: { width: 3660, height: 3200 },
    trackingType: "inside-out",
  },
  {
    type: "ar-glasses",
    name: "HoloLens 2",
    capabilities: ["hand-tracking", "spatial-mapping", "voice-control"],
    resolution: { width: 2048, height: 1080 },
    trackingType: "inside-out",
  },
  {
    type: "mobile-ar",
    name: "ARKit/ARCore Device",
    capabilities: ["plane-detection", "light-estimation", "face-tracking"],
    resolution: { width: 1920, height: 1080 },
    trackingType: "6dof",
  },
];

export const DEFAULT_CAMERA_POSITION = { x: 0, y: 1.7, z: 5 };
export const DEFAULT_CAMERA_TARGET = { x: 0, y: 1, z: 0 };
export const DEFAULT_CAMERA_FOV = 50;
export const DEFAULT_CAMERA_LENS_LENGTH = 35;
export const DEFAULT_CAMERA_ASPECT_RATIO = "16:9";

export const DEFAULT_AMBIENT_COLOR = "#ffffff";
export const DEFAULT_AMBIENT_INTENSITY = 0.3;
export const DEFAULT_DIRECTIONAL_COLOR = "#fff5e6";
export const DEFAULT_DIRECTIONAL_INTENSITY = 1.0;
export const DEFAULT_DIRECTIONAL_POSITION = { x: 10, y: 10, z: 5 };

export const DEFAULT_VR_WAYPOINTS = [
  { x: 0, y: 1.7, z: 5 },
  { x: 3, y: 1.7, z: 3 },
  { x: 0, y: 1.7, z: 0 },
  { x: -3, y: 1.7, z: 3 },
];

export const EXPORT_FORMATS = {
  gltf: {
    extension: ".gltf",
    description: "GL Transmission Format - WebXR compatible",
  },
  usdz: {
    extension: ".usdz",
    description: "Universal Scene Description - iOS AR",
  },
  fbx: { extension: ".fbx", description: "Autodesk FBX - Game engines" },
  obj: { extension: ".obj", description: "Wavefront OBJ - Universal 3D" },
} as const;
