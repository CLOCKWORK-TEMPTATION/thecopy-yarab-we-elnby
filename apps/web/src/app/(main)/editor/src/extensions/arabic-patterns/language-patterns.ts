export const DIALECT_PATTERNS = {
  egyptian:
    /(?:^|\s)(قال|عمل|راح|جه|قعد|مشي|عايز|عايزة|بيعمل|بتعمل|هيعمل|كده|دي|ده|ليه|فين|ازاي|يعني|بقى|خلاص)(?:\s|$)/,
  levantine:
    /(?:^|\s)(صار|صير|بدّو|بدي|هلق|هلأ|كتير|شوي|ليش|وين|كيف|هيك|هيدا|هيدي|بعدين)(?:\s|$)/,
  gulf: /(?:^|\s)(صاير|يبي|ودّه|حق|زين|شلون|وين|ليش|يالله|خلنا|ابي|تبي|يبغى)(?:\s|$)/,
};

export const detectDialect = (text: string): string | null => {
  for (const [dialect, pattern] of Object.entries(DIALECT_PATTERNS)) {
    if (pattern.test(text)) return dialect;
  }
  return null;
};

export const NEGATION_PATTERNS = /(?:^|\s)(لا|ليس|ما|لم|لن|مش|مو|ماهو|ماهي)\s+/;
export const ARABIC_NUMBER_RE = /[٠-٩]+/;
export const WESTERN_NUMBER_RE = /[0-9]+/;
export const MIXED_NUMBER_RE = /[0-9٠-٩]+/;

export const convertHindiToArabic = (text: string): string => {
  const hindiDigits = "٠١٢٣٤٥٦٧٨٩";
  return text.replace(/[٠-٩]/g, (digit) => String(hindiDigits.indexOf(digit)));
};

export const DATE_PATTERNS =
  /(?:يوم|اليوم|غداً|غدا|أمس|البارحة)\s*(?:ال)?(?:أحد|اثنين|ثلاثاء|أربعاء|خميس|جمعة|سبت)?/i;
export const TIME_PATTERNS =
  /(?:الساعة|صباحاً|مساءً|صباحا|مساء|ظهراً|ظهرا|فجراً|فجرا|عصراً|عصرا)\s*(?:[0-9٠-٩]{1,2})?/i;
export const ABBREVIATION_PATTERNS = /\b(م\.|هـ\.|ص\.|ق\.م|ب\.ظ|ص\.ب)\b/;
export const BASMALA_BASM_RE = /بسم/i;
export const BASMALA_ALLAH_RE = /الله/i;
export const BASMALA_RAHMAN_RE = /الرحمن/i;
export const BASMALA_RAHIM_RE = /الرحيم/i;
export const PARENTHETICAL_RE = /^[(（].*?[)）]$/;
export const ARABIC_ONLY_WITH_NUMBERS_RE =
  /^[\s\u0600-\u06FF\d٠-٩\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+$/;
