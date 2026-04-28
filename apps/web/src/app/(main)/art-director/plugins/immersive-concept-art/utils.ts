 
// Immersive Concept Art Studio Utilities
// أدوات استوديو الفن التصوري الغامر

import { PALETTES, THEME_RELATIONS, VR_INTERACTIONS } from "./constants";

export function getPaletteForTheme(theme: string): string[] {
  return PALETTES[theme.toLowerCase()] ?? PALETTES.default;
}

export function suggestComplementaryColors(palette: string[]): string[] {
  return palette.slice(0, 2).map((color) => {
    const hex = color.replace("#", "");
    const r = 255 - parseInt(hex.substr(0, 2), 16);
    const g = 255 - parseInt(hex.substr(2, 2), 16);
    const b = 255 - parseInt(hex.substr(4, 2), 16);
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  });
}

export function suggestRelatedThemes(theme: string): string[] {
  const defaultThemes = ["contemporary", "minimal", "dramatic"];
  return THEME_RELATIONS[theme.toLowerCase()] ?? defaultThemes;
}

export function generateStyleGuide(
  theme: string,
  palette: string[]
): Record<string, unknown> {
  const [
    primaryColor = "#ff6b6b",
    secondaryColor = "#feca57",
    accentColor = "#ff9f43",
  ] = palette;

  return {
    primaryColor,
    secondaryColor,
    accentColor,
    typography: {
      headings: "bold, dramatic",
      body: "clean, readable",
    },
    textures: ["subtle grain", "soft gradients"],
    mood: theme,
  };
}

export function getInteractionsForType(type: string): string[] {
  return VR_INTERACTIONS[type] ?? [];
}

export function getVRExperienceDuration(type: string): number {
  switch (type) {
    case "walkthrough":
      return 300;
    case "presentation":
      return 180;
    default:
      return 0;
  }
}

export function calculateVertexChange(
  brushSize: number,
  intensity: number
): number {
  return Math.round(brushSize * intensity * 10);
}

export function definedProps<T extends Record<string, unknown>>(
  obj: T
): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}
