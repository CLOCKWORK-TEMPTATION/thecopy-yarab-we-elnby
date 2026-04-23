import type {
  AnalysisResult,
  ChatMessage,
  EmotionalColorSuggestion,
  RhythmComparison,
  RhythmPoint,
  SceneRhythmAnalysis,
  TempoLevel,
} from "../types";
import { SAMPLE_SCRIPT } from "./constants";

function normalizeText(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getMeaningfulLines(text: string): string[] {
  return normalizeText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function getDialogueLines(text: string): string[] {
  return getMeaningfulLines(text).filter(
    (line) =>
      line.includes(":") || line.startsWith("أحمد") || line.startsWith("ليلى")
  );
}

function getWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function mapMethodologyTip(methodologyId: string): string {
  switch (methodologyId) {
    case "meisner":
      return "ركز على الاستجابة الصادقة للحظة بدل تزيين الجملة مسبقاً.";
    case "chekhov":
      return "ابنِ صورة جسدية واضحة لكل تحول شعوري قبل بدء الأداء.";
    case "hagen":
      return "استدعِ بديلاً شخصياً محدداً لكل لحظة فقد أو شوق داخل المشهد.";
    case "practical":
      return "اقرأ المشهد كفعل قابل للتنفيذ: ماذا تريد الآن وماذا يمنعك؟";
    default:
      return "ابحث عن فعل درامي واضح لكل جملة ثم اربطه بهدف الشخصية العام.";
  }
}

function computeIntensity(line: string): number {
  const punctuationBoost = (line.match(/[!?؟]/g) || []).length * 8;
  const emotionBoost =
    (line.match(/حب|أحب|أخاف|خوف|قلب|روح|وعد|صعب|شوق|أمل|حزن/g) || []).length *
    6;
  const lengthBoost = Math.min(20, getWordCount(line) * 1.5);
  return clamp(25 + punctuationBoost + emotionBoost + lengthBoost, 20, 95);
}

function tempoFromIntensity(intensity: number): TempoLevel {
  if (intensity < 40) {
    return "slow";
  }
  if (intensity < 65) {
    return "medium";
  }
  if (intensity < 82) {
    return "fast";
  }
  return "very-fast";
}

export function analyzeScriptText(
  scriptText: string,
  methodologyId: string
): AnalysisResult {
  const lines = getMeaningfulLines(scriptText);
  const dialogueLines = getDialogueLines(scriptText);
  const firstDialogue = dialogueLines[0] ?? lines[0] ?? "بداية المشهد";
  const lastDialogue =
    dialogueLines[dialogueLines.length - 1] ??
    lines[lines.length - 1] ??
    "نهاية المشهد";
  const hasLoveAxis = /حب|قلب|روح|شوق|ليلى|أحمد/.test(scriptText);
  const hasFearAxis = /خوف|صعب|العائلة|العوائق|تردد/.test(scriptText);

  const beats = (dialogueLines.length > 0 ? dialogueLines : lines)
    .slice(0, 4)
    .map((line) =>
      line.length > 60 ? `${line.slice(0, 57).trim()}...` : line
    );

  const internalObstacles = [
    hasFearAxis ? "الخوف من الخسارة أو الرفض" : "التردد قبل اتخاذ القرار",
    hasLoveAxis
      ? "التعلق العاطفي العالي يرفع هشاشة الشخصية"
      : "الحاجة إلى الثقة بالنفس",
  ];

  const externalObstacles = [
    /العائلة/.test(scriptText)
      ? "ضغط العائلة أو السلطة الخارجية"
      : "الظروف المحيطة بالمشهد",
    /ليل|شرفة|مسافة|بعيد/.test(scriptText)
      ? "المسافة أو الحاجز المكاني بين الطرفين"
      : "الزمن القصير المتاح لتحقيق الهدف",
  ];

  const emotionalArc = (dialogueLines.length > 0 ? dialogueLines : lines)
    .slice(0, 3)
    .map((line, index) => ({
      beat: index + 1,
      emotion: /خوف|صعب|تردد/.test(line)
        ? "توتر"
        : /حب|قلب|روح|شوق/.test(line)
          ? "شوق"
          : /وعد|سأجد|أقوى/.test(line)
            ? "عزم"
            : "ترقب",
      intensity: computeIntensity(line),
    }));

  return {
    objectives: {
      main: hasLoveAxis
        ? "الوصول إلى وصال آمن رغم العوائق الخارجية والضغط العاطفي."
        : "الدفاع عن الموقف الداخلي للشخصية وتحويله إلى فعل واضح.",
      scene: `تحويل لحظة "${firstDialogue}" إلى فعل يقود نحو "${lastDialogue}".`,
      beats,
    },
    obstacles: {
      internal: internalObstacles,
      external: externalObstacles,
    },
    emotionalArc,
    coachingTips: [
      "قسّم المشهد إلى وحدات فعل قصيرة، ولكل وحدة نية يمكن سماعها في الصوت.",
      "استخدم الوقفة قبل الجملة الأهم لا بعدها حتى يظهر القرار الدرامي بوضوح.",
      mapMethodologyTip(methodologyId),
      hasFearAxis
        ? "خفف سرعة الإلقاء عند لحظات الخوف حتى لا تتحول إلى تقرير مباشر."
        : "ارفع الرهان العاطفي في المنتصف حتى لا يبقى الإيقاع مسطحاً.",
    ],
  };
}

export function buildPartnerResponse(input: {
  scriptText: string;
  history: ChatMessage[];
  userInput: string;
}): string {
  const normalizedInput = input.userInput.trim();
  const lower = normalizedInput.toLowerCase();

  if (/خائف|أخاف|قلق|متردد/.test(normalizedInput)) {
    return "أنا أسمع خوفك، لكنني أحتاج منك وعداً واضحاً لا مجرد طمأنة عابرة.";
  }

  if (/أحب|متمسك|لن أترك|معك/.test(normalizedInput)) {
    return "إذا كنت متمسكاً بي فعلاً، فأرني خطة تقف في وجه العائق لا شعوراً فقط.";
  }

  if (/[؟?]/.test(normalizedInput) || /ماذا|كيف|متى/.test(lower)) {
    return "أريد جواباً صادقاً الآن: ما الفعل الذي ستقوم به في هذه اللحظة تحديداً؟";
  }

  if (/وعد|سأفعل|سأجد/.test(normalizedInput)) {
    return "هذا الوعد يمنحني أملاً، لكن قلْه بهدوء وحسم حتى أصدقه بالكامل.";
  }

  const dialogueLines = getDialogueLines(input.scriptText);
  const fallback =
    dialogueLines.find((line) => /ليلى/.test(line)) ??
    "أنا معك، لكنني أحتاج أن أشعر بصدقك في هذه اللحظة.";

  const lastAiMessage =
    [...input.history].reverse().find((message) => message.role === "ai")
      ?.text ?? "";

  if (lastAiMessage === fallback) {
    return "أعد الفكرة نفسها بصياغة أكثر تحديداً، وامنحها رهانا عاطفيا أكبر.";
  }

  return fallback;
}

function buildRhythmMap(text: string): RhythmPoint[] {
  const lines = getMeaningfulLines(text);
  const chunks =
    lines.length <= 6 ? lines : lines.filter((_, index) => index % 2 === 0);

  return chunks.slice(0, 7).map((line, index, source) => {
    const intensity = computeIntensity(line);
    return {
      position: Math.round((index / Math.max(1, source.length - 1)) * 100),
      intensity,
      tempo: tempoFromIntensity(intensity),
      emotion: /خوف|صعب|تردد/.test(line)
        ? "قلق"
        : /حب|قلب|شوق/.test(line)
          ? "شوق"
          : /وعد|سأجد|أقوى/.test(line)
            ? "تصميم"
            : "ترقب",
      beat: line.length > 80 ? `${line.slice(0, 77).trim()}...` : line,
    };
  });
}

function buildMonotonyAlerts(
  rhythmMap: RhythmPoint[]
): SceneRhythmAnalysis["monotonyAlerts"] {
  const alerts: SceneRhythmAnalysis["monotonyAlerts"] = [];

  for (let index = 1; index < rhythmMap.length; index += 1) {
    const previous = rhythmMap[index - 1];
    const current = rhythmMap[index];
    if (!previous || !current) {
      continue;
    }

    if (
      previous.tempo === current.tempo &&
      Math.abs(previous.intensity - current.intensity) < 8
    ) {
      alerts.push({
        startPosition: previous.position,
        endPosition: current.position,
        severity: current.tempo === "medium" ? "medium" : "low",
        description: "امتداد إيقاعي متشابه يحتاج إلى كسر محسوب.",
        suggestion:
          "أدخل وقفة أو انقلاباً نغمياً قصيراً ليظهر التحول الدرامي بوضوح.",
      });
    }
  }

  return alerts.slice(0, 3);
}

function buildComparisons(rhythmMap: RhythmPoint[]): RhythmComparison[] {
  const intensities = rhythmMap.map((point) => point.intensity);
  const average =
    intensities.reduce((sum, value) => sum + value, 0) /
    Math.max(1, intensities.length);
  const peak = Math.max(...intensities, 0);
  const spread = peak - Math.min(...intensities, peak);

  return [
    {
      aspect: "التصاعد الدرامي",
      yourScore: Math.round(average),
      optimalScore: clamp(Math.round(average + 8), 0, 100),
      difference: clamp(Math.round(average - (average + 8)), -100, 100),
      feedback:
        spread < 20
          ? "ارفع الفارق بين البداية والذروة حتى يشعر المتلقي بانتقال المشهد."
          : "التصاعد حاضر، وحافظ على وضوح القفزة الأخيرة نحو الذروة.",
    },
    {
      aspect: "التنوع الإيقاعي",
      yourScore: clamp(Math.round(spread + 35), 0, 100),
      optimalScore: clamp(Math.round(spread + 45), 0, 100),
      difference: -10,
      feedback:
        spread < 25
          ? "أضف تبايناً أكبر بين المقاطع الهادئة والحادة."
          : "التنوع جيد، فقط احذر من فقدان الوضوح في المقاطع الأسرع.",
    },
    {
      aspect: "توقيت الذروة",
      yourScore: rhythmMap[rhythmMap.length - 1]?.position ?? 0,
      optimalScore: 75,
      difference: (rhythmMap[rhythmMap.length - 1]?.position ?? 0) - 75,
      feedback: "تأكد أن الذروة تأتي بعد بناء كافٍ لا قبل اكتمال الرهان.",
    },
  ];
}

function buildEmotionalSuggestions(
  rhythmMap: RhythmPoint[]
): EmotionalColorSuggestion[] {
  return rhythmMap.slice(0, 3).map((point) => ({
    segment: point.beat,
    currentEmotion: point.emotion,
    suggestedEmotion:
      point.intensity > 75
        ? "حسم مضغوط"
        : point.intensity > 55
          ? "شغف متصاعد"
          : "ترقب مكتوم",
    technique:
      point.intensity > 70
        ? "استخدم وقفة قصيرة قبل الكلمة المفتاحية ثم اقطع الجملة بنبرة أوضح."
        : "مد النفس على الجملة الأساسية ثم اخفضه في الخاتمة لتثبيت المعنى.",
    example:
      point.intensity > 70
        ? "ابدأ بهدوء ثم ارفع الضغط على الكلمة الأخيرة."
        : "اجعل البداية أكثر احتواءً ثم حرر العاطفة في منتصف الجملة.",
  }));
}

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
        "أضف لحظة صمت درامي أو تغييراً مفاجئاً في نبرة الصوت لكسر الرتابة",
    },
    {
      startPosition: 55,
      endPosition: 65,
      severity: "low",
      description: "الحوار يميل للنمطية في هذا القسم",
      suggestion: "جرّب تسريع إيقاع بعض الجمل أو إضافة وقفات استراتيجية محسوبة",
    },
  ],
  comparisons: [
    {
      aspect: "التصاعد الدرامي",
      yourScore: 75,
      optimalScore: 85,
      difference: -10,
      feedback: "يمكن تعزيز التصاعد بإضافة نبضات صغرى قبل الذروة.",
    },
    {
      aspect: "التنوع الإيقاعي",
      yourScore: 70,
      optimalScore: 80,
      difference: -10,
      feedback: "أضف المزيد من التباين بين المقاطع السريعة والبطيئة.",
    },
    {
      aspect: "توقيت الذروة",
      yourScore: 85,
      optimalScore: 85,
      difference: 0,
      feedback: "ممتاز، الذروة تقع في الموضع المناسب للمشهد.",
    },
  ],
  emotionalSuggestions: [
    {
      segment: "يا ليلى، يا قمر الليل",
      currentEmotion: "شوق عادي",
      suggestedEmotion: "شوق ملتهب",
      technique: "تنفّس بعمق قبل النداء ثم دع الجملة تتصاعد تدريجياً.",
      example: "ابدأ بهمس ثم وسّع النبرة عند كلمة قمر الليل.",
    },
    {
      segment: "سأجد طريقة، مهما كانت الصعوبات",
      currentEmotion: "وعد عادي",
      suggestedEmotion: "عزم لا يتزعزع",
      technique: "ثبّت النظرة وخفّض طبقة الصوت قليلًا لخلق حسم أوضح.",
      example: "سأجد... طريقة، مهما كانت الصعوبات.",
    },
  ],
  peakMoments: ["ظهور ليلى على الشرفة", "الوعد بالتغلب على العقبات"],
  valleyMoments: ["الوصف الافتتاحي", "التردد قبل الرد"],
  summary:
    "المشهد يتبع قوساً إيقاعياً رومانسياً يبدأ بهدوء ثم يتصاعد تدريجياً حتى ذروة عاطفية واضحة.",
};

export function analyzeSceneRhythmText(text: string): SceneRhythmAnalysis {
  if (normalizeText(text) === normalizeText(SAMPLE_SCRIPT)) {
    return {
      ...SAMPLE_RHYTHM_ANALYSIS,
      rhythmMap: SAMPLE_RHYTHM_ANALYSIS.rhythmMap.map((point) => ({
        ...point,
      })),
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

  const rhythmMap = buildRhythmMap(text);
  const intensities = rhythmMap.map((point) => point.intensity);
  const average =
    intensities.reduce((sum, value) => sum + value, 0) /
    Math.max(1, intensities.length);
  const rhythmScore = clamp(Math.round(average + rhythmMap.length * 3), 1, 100);
  const highestPoint = [...rhythmMap].sort(
    (left, right) => right.intensity - left.intensity
  )[0];
  const lowestPoint = [...rhythmMap].sort(
    (left, right) => left.intensity - right.intensity
  )[0];

  return {
    overallTempo: tempoFromIntensity(average === 0 ? 35 : average).replace(
      "very-fast",
      "fast"
    ) as Exclude<TempoLevel, "very-fast">,
    rhythmScore,
    rhythmMap,
    monotonyAlerts: buildMonotonyAlerts(rhythmMap),
    comparisons: buildComparisons(rhythmMap),
    emotionalSuggestions: buildEmotionalSuggestions(rhythmMap),
    peakMoments: highestPoint ? [highestPoint.beat] : [],
    valleyMoments: lowestPoint ? [lowestPoint.beat] : [],
    summary:
      "التحليل المحلي قرأ النص كسلسلة نبضات درامية، وحدد أين يتصاعد الضغط وأين يهبط حتى يسهل ضبط الإيقاع أثناء الأداء.",
  };
}
