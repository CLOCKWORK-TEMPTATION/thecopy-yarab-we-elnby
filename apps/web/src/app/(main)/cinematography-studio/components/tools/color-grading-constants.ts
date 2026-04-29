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

export const LUT_PRESETS: LUTPreset[] = [
  {
    id: "neutral",
    name: "Neutral",
    nameAr: "محايد",
    description: "بدون تأثيرات - الصورة الأصلية",
    grade: {},
    primaryColor: "rgb(128, 128, 128)",
  },
  {
    id: "teal-orange",
    name: "Teal & Orange",
    nameAr: "تيل وبرتقالي",
    film: "Mad Max: Fury Road",
    description: "التباين الكلاسيكي بين البشرة والخلفية",
    grade: {
      temperature: 15,
      shadowHue: 180,
      highlightHue: 30,
      contrast: 115,
      saturation: 120,
    },
    primaryColor: "rgb(0, 128, 128)",
  },
  {
    id: "noir",
    name: "Film Noir",
    nameAr: "نوار",
    film: "Sin City",
    description: "تباين عالي مع ظلال عميقة",
    grade: {
      contrast: 150,
      saturation: 30,
      shadows: -30,
      highlights: 20,
      temperature: -10,
    },
    primaryColor: "rgb(20, 20, 30)",
  },
  {
    id: "blockbuster",
    name: "Blockbuster",
    nameAr: "هوليوود",
    film: "Transformers",
    description: "ألوان زاهية ومشبعة",
    grade: {
      contrast: 120,
      saturation: 140,
      vibrance: 130,
      highlights: 15,
      temperature: 5,
    },
    primaryColor: "rgb(255, 180, 50)",
  },
  {
    id: "vintage",
    name: "Vintage Film",
    nameAr: "كلاسيكي",
    film: "O Brother, Where Art Thou?",
    description: "مظهر الأفلام القديمة الدافئ",
    grade: {
      temperature: 25,
      tint: 5,
      saturation: 80,
      contrast: 90,
      shadows: 10,
      highlightHue: 45,
    },
    primaryColor: "rgb(200, 170, 120)",
  },
  {
    id: "matrix",
    name: "Matrix Green",
    nameAr: "ماتريكس",
    film: "The Matrix",
    description: "الطابع الأخضر المميز",
    grade: {
      tint: -30,
      midtoneHue: 120,
      saturation: 70,
      contrast: 110,
      temperature: -15,
    },
    primaryColor: "rgb(0, 180, 80)",
  },
  {
    id: "blade-runner",
    name: "Neon Noir",
    nameAr: "نيون نوار",
    film: "Blade Runner 2049",
    description: "ظلام مع لمسات نيون",
    grade: {
      contrast: 130,
      shadows: -20,
      saturation: 90,
      highlightHue: 300,
      temperature: -5,
    },
    primaryColor: "rgb(255, 100, 200)",
  },
  {
    id: "moonlight",
    name: "Moonlight Blue",
    nameAr: "ضوء القمر",
    film: "Moonlight",
    description: "درجات زرقاء حالمة",
    grade: {
      temperature: -25,
      shadowHue: 220,
      midtoneHue: 200,
      saturation: 85,
      contrast: 95,
    },
    primaryColor: "rgb(80, 120, 200)",
  },
];

export const DEFAULT_GRADE: ColorGrade = {
  temperature: 0,
  tint: 0,
  exposure: 0,
  contrast: 100,
  highlights: 0,
  shadows: 0,
  saturation: 100,
  vibrance: 100,
  shadowHue: 0,
  midtoneHue: 0,
  highlightHue: 0,
};
