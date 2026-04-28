// Gender Analysis Utilities

import { normalizeArabic } from "./text";

export interface GenderAnalysis {
  gender: "Male" | "Female" | "Non-binary" | "Unknown";
  confidence: number;
  conflict: boolean;
  clues: string[];
}

const arabicMaleIndicators = [
  "قال",
  "ذهب",
  "جاء",
  "نظر",
  "وقف",
  "جلس",
  "خرج",
  "دخل",
  "هو",
  "له",
  "ابنه",
  "أخوه",
  "والده",
  "رجل",
  "الرجل",
  "السيد",
  "الشيخ",
  "الطفل",
  "الشاب",
  "الرجل العجوز",
];

const arabicFemaleIndicators = [
  "قالت",
  "ذهبت",
  "جاءت",
  "نظرت",
  "وقفت",
  "جلست",
  "خرجت",
  "دخلت",
  "هي",
  "لها",
  "ابنتها",
  "أختها",
  "والدتها",
  "امرأة",
  "المرأة",
  "السيدة",
  "الفتاة",
  "الأم",
  "البنت",
  "الطفلة",
];

const englishMaleIndicators = [
  "he",
  "him",
  "his",
  "man",
  "men",
  "boy",
  "father",
  "brother",
  "son",
  "husband",
  "mr.",
  "mr ",
  "sir",
  "guy",
  "gentleman",
];

const englishFemaleIndicators = [
  "she",
  "her",
  "hers",
  "woman",
  "women",
  "girl",
  "mother",
  "sister",
  "daughter",
  "wife",
  "mrs.",
  "ms ",
  "miss",
  "lady",
  "madam",
];

const femaleNames = [
  "mary",
  "sarah",
  "fatima",
  "aisha",
  "maryam",
  "zahra",
  "layla",
  "noor",
  "hana",
  "sara",
  "امرأة",
  "فتاة",
  "بنت",
  "أم",
  "أخت",
];

const maleNames = [
  "john",
  "ahmed",
  "mohammed",
  "omar",
  "ali",
  "hussein",
  "khalid",
  "رجل",
  "ولد",
  "أب",
  "أخ",
];

/**
 * Analyzes gender from dialogue and action lines using linguistic markers.
 */
export const analyzeGender = (
  lines: string[],
  characterName: string
): GenderAnalysis => {
  let maleScore = 0;
  let femaleScore = 0;
  const maleClues: string[] = [];
  const femaleClues: string[] = [];

  const hasArabic = lines.some((l) => /[\u0600-\u06FF]/.test(l));

  lines.forEach((line) => {
    const normalizedLine = line.toLowerCase();

    if (hasArabic) {
      arabicMaleIndicators.forEach((indicator) => {
        if (normalizedLine.includes(indicator)) {
          maleScore++;
          if (!maleClues.includes(indicator)) maleClues.push(indicator);
        }
      });

      arabicFemaleIndicators.forEach((indicator) => {
        if (normalizedLine.includes(indicator)) {
          femaleScore++;
          if (!femaleClues.includes(indicator)) femaleClues.push(indicator);
        }
      });
    } else {
      englishMaleIndicators.forEach((indicator) => {
        if (normalizedLine.includes(indicator)) {
          maleScore++;
          if (!maleClues.includes(indicator)) maleClues.push(indicator);
        }
      });

      englishFemaleIndicators.forEach((indicator) => {
        if (normalizedLine.includes(indicator)) {
          femaleScore++;
          if (!femaleClues.includes(indicator)) femaleClues.push(indicator);
        }
      });
    }
  });

  const total = maleScore + femaleScore;
  const conflict =
    maleScore > 0 && femaleScore > 0 && Math.abs(maleScore - femaleScore) <= 1;

  let gender: GenderAnalysis["gender"] = "Unknown";
  let confidence = 0;

  if (total === 0) {
    const nameLower = characterName.toLowerCase();
    if (femaleNames.some((n) => nameLower.includes(n))) {
      gender = "Female";
      confidence = 0.6;
    } else if (maleNames.some((n) => nameLower.includes(n))) {
      gender = "Male";
      confidence = 0.6;
    }
  } else if (maleScore > femaleScore * 1.5) {
    gender = "Male";
    confidence = Math.min(0.95, maleScore / total + 0.3);
  } else if (femaleScore > maleScore * 1.5) {
    gender = "Female";
    confidence = Math.min(0.95, femaleScore / total + 0.3);
  } else if (conflict) {
    gender = maleScore > femaleScore ? "Male" : "Female";
    confidence = 0.4;
  } else {
    gender = maleScore > femaleScore ? "Male" : "Female";
    confidence = 0.5;
  }

  return {
    gender,
    confidence: Math.round(confidence * 100) / 100,
    conflict,
    clues: gender === "Male" ? maleClues : femaleClues,
  };
};
