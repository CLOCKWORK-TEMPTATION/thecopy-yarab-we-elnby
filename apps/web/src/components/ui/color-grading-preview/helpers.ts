import type { ColorGrade } from "./types";

export function seededAmplitude(index: number, seed: number, amplitude: number): number {
  const value = Math.sin((index + 1) * seed) * 10000;
  return (value - Math.floor(value)) * amplitude;
}

export function buildPreviewFilter(grade: ColorGrade, showOriginal: boolean): string {
  if (showOriginal) {
    return "none";
  }

  const filters = [
    `brightness(${1 + grade.exposure / 4})`,
    `contrast(${grade.contrast / 100})`,
    `saturate(${grade.saturation / 100})`,
    grade.temperature > 0
      ? `sepia(${grade.temperature / 200})`
      : `hue-rotate(${grade.temperature * 2}deg)`,
  ];
  return filters.join(" ");
}

export function buildPreviewOverlay(
  grade: ColorGrade,
  showOriginal: boolean
): Record<string, string> {
  if (showOriginal) {
    return {};
  }

  const shadowColor = `hsl(${grade.shadowHue}, 50%, 20%)`;
  const highlightColor = `hsl(${grade.highlightHue}, 40%, 80%)`;
  return {
    background: `linear-gradient(
        to bottom,
        ${highlightColor}${Math.floor((100 - grade.highlights) * 0.2)
          .toString(16)
          .padStart(2, "0")},
        transparent 30%,
        transparent 70%,
        ${shadowColor}${Math.floor((100 + grade.shadows) * 0.3)
          .toString(16)
          .padStart(2, "0")}
      )`,
    mixBlendMode: "soft-light",
  };
}
