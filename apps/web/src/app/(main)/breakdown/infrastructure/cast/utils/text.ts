// Arabic Text Normalization Utilities

/**
 * Normalizes Arabic text for accurate matching and analysis.
 * Removes diacritics, tatweel, and normalizes similar letters.
 */
export const normalizeArabic = (text: string): string => {
  if (!text) return "";

  return (
    text
      // Remove tatweel (stretch character)
      .replace(/[\u0640]/g, "")
      // Remove diacritics (harakat)
      .replace(/[\u064B-\u065F\u0670]/g, "")
      // Normalize alef variations
      .replace(/[آأإٱ]/g, "ا")
      // Normalize teh marbuta to teh
      .replace(/ة/g, "ه")
      // Normalize alef maqsura to yeh
      .replace(/ى/g, "ي")
      // Normalize kashida
      .replace(/ـ/g, "")
      // Remove extra whitespace
      .trim()
      .toLowerCase()
  );
};

/**
 * Calculates edit distance between two strings for fuzzy matching.
 */
export const editDistance = (str1: string, str2: string): number => {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix = Array.from({ length: len1 + 1 }, () =>
    Array.from({ length: len2 + 1 }, () => 0)
  );

  for (let i = 0; i <= len1; i++) {
    matrix[i]![0] = i;
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0]![j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    const currentRow = matrix[i]!;
    const previousRow = matrix[i - 1]!;
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      currentRow[j] = Math.min(
        previousRow[j]! + 1, // deletion
        currentRow[j - 1]! + 1, // insertion
        previousRow[j - 1]! + cost // substitution
      );
    }
  }

  return matrix[len1]![len2]!;
};

/**
 * Checks if two character names might be the same person (fuzzy match).
 */
export const isSameCharacter = (
  name1: string,
  name2: string,
  threshold = 0.3
): boolean => {
  const normalized1 = normalizeArabic(name1);
  const normalized2 = normalizeArabic(name2);

  if (normalized1 === normalized2) return true;

  const maxLen = Math.max(normalized1.length, normalized2.length);
  if (maxLen === 0) return false;

  const distance = editDistance(normalized1, normalized2);
  const similarity = 1 - distance / maxLen;

  return similarity >= 1 - threshold;
};
