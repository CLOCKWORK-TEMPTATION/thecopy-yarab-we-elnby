/**
 * Cast Agent Constants
 * Centralized configuration for script analysis NLP
 */

// ============================================
// GROUP & GENERIC CHARACTER KEYWORDS
// ============================================

export const GROUP_KEYWORDS = [
  "CROWD",
  "POLICE",
  "GUARDS",
  "SOLDIERS",
  "PEOPLE",
  "MEN",
  "WOMEN",
  "KIDS",
  "OFFICERS",
  "GUESTS",
  "EMPLOYEES",
  "THUGS",
  "GANG",
  "TEAM",
  "STAFF",
  "VOICES",
  // Arabic
  "الشرطة",
  "شرطة",
  "حراس",
  "جنود",
  "عساكر",
  "ناس",
  "جمهور",
  "رجال",
  "نساء",
  "أطفال",
  "ضيوف",
  "موظفين",
  "عمال",
  "فريق",
  "عصابة",
  "أصوات",
  "المعازيم",
  "أمن",
  "الأمن",
  "المارة",
  "الجميع",
  "الكل",
];

export const GENERIC_KEYWORDS = [
  "MAN",
  "WOMAN",
  "STRANGER",
  "FIGURE",
  "UNKNOWN",
  "TBD",
  "SOMEONE",
  "VOICE",
  // Arabic
  "رجل",
  "امرأة",
  "شخص",
  "مجهول",
  "غريب",
  "شبح",
  "صوت",
  "أحدهم",
  "الرجل",
  "المرأة",
  "فتاة",
  "ولد",
];

// ============================================
// SCREENPLAY FORMATTING KEYWORDS
// ============================================

export const TRANSITIONS = [
  "CUT TO:",
  "FADE IN:",
  "FADE OUT",
  "DISSOLVE TO:",
  "SMASH CUT TO:",
  "MATCH CUT TO:",
  "TIME CUT:",
  "JUMP CUT TO:",
  "INTERCUT WITH:",
  "END",
  "THE END",
  // Arabic
  "قطع إلى",
  "ظلام",
  "تلاشي",
  "نهاية",
  "النهاية",
  "قطع",
  "انتقال",
];

export const TECHNICAL_EXTENSIONS = [
  "V.O",
  "O.S",
  "CONT'D",
  "FILTERED",
  "ON PHONE",
  "INTO PHONE",
  // Arabic
  "صوت",
  "تابع",
  "على الهاتف",
  "عبر الهاتف",
  "خارج الكادر",
  "مكمل",
  "من الهاتف",
];

export const ARABIC_TITLES = [
  "أبو",
  "ابو",
  "أم",
  "ام",
  "الشيخ",
  "الحاج",
  "حاج",
  "دكتور",
  "د.",
  "الست",
  "المعلم",
  "الاسطى",
  "كابتن",
  "اللواء",
  "العقيد",
  "المقدم",
  "يا",
  "السيد",
  "الأستاذ",
];

// ============================================
// EMOTION ANALYSIS KEYWORDS
// ============================================

export const EMOTION_KEYWORDS: Record<string, string[]> = {
  positive: [
    "سعيد",
    "فرح",
    "ضحك",
    "أحب",
    "حب",
    "أمل",
    "نجح",
    "فوز",
    "سلام",
    "جميل",
    "رائع",
    "ممتاز",
    "happy",
    "laugh",
    "love",
    "hope",
    "success",
    "beautiful",
    "wonderful",
    "excellent",
    "smile",
    "joy",
  ],
  negative: [
    "حزين",
    "بكي",
    "ألم",
    "خوف",
    "غضب",
    "كره",
    "مات",
    "موت",
    "فشل",
    "حزن",
    "بكا",
    "صرخ",
    "sad",
    "cry",
    "pain",
    "fear",
    "anger",
    "hate",
    "death",
    "fail",
    "sorrow",
    "scream",
    "cry",
  ],
  intense: [
    "صريخ",
    "صراخ",
    "هجوم",
    "ضرب",
    "قتل",
    "انفجار",
    "هرب",
    "طار",
    "ضغط",
    "عنيف",
    "scream",
    "shout",
    "attack",
    "hit",
    "kill",
    "explosion",
    "run",
    "violent",
    "urgent",
  ],
  mysterious: [
    "سر",
    "غامض",
    "مجهول",
    "ظل",
    "خفي",
    "مريب",
    "مشبوه",
    "لغز",
    "secret",
    "mystery",
    "unknown",
    "shadow",
    "hidden",
    "suspicious",
    "puzzle",
    "strange",
  ],
};

// ============================================
// GENDER DETECTION PATTERNS
// ============================================

export const MALE_PATTERNS = [
  /\b(هو|قال|نظر|مشى|جلس|وقف|صرخ|ضحك)\b/,
  /\b(HE|HIM|HIS|MAN|BOY)\b/i,
];

export const FEMALE_PATTERNS = [
  /\b(هي|قالت|نظرت|مشت|جلست|وقفت|صرخت|ضحكت)\b/,
  /\b(SHE|HER|HERS|WOMAN|GIRL)\b/i,
];

// ============================================
// VISUAL STYLING
// ============================================

export const CHARACTER_COLORS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#0ea5e9",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
];

export const ROLE_COLORS: Record<string, string> = {
  Lead: "#ef4444",
  Supporting: "#f59e0b",
  "Bit Part": "#22c55e",
  Silent: "#8b5cf6",
  Group: "#06b6d4",
  Mentioned: "#94a3b8",
  Mystery: "#a855f7",
};

// ============================================
// CONFIGURATION DEFAULTS
// ============================================

export const DEFAULT_CAST_MODEL = "gemini-3-pro-preview";
