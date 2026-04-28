// Color Palette Utilities

export const colorPalettes: Record<string, string[]> = {
  warm: ["#ff6b6b", "#feca57", "#ff9f43", "#ee5253", "#f368e0"],
  cool: ["#54a0ff", "#5f27cd", "#48dbfb", "#0abde3", "#10ac84"],
  earthy: ["#8e6e53", "#c7a17a", "#e8d5b7", "#4a6741", "#2c3e50"],
  noir: ["#1a1a1a", "#2d2d2d", "#404040", "#8b0000", "#c0c0c0"],
  fantasy: ["#9b59b6", "#3498db", "#e74c3c", "#f39c12", "#1abc9c"],
};

export const themeRelations: Record<string, string[]> = {
  warm: ["sunset", "desert", "autumn"],
  cool: ["winter", "ocean", "night"],
  earthy: ["forest", "rustic", "organic"],
  noir: ["detective", "urban", "mystery"],
  fantasy: ["magical", "mythical", "ethereal"],
};

export function generateColorPalette(theme: string): string[] {
  return colorPalettes[theme.toLowerCase()] ?? colorPalettes["warm"] ?? [];
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
  return (
    themeRelations[theme.toLowerCase()] || [
      "contemporary",
      "minimal",
      "dramatic",
    ]
  );
}

export function generateStyleGuide(
  theme: string,
  palette: string[],
): Record<string, unknown> {
  return {
    primaryColor: palette[0],
    secondaryColor: palette[1],
    accentColor: palette[2],
    typography: {
      headings: "bold, dramatic",
      body: "clean, readable",
    },
    textures: ["subtle grain", "soft gradients"],
    mood: theme,
  };
}
