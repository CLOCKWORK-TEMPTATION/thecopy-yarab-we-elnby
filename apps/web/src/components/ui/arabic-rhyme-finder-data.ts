export interface RhymeResult {
  word: string;
  meaning?: string;
  type: "perfect" | "near" | "slant";
  syllables: number;
  usage?: string;
}

export interface PoetryMeter {
  id: string;
  name: string;
  pattern: string;
}

export const ARABIC_RHYMES: Record<string, RhymeResult[]> = {
  ار: [
    {
      word: "نار",
      meaning: "fire",
      type: "perfect",
      syllables: 2,
      usage: "اشتعلت النار في الحطب",
    },
    {
      word: "دار",
      meaning: "home",
      type: "perfect",
      syllables: 2,
      usage: "عاد إلى داره سعيداً",
    },
    {
      word: "جار",
      meaning: "neighbor",
      type: "perfect",
      syllables: 2,
      usage: "الجار قبل الدار",
    },
    {
      word: "نهار",
      meaning: "daytime",
      type: "perfect",
      syllables: 3,
      usage: "في وضح النهار",
    },
    {
      word: "قرار",
      meaning: "decision",
      type: "perfect",
      syllables: 3,
      usage: "اتخذ قراراً حاسماً",
    },
    {
      word: "أسرار",
      meaning: "secrets",
      type: "perfect",
      syllables: 3,
      usage: "كشف الأسرار",
    },
    {
      word: "أنوار",
      meaning: "lights",
      type: "perfect",
      syllables: 3,
      usage: "أضاءت الأنوار",
    },
    {
      word: "أشجار",
      meaning: "trees",
      type: "perfect",
      syllables: 3,
      usage: "تحت ظل الأشجار",
    },
  ],
  يل: [
    {
      word: "ليل",
      meaning: "night",
      type: "perfect",
      syllables: 2,
      usage: "في جنح الليل",
    },
    {
      word: "جميل",
      meaning: "beautiful",
      type: "perfect",
      syllables: 3,
      usage: "منظر جميل",
    },
    {
      word: "طويل",
      meaning: "long",
      type: "perfect",
      syllables: 3,
      usage: "طريق طويل",
    },
    {
      word: "دليل",
      meaning: "guide",
      type: "perfect",
      syllables: 3,
      usage: "دليل واضح",
    },
    {
      word: "قليل",
      meaning: "few",
      type: "perfect",
      syllables: 3,
      usage: "عدد قليل",
    },
    {
      word: "سبيل",
      meaning: "path",
      type: "perfect",
      syllables: 3,
      usage: "في سبيل الله",
    },
    {
      word: "نخيل",
      meaning: "palm trees",
      type: "perfect",
      syllables: 3,
      usage: "غابة النخيل",
    },
  ],
  ين: [
    {
      word: "عين",
      meaning: "eye/spring",
      type: "perfect",
      syllables: 2,
      usage: "نبع العين",
    },
    {
      word: "حين",
      meaning: "when",
      type: "perfect",
      syllables: 2,
      usage: "حين الغروب",
    },
    {
      word: "يقين",
      meaning: "certainty",
      type: "perfect",
      syllables: 3,
      usage: "على يقين",
    },
    {
      word: "حنين",
      meaning: "longing",
      type: "perfect",
      syllables: 3,
      usage: "حنين الماضي",
    },
    {
      word: "سنين",
      meaning: "years",
      type: "perfect",
      syllables: 3,
      usage: "مرت السنين",
    },
    {
      word: "أمين",
      meaning: "trustworthy",
      type: "perfect",
      syllables: 3,
      usage: "رجل أمين",
    },
  ],
  ام: [
    {
      word: "سلام",
      meaning: "peace",
      type: "perfect",
      syllables: 3,
      usage: "السلام عليكم",
    },
    {
      word: "كلام",
      meaning: "speech",
      type: "perfect",
      syllables: 3,
      usage: "كلام جميل",
    },
    {
      word: "أيام",
      meaning: "days",
      type: "perfect",
      syllables: 3,
      usage: "مرت الأيام",
    },
    {
      word: "أحلام",
      meaning: "dreams",
      type: "perfect",
      syllables: 3,
      usage: "أحلام الطفولة",
    },
    {
      word: "نظام",
      meaning: "system",
      type: "perfect",
      syllables: 3,
      usage: "نظام دقيق",
    },
    {
      word: "إلهام",
      meaning: "inspiration",
      type: "perfect",
      syllables: 3,
      usage: "مصدر إلهام",
    },
  ],
  ون: [
    {
      word: "عيون",
      meaning: "eyes",
      type: "perfect",
      syllables: 3,
      usage: "عيون جميلة",
    },
    {
      word: "فنون",
      meaning: "arts",
      type: "perfect",
      syllables: 3,
      usage: "الفنون الجميلة",
    },
    {
      word: "شؤون",
      meaning: "affairs",
      type: "perfect",
      syllables: 3,
      usage: "شؤون الحياة",
    },
    {
      word: "قرون",
      meaning: "centuries",
      type: "perfect",
      syllables: 3,
      usage: "عبر القرون",
    },
    {
      word: "سكون",
      meaning: "stillness",
      type: "perfect",
      syllables: 3,
      usage: "سكون الليل",
    },
    {
      word: "جنون",
      meaning: "madness",
      type: "perfect",
      syllables: 3,
      usage: "حب جنون",
    },
  ],
  اب: [
    {
      word: "كتاب",
      meaning: "book",
      type: "perfect",
      syllables: 3,
      usage: "كتاب مفيد",
    },
    {
      word: "باب",
      meaning: "door",
      type: "perfect",
      syllables: 2,
      usage: "باب الأمل",
    },
    {
      word: "شباب",
      meaning: "youth",
      type: "perfect",
      syllables: 3,
      usage: "أيام الشباب",
    },
    {
      word: "جواب",
      meaning: "answer",
      type: "perfect",
      syllables: 3,
      usage: "في انتظار الجواب",
    },
    {
      word: "سحاب",
      meaning: "clouds",
      type: "perfect",
      syllables: 3,
      usage: "في السحاب",
    },
    {
      word: "أحباب",
      meaning: "loved ones",
      type: "perfect",
      syllables: 3,
      usage: "أحباب القلب",
    },
  ],
};

export const POETRY_METERS: PoetryMeter[] = [
  { id: "tawil", name: "الطويل", pattern: "فعولن مفاعيلن فعولن مفاعلن" },
  { id: "basit", name: "البسيط", pattern: "مستفعلن فاعلن مستفعلن فعلن" },
  { id: "kamil", name: "الكامل", pattern: "متفاعلن متفاعلن متفاعلن" },
  { id: "wafir", name: "الوافر", pattern: "مفاعلتن مفاعلتن فعولن" },
  { id: "rajaz", name: "الرجز", pattern: "مستفعلن مستفعلن مستفعلن" },
  { id: "ramal", name: "الرمل", pattern: "فاعلاتن فاعلاتن فاعلاتن" },
  { id: "khafif", name: "الخفيف", pattern: "فاعلاتن مستفعلن فاعلاتن" },
  { id: "mutaqarib", name: "المتقارب", pattern: "فعولن فعولن فعولن فعولن" },
];

export const getWordEnding = (word: string): string => {
  const cleaned = word.trim();
  if (cleaned.length < 2) return cleaned;
  return cleaned.slice(-2);
};

export const getRhymeTypeColor = (type: RhymeResult["type"]): string => {
  switch (type) {
    case "perfect":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    case "near":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "slant":
      return "bg-amber-500/20 text-amber-400 border-amber-500/30";
  }
};

export const getRhymeTypeLabel = (type: RhymeResult["type"]): string => {
  switch (type) {
    case "perfect":
      return "تامة";
    case "near":
      return "قريبة";
    case "slant":
      return "منحرفة";
  }
};
