import { OpticalIllusion } from "./types";

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
      specialEquipment: [
        "Green screen",
        "Motion control rig",
        "Reference markers",
      ],
    },
    cameraRequirements: [
      {
        parameter: "tracking-markers",
        value: "minimum 8 visible",
        critical: true,
      },
      {
        parameter: "exposure",
        value: "match painted elements",
        critical: true,
      },
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
      {
        parameter: "frame-rate",
        value: "96-120fps for 1:8 scale",
        critical: true,
      },
      {
        parameter: "depth-of-field",
        value: "scaled proportionally",
        critical: true,
      },
    ],
  },
];
