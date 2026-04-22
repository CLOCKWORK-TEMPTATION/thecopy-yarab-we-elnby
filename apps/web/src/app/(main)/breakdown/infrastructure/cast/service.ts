import {
  CastMember,
  ExtendedCastMember,
  CastAnalysisOptions,
  CastAnalysisResult,
} from "../../domain/models";
import { runCastAgent } from "./local";

// ============================================
// ARABIC TEXT NORMALIZATION
// ============================================

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

// ============================================
// GENDER ANALYSIS
// ============================================

export interface GenderAnalysis {
  gender: "Male" | "Female" | "Non-binary" | "Unknown";
  confidence: number;
  conflict: boolean;
  clues: string[];
}

/**
 * Analyzes gender from dialogue and action lines using linguistic markers.
 */
export const analyzeGender = (
  lines: string[],
  characterName: string
): GenderAnalysis => {
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
    // Check character name itself
    const nameLower = characterName.toLowerCase();
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
      "رجل",
      "ولد",
      "أب",
      "أخ",
    ];

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

// ============================================
// CHARACTER ARC ANALYSIS
// ============================================

export type ArcType = "rising" | "falling" | "flat" | "arc" | "unknown";

export interface ArcAnalysis {
  type: ArcType;
  description: string;
  confidence: number;
}

/**
 * Analyzes a character's dramatic arc across scenes.
 */
export const analyzeCharacterArc = (character: {
  sceneAppearances: number[];
  dialogueCount: number;
  firstScene: number;
  lastScene: number;
  totalScenes: number;
  emotionalTrajectory?: number[];
}): ArcAnalysis => {
  const {
    sceneAppearances,
    dialogueCount,
    firstScene,
    lastScene,
    totalScenes,
    emotionalTrajectory = [],
  } = character;

  const presenceRatio = sceneAppearances.length / totalScenes;

  // Determine arc type
  let type: ArcType = "flat";
  let description = "";
  let confidence = 0.5;

  if (sceneAppearances.length <= 1) {
    type = "flat";
    description = "Single appearance - insufficient data for arc analysis";
    confidence = 0.9;
  } else if (presenceRatio > 0.8 && dialogueCount > totalScenes) {
    type = "arc";
    description =
      "Protagonist with consistent presence and dialogue throughout";
    confidence = 0.85;
  } else if (firstScene === 1 && lastScene < totalScenes * 0.5) {
    type = "falling";
    description =
      "Character appears early then fades - possible setup or mentor role";
    confidence = 0.7;
  } else if (firstScene > totalScenes * 0.5 && lastScene === totalScenes) {
    type = "rising";
    description =
      "Character enters late and grows in importance - possible reveal or antagonist";
    confidence = 0.7;
  } else if (emotionalTrajectory.length > 2) {
    const firstEmotion = emotionalTrajectory[0];
    const lastEmotion = emotionalTrajectory[emotionalTrajectory.length - 1];
    if (firstEmotion !== undefined && lastEmotion !== undefined) {
      const trend = lastEmotion - firstEmotion;
      if (trend > 0.5) {
        type = "rising";
        description = "Character shows positive emotional growth trajectory";
        confidence = 0.65;
      } else if (trend < -0.5) {
        type = "falling";
        description = "Character shows declining emotional trajectory";
        confidence = 0.65;
      }
    }
  }

  // Check for classic three-arc structure
  if (sceneAppearances.length >= 5 && presenceRatio > 0.4) {
    type = "arc";
    description = "Multi-scene presence suggests character arc development";
    confidence = 0.75;
  }

  return { type, description, confidence };
};

// ============================================
// EMOTION ANALYSIS
// ============================================

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

/**
 * Analyzes emotional content of dialogue lines.
 */
export const analyzeEmotion = (dialogueLines: string[]): EmotionAnalysis => {
  const positiveWords = [
    "سعيد",
    "فرح",
    "حب",
    "أمل",
    "نجح",
    "حقق",
    "خير",
    "جميل",
    "رائع",
    "happy",
    "love",
    "hope",
    "success",
    "wonderful",
    "great",
    "good",
  ];

  const negativeWords = [
    "حزين",
    "ألم",
    "خوف",
    "غضب",
    "فشل",
    "مات",
    "مات",
    "خطأ",
    "سيء",
    "sad",
    "pain",
    "fear",
    "anger",
    "fail",
    "death",
    "wrong",
    "bad",
  ];

  const intenseWords = [
    "صرخ",
    "بكى",
    "ضرب",
    "قتل",
    "هرب",
    "انهار",
    "انفجر",
    "صدم",
    "scream",
    "cry",
    "hit",
    "kill",
    "escape",
    "collapse",
    "explode",
    "shock",
  ];

  const mysteriousWords = [
    "لست أدري",
    "ربما",
    "غامض",
    "سر",
    "لا أدري",
    "حير",
    "عجيب",
    "wonder",
    "maybe",
    "mystery",
    "secret",
    "puzzle",
    "strange",
  ];

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

// ============================================
// SCENE METADATA EXTRACTION
// ============================================

export interface SceneMetadata {
  location?: string;
  timeOfDay?: "Day" | "Night" | "Dawn" | "Dusk" | "Unknown";
  interior: boolean;
  approximateDuration?: string;
}

/**
 * Extracts metadata from scene headers and content.
 */
export const extractSceneMetadata = (
  header: string,
  content: string
): SceneMetadata => {
  // Determine interior/exterior
  const interior = /int\.|مشهد داخلي|داخلي/i.test(header);

  // Determine time of day
  let timeOfDay: SceneMetadata["timeOfDay"] = "Unknown";
  if (/day|نهار|صباح/i.test(header)) timeOfDay = "Day";
  else if (/night|ليل|مساء/i.test(header)) timeOfDay = "Night";
  else if (/dawn|فجر|شروق/i.test(header)) timeOfDay = "Dawn";
  else if (/dusk|غروب|عصر/i.test(header)) timeOfDay = "Dusk";

  // Extract location
  let location = "Unknown";
  const locationPatterns = [
    /(?:int\.|ext\.)\s*([^.()-]+)/i,
    /مشهد\s*(?:داخلي|خارجي)\s*\.?\s*([^-]+)/i,
    /في\s+([^،.\n]+)/i,
    /at\s+([^،.\n]+)/i,
  ];

  for (const pattern of locationPatterns) {
    const match = header.match(pattern);
    if (match && match[1]) {
      location = match[1].trim();
      break;
    }
  }

  // Estimate duration based on dialogue
  const dialogueLines = content
    .split("\n")
    .filter((line) =>
      /^[A-Z\u0600-\u06FF][A-Z\u0600-\u06FF\s]{2,}$/i.test(line.trim())
    );
  const lineCount = dialogueLines.length;
  let approximateDuration: string | undefined;
  if (lineCount < 5) approximateDuration = "~30 seconds";
  else if (lineCount < 15) approximateDuration = "~1 minute";
  else if (lineCount < 30) approximateDuration = "~2 minutes";
  else approximateDuration = "~3+ minutes";

  return {
    location,
    timeOfDay,
    interior,
    approximateDuration,
  };
};

// ============================================
// MAIN AI CAST ANALYSIS
// ============================================

/**
 * Wrapper for the Cast Agent (Backward compatibility or Service layer abstraction)
 */
export const analyzeCast = async (
  sceneContent: string,
  options: CastAnalysisOptions = {}
): Promise<ExtendedCastMember[]> => {
  return runCastAgent(sceneContent, options);
};

/**
 * Enhanced Cast Analysis with full breakdown.
 * Returns comprehensive analysis including summary, insights, and warnings.
 */
export const analyzeCastEnhanced = async (
  sceneContent: string,
  options: CastAnalysisOptions = {}
): Promise<CastAnalysisResult> => {
  const members = await analyzeCast(sceneContent, options);

  // Calculate summary statistics
  const summary = {
    totalCharacters: members.length,
    leadCount: members.filter(
      (m: ExtendedCastMember) => m.roleCategory === "Lead"
    ).length,
    supportingCount: members.filter(
      (m: ExtendedCastMember) => m.roleCategory === "Supporting"
    ).length,
    maleCount: members.filter((m: ExtendedCastMember) => m.gender === "Male")
      .length,
    femaleCount: members.filter(
      (m: ExtendedCastMember) => m.gender === "Female"
    ).length,
    estimatedAgeRanges: calculateAgeRanges(members),
  };

  // Generate insights based on cast composition
  const insights = generateCastInsights(members, summary);

  // Generate warnings for potential issues
  const warnings = generateCastWarnings(members);

  return {
    members,
    summary,
    insights,
    warnings,
  };
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate age range distribution
 */
function calculateAgeRanges(
  members: ExtendedCastMember[]
): Record<string, number> {
  const ranges: Record<string, number> = {};

  members.forEach((member) => {
    const age = member.ageRange || "Unknown";
    ranges[age] = (ranges[age] || 0) + 1;
  });

  return ranges;
}

/**
 * Generate insights about the cast composition
 */
function generateCastInsights(
  _members: ExtendedCastMember[],
  summary: any
): string[] {
  const insights: string[] = [];

  if (summary.totalCharacters === 0) {
    insights.push("No characters detected in the scene.");
    return insights;
  }

  // Gender balance insight
  const genderRatio = summary.maleCount / (summary.femaleCount || 1);
  if (genderRatio > 2) {
    insights.push(
      `Male-dominated cast: ${summary.maleCount} male vs ${summary.femaleCount} female characters.`
    );
  } else if (genderRatio < 0.5) {
    insights.push(
      `Female-dominated cast: ${summary.femaleCount} female vs ${summary.maleCount} male characters.`
    );
  } else {
    insights.push("Balanced gender representation in the cast.");
  }

  // Lead characters insight
  if (summary.leadCount > 3) {
    insights.push(`Ensemble cast with ${summary.leadCount} lead characters.`);
  } else if (summary.leadCount === 1) {
    insights.push("Single protagonist-driven scene.");
  }

  // Age diversity insight
  const ageRanges = Object.keys(summary.estimatedAgeRanges);
  if (ageRanges.length > 3) {
    insights.push(
      `Diverse age range across ${ageRanges.length} different age groups.`
    );
  }

  // Supporting characters
  if (summary.supportingCount > summary.leadCount) {
    insights.push(
      "Supporting cast outnumber leads - potential rich ensemble dynamic."
    );
  }

  return insights;
}

/**
 * Generate warnings for potential casting issues
 */
function generateCastWarnings(members: ExtendedCastMember[]): string[] {
  const warnings: string[] = [];

  // Check for missing descriptions
  const vagueDescriptions = members.filter(
    (m) => !m.visualDescription || m.visualDescription.length < 20
  );
  if (vagueDescriptions.length > 0) {
    warnings.push(
      `${vagueDescriptions.length} character(s) lack detailed visual descriptions.`
    );
  }

  // Check for unknown genders
  const unknownGenders = members.filter((m) => m.gender === "Unknown");
  if (unknownGenders.length > 0) {
    warnings.push(
      `${unknownGenders.length} character(s) have unspecified gender.`
    );
  }

  // Check for generic names
  const genericNames = members.filter((m) =>
    /^(MAN|WOMAN|PERSON|STRANGER|FIGURE|UNKNOWN|رجل|امرأة|شخص)$/i.test(m.name)
  );
  if (genericNames.length > 0) {
    warnings.push(
      `${genericNames.length} generic character name(s) detected - consider naming for clarity.`
    );
  }

  // Check for mystery roles
  const mysteryRoles = members.filter((m) => m.roleCategory === "Mystery");
  if (mysteryRoles.length > 0) {
    warnings.push(
      `${mysteryRoles.length} character(s) marked as Mystery - verify their role in the story.`
    );
  }

  return warnings;
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

/**
 * Export cast members as CSV
 */
export const exportCastToCSV = (
  members: CastMember[] | ExtendedCastMember[]
): string => {
  const headers = [
    "Name",
    "Arabic Name",
    "Role",
    "Age",
    "Gender",
    "Description",
    "Motivation",
  ];
  const rows = members.map((m) => {
    const extended = m as ExtendedCastMember;
    return [
      m.name,
      extended.nameArabic || "",
      extended.roleCategory || m.role,
      extended.ageRange || m.age,
      m.gender,
      `"${(extended.visualDescription || m.description || "").replace(/"/g, '""')}"`,
      `"${(m.motivation || "").replace(/"/g, '""')}"`,
    ];
  });

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
};

/**
 * Export cast members as JSON
 */
export const exportCastToJSON = (result: CastAnalysisResult): string => {
  return JSON.stringify(result, null, 2);
};

/**
 * Generate a casting call document
 */
export const generateCastingCall = (
  members: CastMember[] | ExtendedCastMember[]
): string => {
  let doc = "CASTING CALL DOCUMENT\n";
  doc += "=".repeat(50) + "\n\n";

  const leads = members.filter(
    (m) =>
      (m as ExtendedCastMember).roleCategory === "Lead" || m.role === "Lead"
  );
  const supporting = members.filter(
    (m) =>
      (m as ExtendedCastMember).roleCategory === "Supporting" ||
      m.role === "Supporting"
  );

  if (leads.length > 0) {
    doc += "LEAD ROLES\n";
    doc += "-".repeat(30) + "\n";
    leads.forEach((m) => {
      const extended = m as ExtendedCastMember;
      doc += `\n${m.name.toUpperCase()} (${m.gender}, ${extended.ageRange || m.age})\n`;
      doc += `Description: ${extended.visualDescription || m.description || "N/A"}\n`;
      doc += `In this scene: ${m.motivation || "N/A"}\n`;
    });
  }

  if (supporting.length > 0) {
    doc += "\n\nSUPPORTING ROLES\n";
    doc += "-".repeat(30) + "\n";
    supporting.forEach((m) => {
      const extended = m as ExtendedCastMember;
      doc += `\n${m.name} (${m.gender}, ${extended.ageRange || m.age})\n`;
      doc += `${extended.visualDescription || m.description || "N/A"}\n`;
    });
  }

  return doc;
};

/**
 * Validate and normalize cast member data
 */
export const normalizeCastMember = (member: any): CastMember => {
  const gender = validateGender(member.gender || member.gender);
  const role = validateRole(member.roleCategory || member.role);

  return {
    name: member.name || "Unknown",
    role,
    age: member.ageRange || member.age || "Unknown",
    gender,
    description: member.visualDescription || member.description || "",
    motivation: member.motivation || "",
  };
};

function validateRole(role: string): string {
  const valid = [
    "Lead",
    "Supporting",
    "Bit Part",
    "Silent",
    "Group",
    "Mystery",
  ];
  if (valid.includes(role)) return role;
  return "Bit Part";
}

function validateGender(gender: string): string {
  const valid = ["Male", "Female", "Non-binary", "Unknown"];
  if (valid.includes(gender)) return gender;

  const lower = gender.toLowerCase();
  if (lower.includes("male") || lower.includes("ذكر")) return "Male";
  if (lower.includes("female") || lower.includes("أنثى")) return "Female";
  if (lower.includes("non-binary") || lower.includes("غير محدد"))
    return "Non-binary";

  return "Unknown";
}
