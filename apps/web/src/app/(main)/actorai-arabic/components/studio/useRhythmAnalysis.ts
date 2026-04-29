import { useState, useCallback } from "react";

import { SAMPLE_SCRIPT } from "../../types/constants";

import type { SceneRhythmAnalysis } from "../../types";

const TEMPO_LABELS: Record<string, string> = {
  slow: "بطيء",
  medium: "متوسط",
  fast: "سريع",
  "very-fast": "سريع جداً",
};

function buildSampleAnalysis(): SceneRhythmAnalysis {
  return {
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
      {
        aspect: "الختام",
        yourScore: 72,
        optimalScore: 78,
        difference: -6,
        feedback: "الختام سريع قليلاً، فكر في إطالته لإشباع عاطفي أكبر",
      },
      {
        aspect: "الافتتاحية",
        yourScore: 80,
        optimalScore: 82,
        difference: -2,
        feedback: "جيد جداً، افتتاحية مناسبة للمشهد الرومانسي",
      },
    ],
    emotionalSuggestions: [
      {
        segment: "يا ليلى، يا قمر الليل",
        currentEmotion: "شوق عادي",
        suggestedEmotion: "شوق ملتهب",
        technique: "تنفس عميق قبل النداء، ثم إخراج الكلمات بنفس طويل متصاعد",
        example:
          "ابدأ بهمس ثم تصاعد تدريجي: يا... ليـ...ـلى (مد الحروف مع تصاعد)",
      },
      {
        segment: "أنتِ نور عيني وروحي",
        currentEmotion: "إعلان مباشر",
        suggestedEmotion: "اكتشاف داخلي",
        technique: "كأنك تكتشف هذه الحقيقة للمرة الأولى أثناء الكلام",
        example: "توقف قصير بين 'عيني' و'روحي' كأنك تبحث عن الكلمة الأعمق",
      },
      {
        segment: "ماذا سنفعل؟",
        currentEmotion: "تساؤل بسيط",
        suggestedEmotion: "قلق ممزوج بأمل",
        technique: "اجعل السؤال معلقاً في الهواء، لا تنهيه بشكل حاسم",
        example: "ارفع نبرتك قليلاً في النهاية مع نظرة تنتظر الجواب",
      },
      {
        segment: "سأجد طريقة، مهما كانت الصعوبات",
        currentEmotion: "وعد عادي",
        suggestedEmotion: "عزم لا يتزعزع",
        technique: "أنزل صوتك قليلاً واجعله أكثر ثباتاً - صوت القرار",
        example:
          "سأجد (وقفة قصيرة مع نظرة مباشرة) طريقة... مهما كانت الصعوبات (بثبات)",
      },
    ],
    peakMoments: [
      "لحظة ظهور ليلى على الشرفة - ذروة بصرية",
      "جملة 'حبنا أقوى من كل العوائق' - ذروة عاطفية",
      "التقاء النظرات الأول - ذروة صامتة",
    ],
    valleyMoments: [
      "الوصف الافتتاحي للحديقة - لحظة سكون ضرورية",
      "تردد ليلى قبل الرد - وقفة درامية",
    ],
    summary:
      "المشهد يتبع قوساً إيقاعياً كلاسيكياً رومانسياً مع بداية هادئة وتصاعد تدريجي نحو ذروة عاطفية. الإيقاع العام جيد لكن يمكن تحسينه بإضافة المزيد من التنوع في القسم الأوسط وإطالة لحظات الصمت الدرامي.",
  };
}

export const useRhythmAnalysis = (
  showNotification: (type: string, message: string) => void
) => {
  const [rhythmScriptText, setRhythmScriptText] = useState("");
  const [analyzingRhythm, setAnalyzingRhythm] = useState(false);
  const [rhythmAnalysis, setRhythmAnalysis] =
    useState<SceneRhythmAnalysis | null>(null);

  const useRhythmSampleScript = useCallback(() => {
    setRhythmScriptText(SAMPLE_SCRIPT);
    showNotification("info", "تم تحميل النص التجريبي لتحليل الإيقاع");
  }, [showNotification]);

  const analyzeSceneRhythm = useCallback(() => {
    if (!rhythmScriptText.trim()) {
      showNotification("error", "يرجى إدخال نص أولاً لتحليل الإيقاع");
      return;
    }

    setAnalyzingRhythm(true);

    setTimeout(() => {
      const analysis = buildSampleAnalysis();
      setRhythmAnalysis(analysis);
      setAnalyzingRhythm(false);
      showNotification("success", "تم تحليل إيقاع المشهد بنجاح!");
    }, 3000);
  }, [rhythmScriptText, showNotification]);

  const getTempoLabel = useCallback((tempo: string): string => {
    return TEMPO_LABELS[tempo] ?? tempo;
  }, []);

  return {
    rhythmScriptText,
    setRhythmScriptText,
    analyzingRhythm,
    rhythmAnalysis,
    useRhythmSampleScript,
    analyzeSceneRhythm,
    getTempoLabel,
  };
};
