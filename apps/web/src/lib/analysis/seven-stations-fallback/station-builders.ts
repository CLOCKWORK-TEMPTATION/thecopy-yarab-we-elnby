import {
  clamp,
  formatEfficiencyRating,
  formatOverallRating,
} from "./score-utils";
import { summarizeText } from "./text-analysis";

import type { AnalysisPipelinePayload } from "./types";

interface StationBuildInput {
  projectName: string;
  warning?: string;
  normalizedText: string;
  paragraphs: string[];
  sentences: string[];
  characters: string[];
  themes: string[];
  genre: string;
  tone: string;
  summary: string;
  efficiencyScore: number;
  healthScore: number;
  overallScore: number;
  warningList: string[];
}

type StationOutputs = AnalysisPipelinePayload["stationOutputs"];

function buildStation1Output(
  input: StationBuildInput
): StationOutputs["station1"] {
  const {
    normalizedText,
    paragraphs,
    sentences,
    characters,
    themes,
    tone,
    summary,
  } = input;
  return {
    logline: summary,
    majorCharacters: characters,
    narrativeStyleAnalysis: {
      overallTone: tone,
      pacingAnalysis: {
        overall: paragraphs.length > 6 ? "moderate" : "slow",
        variation: clamp(
          Math.round((paragraphs.length / Math.max(sentences.length, 1)) * 10),
          2,
          8
        ),
        strengths: [
          "الافتتاح يضع السياق بسرعة مع مؤشرات صراع واضحة",
          "التتابع الفقري للنص يسمح بفهم المسار العام بسهولة",
        ],
        weaknesses: ["تحتاج بعض التحولات إلى جسور سببية أوضح"],
      },
      languageStyle: {
        complexity: normalizedText.length > 2500 ? "moderate" : "simple",
        vocabulary: normalizedText.length > 2500 ? "rich" : "standard",
        sentenceStructure: "جمل وصفية متوسطة الطول مع حضور حواري ملحوظ",
        literaryDevices: themes.slice(0, 3),
      },
    },
  };
}

function buildStation2Output(
  input: StationBuildInput
): StationOutputs["station2"] {
  const { summary, genre, themes, sentences, paragraphs, overallScore } = input;
  return {
    storyStatement: summary,
    elevatorPitch: summary,
    hybridGenre: genre,
    genreAlternatives: [
      "دراما نفسية",
      "دراما اجتماعية",
      "إثارة إنسانية",
    ].filter((candidate) => candidate !== genre),
    themeAnalysis: {
      primaryThemes: themes.map((theme, index) => ({
        theme,
        evidence: sentences.slice(index, index + 2),
        strength: clamp(8 - index, 5, 8),
        development:
          "تتكرر الثيمة عبر الحوارات والمواقف الرئيسية بصورة متماسكة.",
      })),
      secondaryThemes: themes.slice(1).map((theme) => ({
        theme,
        occurrences: clamp(paragraphs.length, 2, 6),
      })),
      thematicConsistency: clamp(Math.round(overallScore * 0.9), 50, 90),
    },
  };
}

function buildStation3Output(
  input: StationBuildInput
): StationOutputs["station3"] {
  const { characters, themes } = input;
  return {
    networkSummary: {
      charactersCount: characters.length,
      relationshipsCount: Math.max(characters.length - 1, 1),
      conflictsCount: Math.max(themes.length, 1),
    },
    conflictNetwork: {
      name: "شبكة صراع احتياطية",
      characters,
      relationships: characters.slice(1).map((character, index) => ({
        source: characters[0] ?? "البطل",
        target: character,
        description: `علاقة درامية متوترة تتحرك حول ${themes[index % themes.length] ?? "الصراع الرئيسي"}.`,
      })),
      conflicts: themes.map((theme, index) => ({
        id: `conflict-${index + 1}`,
        name: theme,
        description: `يتجسد هذا الصراع عبر تطور الأحداث المرتبطة بثيمة ${theme}.`,
      })),
    },
  };
}

function buildStation4Output(
  input: StationBuildInput
): StationOutputs["station4"] {
  const {
    characters,
    themes,
    paragraphs,
    sentences,
    efficiencyScore,
    overallScore,
  } = input;
  return {
    efficiencyMetrics: {
      overallEfficiencyScore: efficiencyScore,
      overallRating: formatEfficiencyRating(efficiencyScore),
      conflictCohesion: clamp(Math.round(efficiencyScore * 0.85), 35, 95),
      dramaticBalance: {
        balanceScore: clamp(Math.round(overallScore * 0.82), 35, 95),
        characterInvolvementGini: clamp(
          Number((1 / Math.max(characters.length, 1)).toFixed(2)),
          0.1,
          1
        ),
      },
      narrativeEfficiency: {
        characterEfficiency: clamp(efficiencyScore - 4, 30, 95),
        relationshipEfficiency: clamp(efficiencyScore - 2, 30, 95),
        conflictEfficiency: clamp(efficiencyScore + 1, 30, 95),
      },
      narrativeDensity: clamp(
        Math.round(sentences.length / Math.max(paragraphs.length, 1)),
        1,
        12
      ),
      redundancyMetrics: {
        characterRedundancy: clamp(10 - characters.length, 0, 8),
        relationshipRedundancy: clamp(8 - themes.length, 0, 6),
        conflictRedundancy: clamp(7 - paragraphs.length, 0, 7),
      },
    },
    recommendations: {
      priorityActions: [
        "تقوية الجسر السببي بين المحطات الدرامية الرئيسة.",
        "رفع وضوح هدف الشخصية المحورية في الثلث الأول.",
      ],
      quickFixes: [
        "ضغط المقاطع الوصفية التي تعيد المعلومة نفسها.",
        "منح كل شخصية علامة لغوية أو سلوكية أوضح.",
      ],
      structuralRevisions: ["إبراز نقطة التحول الوسطى بصدام أعلى كلفة."],
    },
  };
}

function buildStation5Output(
  input: StationBuildInput
): StationOutputs["station5"] {
  const { themes, tone, paragraphs } = input;
  return {
    dynamicAnalysisResults: {
      symbolicFocus: themes,
      tonalCurve: [
        { stage: "البداية", tone },
        { stage: "المنتصف", tone: "أعلى توترًا وأكثر كشفًا" },
        { stage: "الخاتمة", tone: "أشد حسماً مع أثر وجداني واضح" },
      ],
      paragraphPeaks: paragraphs.slice(0, 3).map((paragraph, index) => ({
        index: index + 1,
        highlight: summarizeText(paragraph, 1),
      })),
      summary:
        "تم رصد ديناميكية رمزية معقولة يمكن تعميقها بربط الصور المتكررة مباشرةً بالقرار الدرامي.",
    },
  };
}

function buildStation6Output(
  input: StationBuildInput
): StationOutputs["station6"] {
  const { paragraphs, overallScore, efficiencyScore, healthScore } = input;
  return {
    diagnosticsReport: {
      overallHealthScore: healthScore,
      healthBreakdown: {
        characterDevelopment: clamp(overallScore - 4, 30, 95),
        plotCoherence: clamp(overallScore - 2, 30, 95),
        structuralIntegrity: clamp(overallScore - 3, 30, 95),
        dialogueQuality: clamp(efficiencyScore - 5, 30, 95),
        thematicDepth: clamp(overallScore + 1, 30, 95),
      },
      criticalIssues:
        paragraphs.length < 3
          ? [
              {
                type: "major",
                category: "structure",
                description:
                  "حجم المادة السردية قصير نسبيًا ويصعب معه تثبيت قوس تحولي كامل.",
                location: "النص العام",
                impact: 7,
                suggestion:
                  "إضافة مشاهد تأسيس ومواجهة تكشف التحول قبل الخاتمة.",
                affectedElements: ["البنية", "الإيقاع"],
                priority: 8,
              },
            ]
          : [],
      warnings: [
        {
          type: "minor",
          category: "pacing",
          description: "بعض المقاطع تحتاج تفاوتًا أوضح بين الشرح والفعل.",
          location: "المنتصف",
          impact: 5,
          suggestion: "استبدال بعض الوصف بتصادمات فعلية بين الشخصيات.",
          affectedElements: ["الإيقاع"],
          priority: 5,
        },
      ],
      suggestions: [
        {
          type: "minor",
          category: "theme",
          description: "يمكن ترسيخ الثيمات عبر تكرار بصري أو حواري محسوب.",
          location: "عبر النص",
          impact: 4,
          suggestion: "ربط الثيمة الأساسية بقرار ملموس في كل فصل.",
          affectedElements: ["الثيمات"],
          priority: 4,
        },
      ],
      isolatedCharacters: [],
      abandonedConflicts: [],
      structuralIssues: [],
      riskAreas: [
        {
          description: "اعتماد بعض التحولات على التصريح بدلاً من الفعل.",
          probability: 0.45,
          impact: 6,
          category: "execution",
          indicators: ["كثافة تفسيرية مرتفعة", "قلة الانعطافات العملية"],
          mitigation: {
            strategy: "تعزيز الفعل الدرامي المباشر داخل المشاهد المفصلية.",
            effort: "medium",
            effectiveness: 7,
          },
        },
      ],
      opportunities: [
        {
          description: "المادة تحمل قابلية جيدة لتكثيف الصراع الشخصي.",
          potential: 8,
          category: "character",
          currentState: "واضحة جزئيًا",
          exploitation: {
            approach: "إعادة توزيع المواجهات على ثلاث نقاط تحول رئيسية.",
            effort: "moderate",
            timeline: "قصير إلى متوسط",
          },
          expectedBenefit: "رفع الاندماج العاطفي وتحسين وضوح القوس الدرامي.",
        },
      ],
      summary:
        "الفحص الاحتياطي يرى أساسًا صالحًا للعمل مع حاجة متوسطة إلى صقل البنية والإيقاع.",
    },
  };
}

function buildStation7Output(
  input: StationBuildInput,
  executiveSummary: string
): StationOutputs["station7"] {
  const { themes, overallScore, efficiencyScore, healthScore, warningList } =
    input;
  return {
    finalReport: {
      executiveSummary,
      overallAssessment: {
        narrativeQualityScore: clamp(overallScore - 2, 30, 95),
        structuralIntegrityScore: clamp(healthScore, 30, 95),
        characterDevelopmentScore: clamp(overallScore - 1, 30, 95),
        conflictEffectivenessScore: clamp(efficiencyScore, 30, 95),
        thematicDepthScore: clamp(overallScore + 2, 30, 95),
        overallScore,
        rating: formatOverallRating(overallScore),
      },
      strengthsAnalysis: [
        "وجود محور درامي واضح يمكن البناء عليه بسرعة.",
        `الثيمات المرصودة تشمل ${themes.join("، ")} وتمنح النص اتجاهًا مفهوميًا واضحًا.`,
      ],
      weaknessesIdentified: [
        "تحتاج بعض الانتقالات إلى روابط سببية أكثر صراحة.",
        "تمييز الأصوات بين الشخصيات يمكن أن يكون أكثر حدة.",
      ],
      opportunitiesForImprovement: [
        "إبراز نقطة منتصف أكثر انقلابًا.",
        "تغذية الرمز المركزي بتكرارات مدروسة عبر الفصول.",
      ],
      threatsToCoherence:
        warningList.length > 0
          ? warningList
          : ["لا توجد تهديدات تشغيلية حرجة في المسار الاحتياطي."],
      finalRecommendations: {
        mustDo: [
          "توضيح رهان الشخصية الرئيسية مبكرًا.",
          "ربط الخاتمة مباشرة بالصراع المركزي لا بالشرح الخارجي.",
        ],
        shouldDo: ["تقليل الجمل التفسيرية الطويلة داخل المقاطع الوسطى."],
        couldDo: ["إضافة رمز بصري متكرر يدعم الثيمة الأساسية."],
      },
      audienceResonance: {
        emotionalImpact: clamp(Math.round(overallScore / 10), 4, 10),
        intellectualEngagement: clamp(
          Math.round((overallScore - 5) / 10),
          4,
          10
        ),
        relatability: clamp(Math.round((overallScore + 2) / 10), 4, 10),
        memorability: clamp(Math.round((overallScore - 3) / 10), 4, 10),
        viralPotential: clamp(Math.round((overallScore - 8) / 10), 3, 9),
        primaryResponse:
          "النص يترك انطباعًا دراميًا مباشرًا مع قابلية واضحة للتطوير والتحسين.",
        secondaryResponses: [
          "الجمهور سيستجيب أكثر إذا زادت حدة المواجهات الرئيسة.",
        ],
        controversialElements: [],
      },
      rewritingSuggestions: [
        {
          location: "الثلث الأول",
          currentIssue: "الهدف الدرامي لا يظهر بالحدة الكافية.",
          suggestedRewrite:
            "أدخل مواجهة مبكرة تكشف كلفة الفشل على الشخصية المحورية.",
          reasoning: "هذا يرفع الاستثمار العاطفي منذ البداية.",
          impact: 8,
          priority: "must",
        },
      ],
    },
  };
}

export function buildStationOutputs(
  input: StationBuildInput
): AnalysisPipelinePayload["stationOutputs"] {
  const {
    projectName,
    warning,
    tone,
    themes,
    characters,
    efficiencyScore,
    healthScore,
  } = input;

  const executiveSummary = [
    `يعرض النص مشروع "${projectName}" نبرة ${tone} مع تركيز واضح على ${themes.join("، ")}.`,
    `القراءة الاحتياطية رصدت ${characters.length || 1} محاور شخصية بارزة، وأظهرت مؤشرات كفاءة قدرها ${efficiencyScore}/100 وصحة سردية قدرها ${healthScore}/100.`,
    `هذه النتيجة صالحة للاستخدام الفوري، لكنها مبنية على تحليل محلي احتياطي${warning ? " مع غياب الإثراء النموذجي الكامل" : ""}.`,
  ].join(" ");

  return {
    station1: buildStation1Output(input),
    station2: buildStation2Output(input),
    station3: buildStation3Output(input),
    station4: buildStation4Output(input),
    station5: buildStation5Output(input),
    station6: buildStation6Output(input),
    station7: buildStation7Output(input, executiveSummary),
  };
}
