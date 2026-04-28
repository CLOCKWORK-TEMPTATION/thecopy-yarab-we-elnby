import type { LensType } from "./types";

export function calculateFOV(focalLength: number, sensorWidth = 36): number {
  return 2 * Math.atan(sensorWidth / (2 * focalLength)) * (180 / Math.PI);
}

export function getLensType(focalLength: number): LensType {
  if (focalLength <= 20) {
    return {
      type: "Ultra Wide",
      typeAr: "عريضة جداً",
      description: "مثالية للمناظر الطبيعية والمساحات الضيقة",
    };
  }

  if (focalLength <= 35) {
    return {
      type: "Wide",
      typeAr: "عريضة",
      description: "ممتازة للمشاهد الواسعة والبيئات",
    };
  }

  if (focalLength <= 60) {
    return {
      type: "Standard",
      typeAr: "قياسية",
      description: "تحاكي رؤية العين البشرية",
    };
  }

  if (focalLength <= 100) {
    return {
      type: "Portrait",
      typeAr: "بورتريه",
      description: "مثالية للوجوه والتفاصيل",
    };
  }

  return {
    type: "Telephoto",
    typeAr: "تيليفوتو",
    description: "ضغط المسافات والعزل",
  };
}

export function getPresetDistortion(presetId: string): number {
  if (presetId.includes("vintage")) {
    return 5;
  }

  if (presetId.includes("anamorphic")) {
    return 8;
  }

  return 0;
}
