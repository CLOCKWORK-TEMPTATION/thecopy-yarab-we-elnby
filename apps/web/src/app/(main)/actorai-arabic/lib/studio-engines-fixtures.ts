import type { AnalysisResult, SceneRhythmAnalysis } from "../types";

export const SAMPLE_DEMO_ANALYSIS: AnalysisResult = {
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

export const SAMPLE_RHYTHM_ANALYSIS: SceneRhythmAnalysis = {
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

export const METHODOLOGY_TIPS: Record<string, string[]> = {
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

export function cloneDemoAnalysis(): AnalysisResult {
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

export function cloneRhythmAnalysis(): SceneRhythmAnalysis {
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
