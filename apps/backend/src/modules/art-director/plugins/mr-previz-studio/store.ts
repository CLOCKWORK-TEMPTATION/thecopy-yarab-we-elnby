import type { XRDevice, XRScene } from "./types";

export const scenes: Map<string, XRScene> = new Map();

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
