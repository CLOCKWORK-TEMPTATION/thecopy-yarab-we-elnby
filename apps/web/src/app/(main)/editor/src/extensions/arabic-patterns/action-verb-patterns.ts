export const IMPERATIVE_VERBS = [
  "ادخل",
  "اخرج",
  "انظر",
  "توقف",
  "اسمع",
  "تعال",
  "امش",
  "اكتب",
  "اقرأ",
  "اجلس",
  "قف",
  "اركض",
];

export const IMPERATIVE_VERB_SET = new Set(IMPERATIVE_VERBS);
export const IMPERATIVE_VERB_RE = new RegExp(
  `^\\s*(?:${IMPERATIVE_VERBS.join("|")})(?:\\s+\\S|$)`
);

const PATTERN_PRONOUN = /(?:(?:و|ف)?(?:هو|هي|هم|هن)\s+)/.source;
const PATTERN_MAZAL =
  /(?:(?:ما|لا|لم|لن)\s*(?:زال|يزال|تزال|برح|فتئ|انفك)(?:[توناي]{1,3})?\s+)/
    .source;
const PATTERN_VERB = /(?:[يتنأ]|ب[تيا])[\u0600-\u06FF]{2,}/.source;
const STRONG_ACTION_BODY = `(?:${PATTERN_PRONOUN}(?:${PATTERN_MAZAL})?|${PATTERN_MAZAL})${PATTERN_VERB}`;

export const PRONOUN_ACTION_RE = new RegExp(`^${STRONG_ACTION_BODY}`);

export const ACTION_START_PATTERNS: RegExp[] = [
  new RegExp(`^\\s*(?:ثم\\s+)?${STRONG_ACTION_BODY}(?:\\s+\\S|$)`),
  /^\s*(?:و|ف|ل)?(?:نرى|نسمع|نلاحظ|نقترب|نبتعد|ننتقل)(?:\s+\S|$)/,
  /^\s*(?:رأينا|سمعنا|لاحظنا|شاهدنا)(?:\s+\S|$)/,
  IMPERATIVE_VERB_RE,
  /^\s*لا\s+[يت][\u0600-\u06FF]{2,}(?:\s+\S|$)/,
];

export const NEGATION_PLUS_VERB_RE = /^لا\s+[ي][\u0600-\u06FF]{2,}/;
export const PRONOUN_PLUS_VERB_RE = PRONOUN_ACTION_RE;
export const VERB_WITH_PRONOUN_SUFFIX_RE =
  /[يت][\u0600-\u06FF]{2,}(?:ه|ها|هم|هن|ني|نا|ك|كم|كن)(?:\s|$)/;
export const ACTION_VERB_FOLLOWED_BY_NAME_AND_VERB_RE =
  /^[يتنأ][\u0600-\u06FF]{2,}\s+[\u0600-\u06FF]+\s+و\s+[يتنأ][\u0600-\u06FF]{2,}/;
export const THEN_ACTION_RE = /^ثم\s+[يتنأ][\u0600-\u06FF]{2,}/;
export const PRONOUN_PREFIX_RE = /^(?:و|ف)?(?:هو|هي|هم|هن)\s+/;
