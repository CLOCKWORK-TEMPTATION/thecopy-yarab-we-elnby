import { AI_PARTNER_RESPONSES, SAMPLE_SCRIPT } from "./constants";
import {
  METHODOLOGY_TIPS,
  cloneDemoAnalysis,
  cloneRhythmAnalysis,
} from "./studio-engines-fixtures";
import {
  buildIntensity,
  clamp,
  collectKeywordMatches,
  extractGoalPhrase,
  extractSpeakerNames,
  meaningfulLines,
  normalizeWhitespace,
  pickEmotion,
  stableHash,
  tempoFromLine,
} from "./studio-engines-text-utils";

import type {
  AlertSeverity,
  AnalysisResult,
  ChatMessage,
  MonotonyAlert,
  RhythmComparison,
  RhythmPoint,
  SceneRhythmAnalysis,
} from "../types";

export {
  buildWebcamAnalysisSummary,
  type WebcamAnalysisFrameSample,
  type WebcamAnalysisInput,
} from "./studio-engines-webcam";
export {
  generateSelfTapeReview,
  scoreRecordedPerformance,
  type SelfTapeReview,
  type SelfTapeReviewInput,
  type SelfTapeReviewNote,
} from "./studio-engines-selftape";

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
