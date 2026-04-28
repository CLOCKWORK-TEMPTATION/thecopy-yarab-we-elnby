export interface ColorGrade {
  temperature: number;
  tint: number;
  exposure: number;
  contrast: number;
  highlights: number;
  shadows: number;
  saturation: number;
  vibrance: number;
  shadowHue: number;
  midtoneHue: number;
  highlightHue: number;
}

export interface LUTPreset {
  id: string;
  name: string;
  nameAr: string;
  film?: string;
  description: string;
  grade: Partial<ColorGrade>;
  primaryColor: string;
}

export interface ColorGradingPreviewProps {
  className?: string;
  onGradeChange?: (grade: ColorGrade) => void;
}
