type StationKey =
  | "station1"
  | "station2"
  | "station3"
  | "station4"
  | "station5"
  | "station6"
  | "station7";

export interface AnalysisPipelinePayload {
  success: boolean;
  mode: "ai" | "fallback";
  warnings: string[];
  stationOutputs: Record<StationKey, Record<string, unknown>>;
  metadata: Record<string, unknown>;
}

interface FallbackInput {
  fullText: string;
  projectName: string;
  warning?: string;
}

const ARABIC_STOP_WORDS = new Set([
  "من",
  "إلى",
  "على",
  "في",
  "عن",
  "مع",
  "هذا",
  "هذه",
  "ذلك",
  "تلك",
  "كان",
  "كانت",
  "يكون",
  "يمكن",
  "لقد",
  "ثم",
  "بعد",
  "قبل",
  "عند",
  "لكن",
  "لأن",
  "كما",
  "كل",
  "بعض",
  "حول",
  "بين",
  "حتى",
  "الى",
  "هنا",
  "هناك",
  "هو",
  "هي",
  "هم",
  "هن",
  "أنا",
  "انت",
  "أنت",
  "نحن",
  "او",
  "أو",
  "لا",
  "لم",
  "لن",
  "قد",
  "ما",
  "ماذا",
  "اذا",
  "إذا",
  "عبر",
  "عليه",
  "عليها",
  "عندها",
  "ضمن",
  "حتى",
  "به",
  "بها",
  "له",
  "لها",
  "تم",
  "جدا",
  "جداً",
]);

const THEME_RULES = [
  { theme: "العائلة", keywords: ["أب", "أم", "أخ", "أخت", "عائلة", "أسرة"] },
  {
    theme: "السلطة",
    keywords: ["سلطة", "حكم", "سيطرة", "قانون", "شرطة", "رئيس"],
  },
  { theme: "الحب", keywords: ["حب", "عشق", "قلب", "زواج", "حبيب"] },
  { theme: "الخيانة", keywords: ["خيانة", "غدر", "خدع", "كذب"] },
  { theme: "النجاة", keywords: ["نجاة", "هروب", "خطر", "تهديد", "موت"] },
  { theme: "الهوية", keywords: ["هوية", "ذات", "ماض", "اسم", "حقيقة"] },
  { theme: "العدالة", keywords: ["عدالة", "انتقام", "حق", "جريمة", "عقاب"] },
  { theme: "الطموح", keywords: ["طموح", "نجاح", "منصب", "ثروة", "حلم"] },
];

const GENRE_RULES = [
  { genre: "إثارة نفسية", keywords: ["خوف", "سر", "تهديد", "غموض", "شك"] },
  {
    genre: "دراما اجتماعية",
    keywords: ["عائلة", "مجتمع", "زواج", "فقر", "حي"],
  },
  { genre: "جريمة", keywords: ["جريمة", "قتل", "شرطة", "تحقيق", "عصابة"] },
  { genre: "رومانسي", keywords: ["حب", "عشق", "حبيب", "زواج", "غيرة"] },
  { genre: "تاريخي", keywords: ["مملكة", "قديم", "تاريخ", "سلطان", "معركة"] },
  { genre: "سياسي", keywords: ["انتخابات", "حكومة", "وزير", "حزب", "قرار"] },
];

function normalizeWhitespace(text: string): string {
  return text.replace(/\r/g, "").replace(/\s+/g, " ").trim();
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function splitSentences(text: string): string[] {
  return text
    .split(/[.!?؟]+/g)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

function tokenizeArabic(text: string): string[] {
  return (text.match(/[\u0600-\u06FF]{3,}/g) ?? [])
    .map((token) => token.trim())
    .filter((token) => !ARABIC_STOP_WORDS.has(token));
}

function extractCharacterCandidates(text: string): string[] {
  const explicitNames = new Set<string>();

  for (const match of text.matchAll(
    /(?:^|\n)\s*([\u0600-\u06FF]{3,}(?:\s+[\u0600-\u06FF]{3,}){0,2})\s*:/gm
  )) {
    const candidate = match[1]?.trim();
    if (candidate) {
      explicitNames.add(candidate);
    }
  }

  for (const match of text.matchAll(
    /(?:قال|رد|سأل|أجاب|صرخ|همس)\s+([\u0600-\u06FF]{3,}(?:\s+[\u0600-\u06FF]{3,}){0,1})/gm
  )) {
    const candidate = match[1]?.trim();
    if (candidate) {
      explicitNames.add(candidate);
    }
  }

  const tokens = tokenizeArabic(text);
  const frequencies = new Map<string, number>();
  for (const token of tokens) {
    frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
  }

  const frequentTokens = [...frequencies.entries()]
    .filter(([, count]) => count >= 3)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 8)
    .map(([token]) => token);

  return [...new Set([...explicitNames, ...frequentTokens])].slice(0, 8);
}

function detectThemes(text: string): string[] {
  const foundThemes = THEME_RULES.filter((rule) =>
    rule.keywords.some((keyword) => text.includes(keyword))
  ).map((rule) => rule.theme);

  if (foundThemes.length > 0) {
    return foundThemes.slice(0, 4);
  }

  return ["الصراع", "التحول", "العلاقات الإنسانية"];
}

function detectGenre(text: string): string {
  const matched = GENRE_RULES.find((rule) =>
    rule.keywords.some((keyword) => text.includes(keyword))
  );

  return matched?.genre ?? "دراما معاصرة";
}

function detectTone(text: string): string {
  if (/(خوف|رعب|تهديد|ظلام|قلق)/.test(text)) {
    return "متوتر ومشحون";
  }

  if (/(حب|حنين|شوق|اشتياق)/.test(text)) {
    return "عاطفي وحميم";
  }

  if (/(جريمة|قتل|تحقيق|مطاردة)/.test(text)) {
    return "حاد وحافل بالمخاطر";
  }

  return "درامي متوازن";
}

function summarizeText(text: string, maxSentences: number): string {
  const normalized = normalizeWhitespace(text);
  const sentences = splitSentences(normalized);

  if (sentences.length === 0) {
    return normalized.slice(0, 280);
  }

  return sentences.slice(0, maxSentences).join("، ");
}

function buildChunks(
  text: string,
  chunkSize: number
): {
  id: string;
  content: string;
  startIndex: number;
  endIndex: number;
}[] {
  const chunks: {
    id: string;
    content: string;
    startIndex: number;
    endIndex: number;
  }[] = [];

  if (text.length <= chunkSize) {
    return [
      {
        id: "chunk-1",
        content: text,
        startIndex: 0,
        endIndex: text.length,
      },
    ];
  }

  const paragraphs = splitParagraphs(text);
  let currentChunk = "";
  let chunkStart = 0;
  let cursor = 0;

  for (const paragraph of paragraphs) {
    const candidate = currentChunk
      ? `${currentChunk}\n\n${paragraph}`
      : paragraph;
    if (candidate.length > chunkSize && currentChunk) {
      chunks.push({
        id: `chunk-${chunks.length + 1}`,
        content: currentChunk,
        startIndex: chunkStart,
        endIndex: chunkStart + currentChunk.length,
      });
      chunkStart = cursor;
      currentChunk = paragraph;
    } else {
      currentChunk = candidate;
    }
    cursor += paragraph.length + 2;
  }

  if (currentChunk) {
    chunks.push({
      id: `chunk-${chunks.length + 1}`,
      content: currentChunk,
      startIndex: chunkStart,
      endIndex: chunkStart + currentChunk.length,
    });
  }

  return chunks;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function formatOverallRating(
  score: number
): "Masterpiece" | "Excellent" | "Good" | "Fair" | "Needs Work" {
  if (score >= 90) return "Masterpiece";
  if (score >= 80) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 55) return "Fair";
  return "Needs Work";
}

function formatEfficiencyRating(
  score: number
): "Excellent" | "Good" | "Fair" | "Poor" | "Critical" {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 55) return "Fair";
  if (score >= 35) return "Poor";
  return "Critical";
}

export function serializeAnalysisValue<T>(value: T): T {
  const seen = new WeakSet<object>();

  function inner(current: unknown): unknown {
    if (
      current === null ||
      current === undefined ||
      typeof current === "string" ||
      typeof current === "number" ||
      typeof current === "boolean"
    ) {
      return current;
    }

    if (current instanceof Date) {
      return current.toISOString();
    }

    if (current instanceof Map) {
      return Object.fromEntries(
        [...current.entries()].map(([key, entry]) => [
          String(key),
          inner(entry),
        ])
      );
    }

    if (current instanceof Set) {
      return [...current].map((entry) => inner(entry));
    }

    if (Array.isArray(current)) {
      return current.map((entry) => inner(entry));
    }

    if (typeof current === "object") {
      if (seen.has(current)) {
        return "[Circular]";
      }

      seen.add(current);
      const serializable: Record<string, unknown> = {};
      for (const [key, entry] of Object.entries(current)) {
        if (typeof entry !== "function") {
          serializable[key] = inner(entry);
        }
      }
      return serializable;
    }

    if (typeof current === "string") {
      return current;
    }
    if (typeof current === "number" || typeof current === "boolean") {
      return current.toString();
    }
    if (typeof current === "bigint") {
      return current.toString();
    }
    if (typeof current === "symbol") {
      return current.description ?? "";
    }
    return "";
  }

  return inner(value) as T;
}

export function buildFallbackSevenStationsResult(
  input: FallbackInput
): AnalysisPipelinePayload {
  const startedAt = Date.now();
  const normalizedText = normalizeWhitespace(input.fullText);
  const paragraphs = splitParagraphs(input.fullText);
  const sentences = splitSentences(input.fullText);
  const characters = extractCharacterCandidates(normalizedText);
  const themes = detectThemes(normalizedText);
  const genre = detectGenre(normalizedText);
  const tone = detectTone(normalizedText);
  const chunks = buildChunks(input.fullText, 1800);

  const dialogueMatches = input.fullText.match(/[:«»"“”]+/g) ?? [];
  const dialogueRatio = clamp(
    Math.round((dialogueMatches.length / Math.max(sentences.length, 1)) * 20),
    15,
    75
  );
  const baseScore = clamp(
    Math.round(
      52 +
        Math.min(paragraphs.length, 12) * 2 +
        Math.min(characters.length, 6) * 3 +
        Math.min(themes.length, 4) * 4
    ),
    45,
    88
  );
  const efficiencyScore = clamp(
    baseScore + Math.round(dialogueRatio * 0.12),
    45,
    92
  );
  const healthScore = clamp(
    efficiencyScore -
      (characters.length < 2 ? 8 : 0) -
      (paragraphs.length < 3 ? 6 : 0),
    35,
    90
  );
  const overallScore = clamp(
    Math.round((efficiencyScore + healthScore) / 2 + 4),
    40,
    92
  );

  const summary = summarizeText(normalizedText, 3);
  const executiveSummary = [
    `يعرض النص مشروع "${input.projectName}" نبرة ${tone} مع تركيز واضح على ${themes.join("، ")}.`,
    `القراءة الاحتياطية رصدت ${characters.length || 1} محاور شخصية بارزة، وأظهرت مؤشرات كفاءة قدرها ${efficiencyScore}/100 وصحة سردية قدرها ${healthScore}/100.`,
    `هذه النتيجة صالحة للاستخدام الفوري، لكنها مبنية على تحليل محلي احتياطي${input.warning ? " مع غياب الإثراء النموذجي الكامل" : ""}.`,
  ].join(" ");

  const warningList = input.warning ? [input.warning] : [];

  return {
    success: true,
    mode: "fallback",
    warnings: warningList,
    stationOutputs: {
      station1: {
        logline: summary,
        majorCharacters: characters,
        narrativeStyleAnalysis: {
          overallTone: tone,
          pacingAnalysis: {
            overall: paragraphs.length > 6 ? "moderate" : "slow",
            variation: clamp(
              Math.round(
                (paragraphs.length / Math.max(sentences.length, 1)) * 10
              ),
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
      },
      station2: {
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
      },
      station3: {
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
      },
      station4: {
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
      },
      station5: {
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
      },
      station6: {
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
              expectedBenefit:
                "رفع الاندماج العاطفي وتحسين وضوح القوس الدرامي.",
            },
          ],
          summary:
            "الفحص الاحتياطي يرى أساسًا صالحًا للعمل مع حاجة متوسطة إلى صقل البنية والإيقاع.",
        },
      },
      station7: {
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
      },
    },
    metadata: {
      stationsCompleted: 7,
      totalExecutionTime: Date.now() - startedAt,
      startedAt: new Date(startedAt).toISOString(),
      finishedAt: new Date().toISOString(),
      projectName: input.projectName,
      analysisMode: "fallback",
      textLength: input.fullText.length,
      chunkCount: chunks.length,
      ragEnabled: chunks.length > 1,
    },
  };
}
