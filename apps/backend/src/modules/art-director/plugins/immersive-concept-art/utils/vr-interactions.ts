// VR Interaction Utilities

import type { VRExperience } from "../types";

const interactionsByType: Record<string, string[]> = {
  walkthrough: [
    "teleportation",
    "free-movement",
    "look-around",
    "object-inspection",
  ],
  presentation: [
    "slide-control",
    "laser-pointer",
    "annotations",
    "voice-notes",
  ],
  interactive: ["grab-objects", "scale-models", "rotate-view", "paint-sculpt"],
  sculpting: ["brush-tools", "clay-manipulation", "mirror-mode", "undo-redo"],
};

export function getInteractionsForType(type: VRExperience["type"]): string[] {
  return interactionsByType[type] ?? [];
}

export function calculateExperienceDuration(
  type: VRExperience["type"],
): number {
  switch (type) {
    case "walkthrough":
      return 300;
    case "presentation":
      return 180;
    default:
      return 0;
  }
}

export const supportedVRDevices = [
  "Meta Quest",
  "Apple Vision Pro",
  "HTC Vive",
  "Desktop VR",
];
