import { AI_PARTNER_RESPONSES, SAMPLE_SCRIPT } from "./constants";
import type {
  AlertSeverity,
  AnalysisResult,
  ChatMessage,
  MonotonyAlert,
  RhythmComparison,
  RhythmPoint,
  SceneRhythmAnalysis,
  TempoLevel,
  WebcamAnalysisResult,
} from "../types";

export interface WebcamAnalysisFrameSample {
  timestamp: number;
  centroidX: number;
  centroidY: number;
  motion: number;
  focus: number;
  brightness: number;
}

export interface WebcamAnalysisInput {
  analysisTime: number;
  samples: WebcamAnalysisFrameSample[];
}

export interface SelfTapeReviewInput {
  durationSeconds: number;
  scriptText: string;
  teleprompterSpeed: number;
  includeTeleprompter: boolean;
}

export interface SelfTapeReviewNote {
  type: "emotion" | "delivery" | "timing" | "movement" | "improvement";
  content: string;
  severity: "positive" | "neutral" | "needs_work";
}

export interface SelfTapeReview {
  score: number;
  notes: SelfTapeReviewNote[];
}

const SAMPLE_DEMO_ANALYSIS: AnalysisResult = {
  objectives: {
    main: "أن يكون مع ليلى ويتغلب على عقبات العائلة",
    scene: "التعبير عن الحب وتقييم مشاعر ليلى تجاهه",
    beats: [
      "مراقبة ليلى من بعيد بشوق",
      "الكشف عن الحضور والتعبير عن المشاعر",
      "تقديم الوعد بإيجاد حل",
    ],
  },
  obstacles: {
    internal: ["الخوف من الرفض", "القلق من اكتشاف العائلة"],
    external: ["المسافة الجسدية (الشرفة)", "معارضة العائلة", "خطر الاكتشاف"],
  },
  emotionalArc: [
    { beat: 1, emotion: "شوق", intensity: 70 },
    { beat: 2, emotion: "أمل", intensity: 85 },
    { beat: 3, emotion: "حب وإصرار", intensity: 95 },
  ],
  coachingTips: [
    "ركز على الصور البصرية - انظر حقاً إلى ليلى كنور في الظلام",
    "اسمح بلحظات صمت للتنفس والتفكير قبل كل جملة",
    "اعثر على التوازن بين الشغف والضعف",
    "استخدم اللغة الشاعرية دون فقدان الأصالة العاطفية",
    "اجعل صوتك يعكس التوتر بين الحب والخوف",
  ],
};

const SAMPLE_RHYTHM_ANALYSIS: SceneRhythmAnalysis = {
  overallTempo: "medium",
  rhythmScore: 78,
  rhythmMap: [
    {
      position: 0,
      intensity: 30,
      tempo: "slow",
      emotion: "ترقب",
      beat: "افتتاحية هادئة - وصف المكان",
    },
    {
      position: 15,
      intensity: 45,
      tempo: "medium",
      emotion: "شوق",
      beat: "دخول أحمد للمشهد",
    },
    {
      position: 30,
      intensity: 65,
      tempo: "medium",
      emotion: "توتر رومانسي",
      beat: "المونولوج الأول",
    },
    {
      position: 45,
      intensity: 80,
      tempo: "fast",
      emotion: "تصاعد عاطفي",
      beat: "ظهور ليلى على الشرفة",
    },
    {
      position: 60,
      intensity: 70,
      tempo: "medium",
      emotion: "حوار متوتر",
      beat: "تبادل المشاعر",
    },
    {
      position: 75,
      intensity: 90,
      tempo: "very-fast",
      emotion: "ذروة عاطفية",
      beat: "الوعد بالتغلب على العقبات",
    },
    {
      position: 90,
      intensity: 60,
      tempo: "medium",
      emotion: "أمل مشوب بالقلق",
      beat: "الختام المفتوح",
    },
  ],
  monotonyAlerts: [
    {
      startPosition: 15,
      endPosition: 35,
      severity: "medium",
      description: "فترة طويلة من الإيقاع المتوسط دون تنويع كافٍ",
      suggestion:
        "أضف لحظة صمت درامي أو تغيير مفاجئ في نبرة الصوت لكسر الرتابة",
    },
    {
      startPosition: 55,
      endPosition: 65,
      severity: "low",
      description: "الحوار يميل للنمطية في هذا القسم",
      suggestion: "جرب تسريع إيقاع بعض الجمل أو إضافة وقفات استراتيجية",
    },
  ],
  comparisons: [
    {
      aspect: "التصاعد الدرامي",
      yourScore: 75,
      optimalScore: 85,
      difference: -10,
      feedback: "يمكن تعزيز التصاعد بإضافة نبضات صغرى قبل الذروة",
    },
    {
      aspect: "التنوع الإيقاعي",
      yourScore: 70,
      optimalScore: 80,
      difference: -10,
      feedback: "أضف المزيد من التباين بين المقاطع السريعة والبطيئة",
    },
    {
      aspect: "توقيت الذروة",
      yourScore: 85,
      optimalScore: 85,
      difference: 0,
      feedback: "ممتاز! الذروة في المكان الصحيح",
    },
  ],
  emotionalSuggestions: [
    {
      segment: "يا ليلى، يا قمر الليل",
      currentEmotion: "شوق عادي",
      suggestedEmotion: "شوق ملتهب",
      technique: "تنفس عميق قبل النداء، ثم إخراج الكلمات بنفس طويل متصاعد",
      example: "ابدأ بهمس ثم تصاعد تدريجي",
    },
    {
      segment: "سأجد طريقة، مهما كانت الصعوبات",
      currentEmotion: "وعد عادي",
      suggestedEmotion: "عزم لا يتزعزع",
      technique: "أنزل صوتك قليلاً واجعله أكثر ثباتاً",
      example: "سأجد... طريقة",
    },
  ],
  peakMoments: ["ظهور ليلى على الشرفة", "الوعد بالتغلب على العقبات"],
  valleyMoments: ["الوصف الافتتاحي", "التردد قبل الرد"],
  summary:
    "المشهد يتبع قوساً إيقاعياً رومانسياً مع بداية هادئة وتصاعد تدريجي نحو ذروة عاطفية.",
};

const METHODOLOGY_TIPS: Record<string, string[]> = {
  stanislavsky: [
    "طبّق سؤال ماذا أريد الآن في كل انتقال درامي.",
    "ابحث عن الفعل الداخلي قبل رفع مستوى الانفعال.",
  ],
  meisner: [
    "استخدم إصغاءً حياً على طريقة مايسنر بدل انتظار الدور.",
    "دع رد فعلك يتغير مع كل تكرار ولا تتمسك بنبرة واحدة.",
  ],
  chekhov: [
    "جرّب إيماءة نفسية صغيرة تقود الجملة بدل شرحها.",
    "وسّع الخيال الجسدي قبل الدخول في الذروة.",
  ],
  hagen: [
    "حدّد الظروف المعطاة بدقة قبل كل سطر حاسم.",
    "ابنِ بديلاً شخصياً عملياً يدعم الصدق دون مبالغة.",
  ],
  practical: [
    "اختر فعلاً قابلاً للّعب في كل beat بدل تفسير المشاعر لفظياً.",
    "ابنِ الإيقاع على الهدف العملي لا على الزخرفة اللغوية فقط.",
  ],
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function meaningfulLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function cloneDemoAnalysis(): AnalysisResult {
  return {
    objectives: {
      ...SAMPLE_DEMO_ANALYSIS.objectives,
      beats: [...SAMPLE_DEMO_ANALYSIS.objectives.beats],
    },
    obstacles: {
      internal: [...SAMPLE_DEMO_ANALYSIS.obstacles.internal],
      external: [...SAMPLE_DEMO_ANALYSIS.obstacles.external],
    },
    emotionalArc: SAMPLE_DEMO_ANALYSIS.emotionalArc.map((point) => ({
      ...point,
    })),
    coachingTips: [...SAMPLE_DEMO_ANALYSIS.coachingTips],
  };
}

function cloneRhythmAnalysis(): SceneRhythmAnalysis {
  return {
    ...SAMPLE_RHYTHM_ANALYSIS,
    rhythmMap: SAMPLE_RHYTHM_ANALYSIS.rhythmMap.map((point) => ({ ...point })),
    monotonyAlerts: SAMPLE_RHYTHM_ANALYSIS.monotonyAlerts.map((alert) => ({
      ...alert,
    })),
    comparisons: SAMPLE_RHYTHM_ANALYSIS.comparisons.map((comparison) => ({
      ...comparison,
    })),
    emotionalSuggestions: SAMPLE_RHYTHM_ANALYSIS.emotionalSuggestions.map(
      (suggestion) => ({ ...suggestion })
    ),
    peakMoments: [...SAMPLE_RHYTHM_ANALYSIS.peakMoments],
    valleyMoments: [...SAMPLE_RHYTHM_ANALYSIS.valleyMoments],
  };
}

function extractGoalPhrase(text: string): string | null {
  const goalPattern = /(أريد|أحتاج|سأ|لن|يجب|سن|أقسم)\s+([^.!؟\n،]+)/u;
  const match = text.match(goalPattern);
  return match?.[2]?.trim() ?? null;
}

function extractSpeakerNames(lines: string[]): string[] {
  const speakers = new Set<string>();
  for (const line of lines) {
    const match = line.match(/^([^:]+):$/u);
    if (match?.[1]) {
      speakers.add(match[1].trim());
    }
  }
  return [...speakers];
}

function collectKeywordMatches(
  text: string,
  keywords: readonly string[]
): string[] {
  const matches = new Set<string>();
  for (const keyword of keywords) {
    if (text.includes(keyword)) {
      matches.add(keyword);
    }
  }
  return [...matches];
}

function buildIntensity(line: string, index: number): number {
  const punctuationBoost = (line.match(/[!؟]/g) ?? []).length * 12;
  const emotionalBoost =
    collectKeywordMatches(line, [
      "حب",
      "خوف",
      "حقيقة",
      "غضب",
      "أمل",
      "وعد",
      "لن",
      "لا",
    ]).length * 10;

  return clamp(32 + punctuationBoost + emotionalBoost + index * 9, 25, 96);
}

function pickEmotion(line: string): string {
  if (line.includes("حب") || line.includes("قلب")) return "حب";
  if (line.includes("خوف") || line.includes("خائفة")) return "خوف";
  if (line.includes("حقيقة") || line.includes("أعترف")) return "مواجهة";
  if (line.includes("أمل") || line.includes("سنجد")) return "أمل";
  if (line.includes("لن") || line.includes("لا")) return "توتر";
  return "ترقب";
}

function tempoFromLine(line: string): TempoLevel {
  const wordCount = line.split(/\s+/).filter(Boolean).length;
  if (wordCount <= 3) return "slow";
  if (wordCount <= 8) return "medium";
  if (wordCount <= 14) return "fast";
  return "very-fast";
}

export function createDeterministicMemorizationMask(
  text: string,
  deletionLevel: number
): string {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return "";
  }

  const normalizedLevel = clamp(Math.round(deletionLevel), 0, 100);
  const wordsToDelete = Math.floor(words.length * (normalizedLevel / 100));

  if (wordsToDelete <= 0) {
    return words.join(" ");
  }

  const ranked = words
    .map((word, index) => ({
      index,
      score: stableHash(`${word}:${index}:${words.length}`),
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, wordsToDelete);

  const toDelete = new Set(ranked.map((item) => item.index));

  return words
    .map((word, index) => (toDelete.has(index) ? "____" : word))
    .join(" ");
}

export function analyzeDemoScript(
  scriptText: string,
  methodologyId: string
): AnalysisResult {
  if (normalizeWhitespace(scriptText) === normalizeWhitespace(SAMPLE_SCRIPT)) {
    return cloneDemoAnalysis();
  }

  const lines = meaningfulLines(scriptText);
  const speakers = extractSpeakerNames(lines);
  const goalPhrase = extractGoalPhrase(scriptText);
  const internalSignals = collectKeywordMatches(scriptText, [
    "خوف",
    "أخشى",
    "قلق",
    "تردد",
    "لن",
    "لا أستطيع",
  ]);
  const externalSignals = collectKeywordMatches(scriptText, [
    "عائلة",
    "شرطة",
    "باب",
    "محقق",
    "محامي",
    "وقت",
    "قانون",
  ]);

  const beats = lines
    .filter((line) => !line.endsWith(":"))
    .slice(0, 3)
    .map((line) => line.replace(/\s+/g, " ").trim());

  const emotionalArc = (beats.length > 0 ? beats : lines.slice(0, 3)).map(
    (line, index) => ({
      beat: index + 1,
      emotion: pickEmotion(line),
      intensity: buildIntensity(line, index),
    })
  );

  const methodologyTips = METHODOLOGY_TIPS[methodologyId] ?? [];
  const anchorSpeaker = speakers[0] ?? "الشخصية الرئيسية";

  return {
    objectives: {
      main: goalPhrase
        ? `السعي إلى ${goalPhrase}`
        : `فهم ما يدفع ${anchorSpeaker} إلى التصعيد في هذا المشهد`,
      scene:
        beats[0] ??
        `كشف نقطة التحول الأساسية في تفاعل ${anchorSpeaker} مع الآخرين`,
      beats:
        beats.length > 0
          ? beats
          : [
              "افتتاحية توضح الرهان الدرامي",
              "منتصف يرفع الضغط",
              "لحظة تحول تقود الخاتمة",
            ],
    },
    obstacles: {
      internal:
        internalSignals.length > 0
          ? internalSignals.map((signal) => `صراع داخلي مرتبط بـ ${signal}`)
          : ["التردد قبل اتخاذ القرار", "الحاجة إلى ضبط الانفعال"],
      external:
        externalSignals.length > 0
          ? externalSignals.map((signal) => `ضغط خارجي ناتج عن ${signal}`)
          : ["الظروف المحيطة لا تساعد على تحقيق الهدف"],
    },
    emotionalArc:
      emotionalArc.length > 0
        ? emotionalArc
        : [
            { beat: 1, emotion: "ترقب", intensity: 45 },
            { beat: 2, emotion: "توتر", intensity: 62 },
            { beat: 3, emotion: "حسم", intensity: 78 },
          ],
    coachingTips: [
      `ابدأ من الفعل الأساسي في هذا النص بدل لعب النتيجة الشعورية مباشرة.`,
      `حدّد لمن تُقال الجملة الأثقل وما الذي تريد تغييره عند الطرف الآخر.`,
      ...methodologyTips,
    ],
  };
}

export function buildScenePartnerReply(
  messages: ChatMessage[],
  userInput: string
): string {
  const normalized = normalizeWhitespace(userInput);
  const turnSeed = stableHash(`${normalized}:${messages.length}`);

  if (normalized.includes("أحبك") || normalized.includes("قلبي")) {
    return "أشعر بصدقك هذه المرة... لكني أحتاج دليلاً لا وعداً فقط.";
  }
  if (normalized.includes("سأ") || normalized.includes("أعدك")) {
    return "الوعد جميل، لكن كيف ستحميه حين يشتد الضغط علينا؟";
  }
  if (normalized.includes("لماذا") || normalized.includes("كيف")) {
    return "لأن الخوف حاضر، ومع ذلك ما زلت أريد أن أصدقك. أقنعني أكثر.";
  }
  if (normalized.includes("لن")) {
    return "هذا الإصرار يطمئنني، لكن لا تجعل غضبك يسبق إحساسك.";
  }

  return (
    AI_PARTNER_RESPONSES[turnSeed % AI_PARTNER_RESPONSES.length] ?? "أنا معك."
  );
}

export function scoreRecordedPerformance(
  durationSeconds: number,
  textLength = 0
): number {
  const clampedDuration = clamp(durationSeconds, 15, 600);
  const paceScore = 100 - Math.abs(clampedDuration - 110) * 0.32;
  const textBonus = clamp(Math.round(textLength / 90), 0, 8);
  return clamp(Math.round(paceScore + textBonus), 62, 95);
}

export function buildSceneRhythmAnalysis(
  scriptText: string
): SceneRhythmAnalysis {
  if (normalizeWhitespace(scriptText) === normalizeWhitespace(SAMPLE_SCRIPT)) {
    return cloneRhythmAnalysis();
  }

  const lines = meaningfulLines(scriptText).filter(
    (line) => !line.endsWith(":")
  );
  const sourceLines = lines.length > 0 ? lines : meaningfulLines(scriptText);

  const rhythmMap: RhythmPoint[] = sourceLines
    .slice(0, 7)
    .map((line, index, all) => ({
      position: Math.round((index / Math.max(all.length - 1, 1)) * 100),
      intensity: buildIntensity(line, index),
      tempo: tempoFromLine(line),
      emotion: pickEmotion(line),
      beat: line,
    }));

  const monotonyAlerts: MonotonyAlert[] = [];
  for (let index = 1; index < rhythmMap.length; index += 1) {
    const previous = rhythmMap[index - 1];
    const current = rhythmMap[index];
    if (!previous || !current) continue;

    const intensityGap = Math.abs(current.intensity - previous.intensity);
    if (intensityGap <= 8 && previous.tempo === current.tempo) {
      const severity: AlertSeverity = intensityGap <= 4 ? "medium" : "low";
      monotonyAlerts.push({
        startPosition: previous.position,
        endPosition: current.position,
        severity,
        description: "الرتابة الإيقاعية تحتاج تنويعاً أوضح بين المقاطع",
        suggestion:
          "أضف وقفة قصيرة أو نقل نبرة أو تغييراً في سرعة الإلقاء لكسر النمط الثابت.",
      });
    }
  }

  const averageIntensity =
    rhythmMap.reduce((sum, point) => sum + point.intensity, 0) /
    Math.max(rhythmMap.length, 1);
  const rhythmScore = clamp(
    Math.round(
      averageIntensity -
        monotonyAlerts.length * 4 +
        collectKeywordMatches(scriptText, ["!", "؟"]).length * 2
    ),
    55,
    92
  );

  const overallTempo: SceneRhythmAnalysis["overallTempo"] =
    averageIntensity < 45 ? "slow" : averageIntensity < 72 ? "medium" : "fast";

  const comparisons: RhythmComparison[] = [
    {
      aspect: "التصاعد الدرامي",
      yourScore: clamp(rhythmScore - 4, 40, 95),
      optimalScore: clamp(rhythmScore + 4, 45, 95),
      difference: 8,
      feedback:
        "يمكنك رفع وضوح نقطة التحول بإبراز الانتقال بين الجمل التمهيدية والذروة.",
    },
    {
      aspect: "التنوع الإيقاعي",
      yourScore: clamp(rhythmScore - monotonyAlerts.length * 5, 40, 95),
      optimalScore: clamp(rhythmScore + 3, 45, 95),
      difference: monotonyAlerts.length > 0 ? -7 : 3,
      feedback:
        monotonyAlerts.length > 0
          ? "هناك مساحات متقاربة الإيقاع تحتاج فرقاً أوضح بين البطء والاندفاع."
          : "التنوع جيد، حافظ فقط على وضوح الانتقالات الكبرى.",
    },
    {
      aspect: "توقيت الذروة",
      yourScore: clamp(
        rhythmMap[rhythmMap.length - 1]?.intensity ?? rhythmScore,
        45,
        95
      ),
      optimalScore: 85,
      difference:
        85 -
        clamp(
          rhythmMap[rhythmMap.length - 1]?.intensity ?? rhythmScore,
          45,
          95
        ),
      feedback: "ضع الذروة قرب الربع الأخير ما لم يكن النص يفرض صدمة مبكرة.",
    },
  ];

  return {
    overallTempo,
    rhythmScore,
    rhythmMap,
    monotonyAlerts,
    comparisons,
    emotionalSuggestions: sourceLines.slice(0, 3).map((line) => ({
      segment: line,
      currentEmotion: pickEmotion(line),
      suggestedEmotion:
        pickEmotion(line) === "توتر" ? "حسم واضح" : "تلوين عاطفي أعمق",
      technique: "بدّل بين المدّ والضغط الصوتي وفق موضع الفعل في الجملة.",
      example:
        line.length > 26
          ? `قسّم هذا السطر إلى وحدتين أدائيتين قبل الوصول إلى نهايته.`
          : `امنح هذا السطر وقفة تنفس قصيرة ثم أعد إطلاقه بنية أوضح.`,
    })),
    peakMoments: rhythmMap
      .filter((point) => point.intensity >= averageIntensity)
      .slice(-2)
      .map((point) => point.beat),
    valleyMoments: rhythmMap
      .filter((point) => point.intensity < averageIntensity)
      .slice(0, 2)
      .map((point) => point.beat),
    summary:
      monotonyAlerts.length > 0
        ? "المشهد يحتوي على بنية مفهومة، لكنه يحتاج اختلافاً أوضح في السرعة والضغط بين المقاطع المتجاورة."
        : "الإيقاع متماسك ويصعد بشكل مفهوم، مع حاجة خفيفة فقط إلى إبراز الانتقالات بين اللحظات.",
  };
}

function detectBlinkRate(
  samples: WebcamAnalysisFrameSample[],
  averageFocus: number
): number {
  let dips = 0;
  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1];
    const current = samples[index];
    if (!previous || !current) continue;

    if (previous.focus >= averageFocus && current.focus < averageFocus - 0.08) {
      dips += 1;
    }
  }

  const estimatedPerMinute = (dips / Math.max(samples.length, 1)) * 60 * 2.5;
  return Math.round(clamp(estimatedPerMinute || 14, 8, 28));
}

function deriveEyeDirection(
  averageX: number,
  averageY: number,
  consistency: number
): WebcamAnalysisResult["eyeLine"]["direction"] {
  if (averageY < 0.38) return "up";
  if (averageY > 0.62) return "down";
  if (averageX < 0.38) return "left";
  if (averageX > 0.62) return "right";
  if (consistency >= 72) return "center";
  return "audience";
}

export function buildWebcamAnalysisSummary(
  input: WebcamAnalysisInput
): WebcamAnalysisResult {
  const { analysisTime, samples } = input;

  if (samples.length === 0) {
    return {
      eyeLine: {
        direction: "center",
        consistency: 62,
        alerts: ["لم تُجمع عينات كافية، أعد التحليل في إضاءة أوضح."],
      },
      expressionSync: {
        score: clamp(58 + Math.round(analysisTime / 3), 58, 78),
        matchedEmotions: ["تركيز"],
        mismatches: ["التحليل يحتاج مدة أطول للحصول على تطابق تعبيري أوضح."],
      },
      blinkRate: {
        rate: 15,
        status: "normal",
        tensionIndicator: 34,
      },
      blocking: {
        spaceUsage: 36,
        movements: ["الحركة المرصودة محدودة بسبب نقص العينات."],
        suggestions: ["تحرك ضمن الكادر بشكل أوضح ثم أعد التحليل."],
      },
      alerts: ["لا توجد بيانات كافية لإنتاج حكم بصري قوي."],
      overallScore: 58,
      timestamp: new Date().toISOString(),
    };
  }

  const averageX =
    samples.reduce((sum, sample) => sum + sample.centroidX, 0) / samples.length;
  const averageY =
    samples.reduce((sum, sample) => sum + sample.centroidY, 0) / samples.length;
  const averageMotion =
    samples.reduce((sum, sample) => sum + sample.motion, 0) / samples.length;
  const averageFocus =
    samples.reduce((sum, sample) => sum + sample.focus, 0) / samples.length;
  const averageBrightness =
    samples.reduce((sum, sample) => sum + sample.brightness, 0) /
    samples.length;
  const averageOffset =
    samples.reduce(
      (sum, sample) =>
        sum +
        Math.abs(sample.centroidX - 0.5) +
        Math.abs(sample.centroidY - 0.5),
      0
    ) / samples.length;

  const consistency = clamp(Math.round(100 - averageOffset * 140), 45, 96);
  const blinkRateValue = detectBlinkRate(samples, averageFocus);
  const blinkStatus =
    blinkRateValue > 22 ? "high" : blinkRateValue < 11 ? "low" : "normal";
  const tensionIndicator = clamp(
    Math.round(averageMotion * 130 + (blinkRateValue - 12) * 1.8),
    18,
    88
  );
  const expressionScore = clamp(
    Math.round(
      averageFocus * 58 + averageBrightness * 18 + (analysisTime > 45 ? 12 : 0)
    ),
    54,
    93
  );
  const spaceUsage = clamp(
    Math.round(
      averageMotion * 160 + (1 - consistency / 100) * 32 + averageOffset * 80
    ),
    24,
    90
  );

  const alerts: string[] = [];
  const eyeAlerts: string[] = [];
  const mismatches: string[] = [];
  const suggestions: string[] = [];

  if (consistency < 68) {
    eyeAlerts.push("خط النظر يتغير كثيراً، ثبّت نقطة التركيز الأساسية.");
    alerts.push("اتساق النظر أقل من المطلوب للمشهد المواجه للكاميرا.");
  }
  if (blinkStatus === "high") {
    alerts.push("معدل الرمش مرتفع وقد يشير إلى توتر زائد.");
  }
  if (spaceUsage < 35) {
    suggestions.push("استخدم مساحة أكبر داخل الكادر لتقوية الحضور.");
  } else {
    suggestions.push("استخدامك للمساحة متوازن ويمكن البناء عليه.");
  }
  if (tensionIndicator > 65) {
    mismatches.push("التوتر الجسدي أعلى من المطلوب في بعض اللحظات.");
  }
  if (averageBrightness < 0.35) {
    alerts.push("الإضاءة منخفضة وقد تؤثر في دقة التقييم البصري.");
  }

  const matchedEmotions = [
    averageMotion > 0.32 ? "اندفاع" : "هدوء",
    averageFocus > 0.72 ? "تركيز" : "ترقب",
    averageBrightness > 0.5 ? "انفتاح" : "انكماش",
  ];

  const overallScore = clamp(
    Math.round(
      consistency * 0.34 +
        expressionScore * 0.32 +
        (100 - tensionIndicator) * 0.18 +
        spaceUsage * 0.16
    ),
    52,
    94
  );

  return {
    eyeLine: {
      direction: deriveEyeDirection(averageX, averageY, consistency),
      consistency,
      alerts: eyeAlerts,
    },
    expressionSync: {
      score: expressionScore,
      matchedEmotions,
      mismatches,
    },
    blinkRate: {
      rate: blinkRateValue,
      status: blinkStatus,
      tensionIndicator,
    },
    blocking: {
      spaceUsage,
      movements: [
        averageMotion > 0.3
          ? "هناك تحرك واضح يخدم لحظات التصعيد."
          : "الحركة محدودة وتميل للثبات داخل الكادر.",
        consistency >= 72
          ? "التموضع العام أمام الكاميرا متزن."
          : "التموضع يتغير باستمرار ويحتاج ضبطاً أفضل.",
      ],
      suggestions,
    },
    alerts,
    overallScore,
    timestamp: new Date().toISOString(),
  };
}

export function generateSelfTapeReview(
  input: SelfTapeReviewInput
): SelfTapeReview {
  const {
    durationSeconds,
    scriptText,
    teleprompterSpeed,
    includeTeleprompter,
  } = input;
  const score = scoreRecordedPerformance(durationSeconds, scriptText.length);
  const notes: SelfTapeReviewNote[] = [];

  if (durationSeconds < 45) {
    notes.push({
      type: "timing",
      content: "المدة قصيرة نسبياً؛ امنح الجمل الرئيسية وقتاً أوضح للتنفس.",
      severity: "needs_work",
    });
  } else {
    notes.push({
      type: "timing",
      content: "الإيقاع العام متوازن ويمنح المشهد مساحة كافية للتصاعد.",
      severity: "positive",
    });
  }

  if (teleprompterSpeed > 65) {
    notes.push({
      type: "delivery",
      content: "سرعة التلقين مرتفعة وقد تدفع الإلقاء إلى الاستعجال.",
      severity: "needs_work",
    });
  } else if (includeTeleprompter) {
    notes.push({
      type: "delivery",
      content: "استخدام التلقين مضبوط ويساعد على ثبات الإيقاع دون شد ظاهر.",
      severity: "positive",
    });
  }

  notes.push({
    type: "emotion",
    content:
      scriptText.length > 220
        ? "النص طويل بما يكفي لاحتياج تلوين عاطفي أوضح بين المقاطع."
        : "الطاقة العاطفية مناسبة، ويمكن تعزيز التحول في الجملة الأخيرة.",
    severity: scriptText.length > 220 ? "neutral" : "positive",
  });

  notes.push({
    type: "improvement",
    content:
      score >= 84
        ? "التسجيل قوي، ركّز الآن على تحسين التفاصيل الدقيقة لا الهيكل العام."
        : "أعد التسجيل مع وقفات أوضح وبداية أكثر ثقة لرفع التقييم العام.",
    severity: score >= 84 ? "positive" : "neutral",
  });

  return {
    score,
    notes,
  };
}
