// Emotion Analysis Utilities

import { normalizeArabic } from "./text";

export type EmotionType =
  | "positive"
  | "negative"
  | "intense"
  | "mysterious"
  | "neutral";

export interface EmotionAnalysis {
  emotion: EmotionType;
  intensity: number;
  keywords: string[];
}

const positiveWords = [
  "سعيد", "فرح", "حب", "أمل", "نجح", "حقق", "خير", "جميل", "رائع",
  "happy", "love", "hope", "success", "wonderful", "great", "good",
];

const negativeWords = [
  "حزين", "ألم", "خوف", "غضب", "فشل", "مات", "خطأ", "سيء",
  "sad", "pain", "fear", "anger", "fail", "death", "wrong", "bad",
];

const intenseWords = [
  "صرخ", "بكى", "ضرب", "قتل", "هرب", "انهار", "انفجر", "صدم",
  "scream", "cry", "hit", "kill", "escape", "collapse", "explode", "shock",
];

const mysteriousWords = [
  "لست أدري", "ربما", "غامض", "سر", "لا أدري", "حير", "عجيب",
  "wonder", "maybe", "mystery", "secret", "puzzle", "strange",
];

/**
 * Analyzes emotional content of dialogue lines.
 */
export const analyzeEmotion = (dialogueLines: string[]): EmotionAnalysis => {
  let positiveScore = 0;
  let negativeScore = 0;
  let intenseScore = 0;
  let mysteriousScore = 0;

  const keywords: string[] = [];

  dialogueLines.forEach((line) => {
    const normalized = normalizeArabic(line);

    positiveWords.forEach((word) => {
      if (normalized.includes(normalizeArabic(word))) {
        positiveScore++;
        if (!keywords.includes(word)) keywords.push(word);
      }
    });

    negativeWords.forEach((word) => {
      if (normalized.includes(normalizeArabic(word))) {
        negativeScore++;
        if (!keywords.includes(word)) keywords.push(word);
      }
    });

    intenseWords.forEach((word) => {
      if (normalized.includes(normalizeArabic(word))) {
        intenseScore += 2; // Higher weight
        if (!keywords.includes(word)) keywords.push(word);
      }
    });

    mysteriousWords.forEach((word) => {
      if (normalized.includes(normalizeArabic(word))) {
        mysteriousScore++;
        if (!keywords.includes(word)) keywords.push(word);
      }
    });
  });

  const scores = {
    positive: positiveScore,
    negative: negativeScore,
    intense: intenseScore,
    mysterious: mysteriousScore,
    neutral: 0,
  };

  const maxScore = Math.max(...Object.values(scores));

  let emotion: EmotionType = "neutral";
  if (maxScore === 0) {
    emotion = "neutral";
  } else if (scores.intense === maxScore) {
    emotion = "intense";
  } else if (scores.positive === maxScore) {
    emotion = "positive";
  } else if (scores.negative === maxScore) {
    emotion = "negative";
  } else if (scores.mysterious === maxScore) {
    emotion = "mysterious";
  }

  const intensity = Math.min(1, (maxScore / (dialogueLines.length || 1)) * 2);

  return {
    emotion,
    intensity: Math.round(intensity * 100) / 100,
    keywords: [...new Set(keywords)],
  };
};
