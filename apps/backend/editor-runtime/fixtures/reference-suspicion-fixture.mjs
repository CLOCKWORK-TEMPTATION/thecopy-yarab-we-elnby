/**
 * @description تركيبة مرجعية حتمية لاختبار محرك الشك والمراجعة النهائية
 *
 * هذا الملف يحتوي على نص سيناريو عربي مصمم بشكل متعمد لتفعيل:
 * - على الأقل حالتا شك (تقسيم أسماء الشخصيات، OCR-like artifacts)
 * - تصعيد إلى نموذج الشك
 * - على الأقل مرشح مراجعة نهائية واحد
 * - استدعاء المراجعة النهائية
 *
 * الحوادث المتعمدة في التركيبة:
 * 1. "المحقـق" (بتطويل) مقابل "المحقق" - يُفعّل كاشف تقسيم الأحرف
 * 2. "سـلمى" (بتطويل) مقابل "سلمى" - يُفعّل كاشف تقسيم الأحرف
 * 3. "داخلي/خارجي" - رأس مشهد مركب قد يفعّل عدم وضوح
 * 4. "(VO)" مقترن مع مقترح - قد يتم سوء تصنيفه
 */

export const REFERENCE_SUSPICION_FIXTURE = `داخلي. مكتب المحقق - ليل

المحقق يجلس خلف مكتبه ويراجع الملفات. أوراق متناثرة على السطح. مصباح طاولة يضيء وجهه.

المحقق
(بتوتر)
هذه القضية أكبر مما توقعنا.

سلمى تدخل من الباب، تحمل ملف أحمر سميك.

سلمى
لكن الأدلة واضحة، أليس كذلك؟

المحقـق
(يرفع رأسه)
لا. الأدلة ناقصة. تماما ناقصة.

سـلمى
(بحزم)
يجب أن نتحرك الآن قبل فوات الأوان.

المحقق
الوقت ليس مناسبا. الشهود لم يُستدعوا بعد.

سلمى
لكن الدليل المادي موجود.

المحقق
(يقوم من مقعده)
الدليل المادي وحده لا يكفي. نحتاج إلى شهود.

داخلي/خارجي. سيارة الشرطة - فجر

المحقق يقود بسرعة والمدينة تمر من النافذة. الشارع خاليٌ تماماً. إشارات مرور حمراء تومض في الظلام.

المحقق (VO)
كل شيء يعتمد على الساعات القادمة. لا توجد ثانية واحدة تُضاع.

سلمى تجلس بجانبه، تحدق من النافذة.

سلمى
هل تعتقد أنهم يعرفون أننا قادمون؟

المحقق (VO)
احتمالية ذلك عالية جداً. التسريب الإعلامي جعل الأمر ممكناً.

داخلي. مركز الشرطة - مكتب التحقيقات

يدخلون بسرعة. الفريق ينتظر بالفعل. خرائط على الجدران. صور الضحايا معلقة.

المحقق
(يشير إلى الخريطة)
هنا. نقطة الالتقاء.

الفريق ينقسم إلى مجموعات. كل واحد يأخذ مهمة.

سلمى
(إلى أحد الضباط)
تأكد من أن الجميع في مواقعهم.

الضابط
نعم، سيدتي.

خارجي. الشارع - ليل

ستة ضباط ينتشرون. كل منهم يحمل راديو. الشارع هادئ جداً. يتوترون.

ضابط 1
(عبر الراديو)
الموقع الأول جاهز.

ضابط 2
(عبر الراديو)
الموقع الثاني آمن.

المحقق (VO)
التوقيت حرج. دقيقة واحدة متأخرة، والفرصة تذهب للأبد.

خارجي. زقاق مظلم - ليل

سيارة سوداء تقترب ببطء. المحقق وسلمى يختبآن خلف حاويات.

سلمى
(همساً)
هل أنت مستعد؟

المحقق
(همساً)
دائماً.

السيارة توقفت. رجل ينزل، يحمل حقيبة.

المحقق (VO)
والآن يأتي اللحظة الحرجة. كل شيء متوقف على الثوانِ القادمة.

نهاية المشهد.
`;

/**
 * @description البيانات الوصفية للتركيبة
 */
export const FIXTURE_METADATA = {
  id: "reference-suspicion-fixture-v1",
  version: "1.0.0",
  language: "ar",
  format: "screenplay",
  createdAt: "2026-04-13T00:00:00Z",

  // الحالات المتعمدة المُفعَّلة
  intendedSuspicionCases: [
    {
      type: "split-character-name",
      description: "تقسيم اسم الشخصية: المحقق مقابل المحقـق",
      lineNumbers: [3, 13],
      expectedDetectionMethod: "character-name-tatweel-detector",
      suspicionScore: 75,
    },
    {
      type: "split-character-name",
      description: "تقسيم اسم الشخصية: سلمى مقابل سـلمى",
      lineNumbers: [7, 16],
      expectedDetectionMethod: "character-name-tatweel-detector",
      suspicionScore: 72,
    },
    {
      type: "ambiguous-classification",
      description: "رأس مشهد مركب: داخلي/خارجي - قد يُسبب عدم وضوح",
      lineNumbers: [21],
      expectedDetectionMethod: "compound-scene-header-detector",
      suspicionScore: 45,
    },
  ],

  // المرشحين المتوقعين للمراجعة النهائية
  expectedFinalReviewCandidates: [
    {
      itemId: "line-3",
      description: "اسم شخصية مقسوم - المحقق",
      suspicionScore: 75,
      recommendedType: "character",
      action: "correct-tatweel",
    },
    {
      itemId: "line-7",
      description: "اسم شخصية مقسوم - سلمى",
      suspicionScore: 72,
      recommendedType: "character",
      action: "correct-tatweel",
    },
  ],

  // إحصائيات التركيبة
  statistics: {
    totalLines: 87,
    dialogueLines: 20,
    actionLines: 25,
    characterLines: 12,
    sceneHeaderLines: 5,
    parentheticalLines: 8,
    voiceOverLines: 3,
    expectedMinimumSuspicionCases: 2,
    expectedMinimumFinalReviewCandidates: 1,
    estimatedArabicArtifactCount: 3,
  },

  // معرّفات فريدة للأسطر المريبة
  suspiciousLineIdentifiers: {
    "line-3": { text: "المحقـق", reason: "tatweel" },
    "line-7": { text: "سـلمى", reason: "tatweel" },
    "line-13": { text: "المحقـق", reason: "tatweel-duplicate" },
    "line-16": { text: "سـلمى", reason: "tatweel-duplicate" },
    "line-21": { text: "داخلي/خارجي", reason: "compound-scene-header" },
  },
};

/**
 * @description دالة لإنشاء طلب مراجعة الشك محاكاة
 *
 * تُستخدم في الاختبارات والمسابر للتحقق من جاهزية البنية التحتية
 */
export const createSuspicionReviewRequest = (options = {}) => {
  const {
    apiVersion = "1.0",
    importOpId = "import-op-fixture-001",
    sessionId = "session-fixture-001",
  } = options;

  const fixtureLines = REFERENCE_SUSPICION_FIXTURE.split("\n").map((text) => ({
    text: text.trim(),
    isEmpty: text.trim().length === 0,
  }));

  const reviewLines = fixtureLines
    .filter((line) => line.text.length > 0)
    .map((line, index) => ({
      itemId: `fixture-line-${index}`,
      lineIndex: index,
      text: line.text,
      assignedType: classifyLine(line.text),
      routingBand: "agent-candidate",
      originalConfidence: 0.7,
      suspicionScore: calculateSuspicionScore(line.text),
      reasonCodes: extractReasonCodes(line.text),
      signalMessages: [],
      contextLines: [],
      sourceHints: {
        importSource: "reference-fixture",
        sourceMethod: "deterministic-screenplay",
        engineSuggestedType: null,
      },
    }));

  return {
    apiVersion,
    importOpId,
    sessionId,
    totalReviewed: reviewLines.length,
    reviewLines,
  };
};

/**
 * @description تصنيف نوع السطر بناءً على محتواه
 */
function classifyLine(text) {
  if (text.match(/^(داخلي|خارجي|خارجي\/داخلي|داخلي\/خارجي)/)) {
    return "scene_header_top_line";
  }
  if (text.match(/^[\.\(\[]/) || text.match(/^[A-Z\u0600-\u06FF\s\(\)]+$/)) {
    if (
      text.match(
        /^(المحقق|سلمى|المحقـق|سـلمى|الفريق|الضابط|الضابط \d|ضابط \d)/
      )
    ) {
      return "character";
    }
    if (text.match(/\(.*\)/)) {
      return "parenthetical";
    }
    if (text.match(/^(نهاية|نهاية المشهد|إنتهى)/)) {
      return "transition";
    }
  }
  if (text.match(/\(VO\)/)) {
    return "parenthetical";
  }
  if (text.length > 20) {
    return "action";
  }
  if (text.match(/^[\u0600-\u06FF]/)) {
    return "dialogue";
  }
  return "action";
}

/**
 * @description حساب درجة الشك للسطر
 */
function calculateSuspicionScore(text) {
  let score = 0;

  // كشف التطويل (tatweel)
  if (text.includes("ـ")) {
    score += 70;
  }

  // كشف أسماء الشخصيات المقسومة
  if (text.match(/المحقـق|سـلمى/)) {
    score += 5;
  }

  // كشف رؤوس المشاهد المركبة
  if (text.match(/داخلي\/خارجي|خارجي\/داخلي/)) {
    score += 40;
  }

  // كشف (VO) غير المتوقع
  if (text.includes("(VO)") && !text.match(/يقول|يتحدث|يقرأ/)) {
    score += 35;
  }

  // تقييم الثقة منخفض في سياق المسح الضوئي
  if (text.length < 5) {
    score += 10;
  }

  return Math.min(100, score);
}

/**
 * @description استخراج رموز الأسباب للشك
 */
function extractReasonCodes(text) {
  const codes = [];

  if (text.includes("ـ")) {
    codes.push("OCR_TATWEEL_DETECTED");
    codes.push("ARABIC_DIACRITIC_ANOMALY");
  }

  if (text.match(/المحقـق|سـلمى/)) {
    codes.push("SPLIT_CHARACTER_NAME");
    codes.push("POSSIBLE_SCAN_ARTIFACT");
  }

  if (text.match(/داخلي\/خارجي|خارجي\/داخلي/)) {
    codes.push("COMPOUND_SCENE_HEADER");
    codes.push("AMBIGUOUS_CLASSIFICATION");
  }

  if (text.includes("(VO)")) {
    codes.push("VOICE_OVER_MARKER");
    codes.push("UNEXPECTED_PARENTHETICAL_POSITION");
  }

  return codes.slice(0, 32); // حد أقصى 32 رمز
}

export default {
  REFERENCE_SUSPICION_FIXTURE,
  FIXTURE_METADATA,
  createSuspicionReviewRequest,
};
