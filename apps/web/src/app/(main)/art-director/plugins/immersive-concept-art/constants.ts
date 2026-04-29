// Immersive Concept Art Studio Constants
// ثوابت استوديو الفن التصوري الغامر

import type { ConceptArtProject, ArtStyle } from "./types";

export const projects = new Map<string, ConceptArtProject>();

export const ART_STYLES: ArtStyle[] = [
  {
    id: "cinematic-realism",
    name: "Cinematic Realism",
    nameAr: "الواقعية السينمائية",
    description:
      "Photorealistic concept art with cinematic lighting and composition",
    visualCharacteristics: [
      "Photorealistic textures",
      "Dramatic lighting",
      "Film grain",
      "Shallow depth of field",
    ],
    recommendedTechniques: [
      "Photo bashing",
      "3D rendering",
      "Digital painting",
      "Matte painting",
    ],
    exampleReferences: ["Blade Runner 2049", "Dune", "Mad Max: Fury Road"],
  },
  {
    id: "stylized-animation",
    name: "Stylized Animation",
    nameAr: "الأسلوب المتحرك",
    description: "Bold colors and simplified forms inspired by animation",
    visualCharacteristics: [
      "Vibrant colors",
      "Clean shapes",
      "Exaggerated proportions",
      "Expressive lighting",
    ],
    recommendedTechniques: [
      "Cel shading",
      "Toon rendering",
      "Shape design",
      "Color scripting",
    ],
    exampleReferences: ["Spider-Verse", "Arcane", "Into the Spider-Verse"],
  },
  {
    id: "fantasy-epic",
    name: "Fantasy Epic",
    nameAr: "الفنتازيا الملحمية",
    description: "Grand, mythical aesthetics with magical elements",
    visualCharacteristics: [
      "Atmospheric perspective",
      "Magical effects",
      "Ancient architecture",
      "Mythical creatures",
    ],
    recommendedTechniques: [
      "Atmospheric painting",
      "Particle effects",
      "World building",
      "Scale contrast",
    ],
    exampleReferences: ["Lord of the Rings", "Game of Thrones", "The Witcher"],
  },
];

export const DEFAULT_PALETTE = [
  "#3498db",
  "#2ecc71",
  "#f1c40f",
  "#e74c3c",
  "#9b59b6",
];

export const PALETTES: Record<string, string[]> = {
  default: DEFAULT_PALETTE,
  warm: ["#ff6b6b", "#feca57", "#ff9f43", "#ee5253", "#f368e0"],
  cool: ["#54a0ff", "#5f27cd", "#48dbfb", "#0abde3", "#10ac84"],
  earthy: ["#8e6e53", "#c7a17a", "#e8d5b7", "#4a6741", "#2c3e50"],
  noir: ["#1a1a1a", "#2d2d2d", "#404040", "#8b0000", "#c0c0c0"],
  fantasy: ["#9b59b6", "#3498db", "#e74c3c", "#f39c12", "#1abc9c"],
};

export const THEME_RELATIONS: Record<string, string[]> = {
  warm: ["sunset", "desert", "autumn"],
  cool: ["winter", "ocean", "night"],
  earthy: ["forest", "rustic", "organic"],
  noir: ["detective", "urban", "mystery"],
  fantasy: ["magical", "mythical", "ethereal"],
};

export const VR_INTERACTIONS: Record<string, string[]> = {
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

export const SUPPORTED_VR_DEVICES = [
  "Meta Quest",
  "Apple Vision Pro",
  "HTC Vive",
  "Desktop VR",
];

export const DEFAULT_SCULPTING_TIPS = [
  "Use smooth strokes for organic shapes",
  "Switch to flatten for hard surfaces",
  "Mirror mode for symmetrical models",
];

export const MATERIAL_PRESETS = {
  gold: {
    type: "pbr" as const,
    baseColor: "#FFD700",
    roughness: 0.2,
    metalness: 1.0,
  },
  silver: {
    type: "pbr" as const,
    baseColor: "#C0C0C0",
    roughness: 0.2,
    metalness: 1.0,
  },
  glass: {
    type: "glass" as const,
    baseColor: "#FFFFFF",
    roughness: 0.0,
    metalness: 0.0,
    transparency: 0.9,
  },
  clay: {
    type: "pbr" as const,
    baseColor: "#B66A50",
    roughness: 0.9,
    metalness: 0.0,
  },
  plastic: {
    type: "pbr" as const,
    baseColor: "#FF6B6B",
    roughness: 0.3,
    metalness: 0.0,
  },
};
