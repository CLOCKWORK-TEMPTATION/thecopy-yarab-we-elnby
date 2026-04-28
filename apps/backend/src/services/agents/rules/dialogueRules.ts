/**
 * Dialogue Analysis Rules
 * Domain-specific rules for dialogue and conversation analysis
 */

import { Rule } from "../shared/constitutionalRules";

export const dialogueRules: Rule[] = [
  {
    id: "dialogue-distinct-voices",
    name: "تمييز الأصوات",
    description: "يجب التعرف على الأصوات المميزة لكل شخصية في الحوار",
    category: "dialogue",
    severity: "major",
    priority: "high",
    enabled: true,
    parameters: [
      {
        name: "requireVoiceAnalysis",
        type: "boolean",
        value: true,
        description: "يتطلب تحليل صوت كل شخصية",
      },
      {
        name: "minCharacters",
        type: "number",
        value: 2,
        description: "الحد الأدنى لعدد الشخصيات المطلوب تحليلها",
      },
    ],
    check: (
      text: string,
      _context?: unknown,
      _params?: Record<string, unknown>,
    ) => {
      // Check if analysis mentions distinct voices
      const voiceIndicators = [
        /صوت.*مميز/gi,
        /أسلوب.*خاص/gi,
        /طريقة.*مختلفة/gi,
        /لغة.*فريدة/gi,
        /نبرة.*خاصة/gi,
      ];

      return voiceIndicators.some((pattern) => pattern.test(text));
    },
    suggest: (_text: string) => {
      return "حلل كيف تختلف طريقة كلام كل شخصية عن الأخرى";
    },
  },

  {
    id: "dialogue-dialect-awareness",
    name: "الوعي باللهجات",
    description: "الانتباه للهجات والمستويات اللغوية المختلفة في الحوار",
    category: "dialogue",
    severity: "minor",
    priority: "medium",
    enabled: true,
    parameters: [
      {
        name: "requireDialectMention",
        type: "boolean",
        value: false,
        description: "يتطلب ذكر اللهجات إن وجدت",
      },
    ],
    check: (
      text: string,
      context?: unknown,
      params?: Record<string, unknown>,
    ) => {
      // If dialect is present in context, check if analysis mentions it
      const ctx = context as Record<string, unknown> | undefined;
      const hasDialect =
        ctx?.hasDialect ??
        (typeof ctx?.language === "string" && ctx.language.includes("لهجة"));

      if (!hasDialect) {
        return true; // Rule doesn't apply
      }

      const dialectMentions = [
        /لهجة/gi,
        /عامية/gi,
        /فصحى/gi,
        /لغة.*محكية/gi,
        /مستوى.*لغوي/gi,
      ];

      const mentionsDialect = dialectMentions.some((pattern) =>
        pattern.test(text),
      );

      return mentionsDialect || !params?.requireDialectMention;
    },
    suggest: (_text: string) => {
      return "ناقش كيف تستخدم اللهجات أو المستويات اللغوية المختلفة في الحوار";
    },
  },

  {
    id: "dialogue-subtext-analysis",
    name: "تحليل النص الضمني",
    description: "يجب تحليل المعاني الضمنية وليس فقط الحوار السطحي",
    category: "dialogue",
    severity: "major",
    priority: "high",
    enabled: true,
    parameters: [
      {
        name: "requireSubtext",
        type: "boolean",
        value: true,
        description: "يتطلب تحليل النص الضمني",
      },
    ],
    check: (
      text: string,
      _context?: unknown,
      params?: Record<string, unknown>,
    ) => {
      const subtextIndicators = [
        /ما.*يقال.*ما.*يعني/gi,
        /ضمني/gi,
        /بين.*السطور/gi,
        /غير.*مباشر/gi,
        /إيحاء/gi,
        /تلميح/gi,
      ];

      const hasSubtextAnalysis = subtextIndicators.some((pattern) =>
        pattern.test(text),
      );

      return hasSubtextAnalysis || !params?.requireSubtext;
    },
    suggest: (_text: string) => {
      return "استكشف المعاني الضمنية والإيحاءات غير المباشرة في الحوار";
    },
  },

  {
    id: "dialogue-conflict-tension",
    name: "تحليل الصراع والتوتر",
    description: "تحديد مصادر التوتر والصراع في الحوار",
    category: "dialogue",
    severity: "minor",
    priority: "medium",
    enabled: true,
    parameters: [
      {
        name: "requireConflictAnalysis",
        type: "boolean",
        value: false,
        description: "يتطلب تحليل الصراع إن وجد",
      },
    ],
    check: (
      text: string,
      context?: unknown,
      params?: Record<string, unknown>,
    ) => {
      const ctx = context as Record<string, unknown> | undefined;
      const hasConflict = ctx?.hasConflict ?? false;

      if (!hasConflict) {
        return true; // Rule doesn't apply
      }

      const conflictIndicators = [
        /صراع/gi,
        /توتر/gi,
        /خلاف/gi,
        /معارضة/gi,
        /تناقض/gi,
      ];

      const analyzesConflict = conflictIndicators.some((pattern) =>
        pattern.test(text),
      );

      return analyzesConflict || !params?.requireConflictAnalysis;
    },
    suggest: (_text: string) => {
      return "حدد نقاط التوتر والصراع في الحوار وكيف تتطور";
    },
  },

  {
    id: "dialogue-naturalism",
    name: "الطبيعية والواقعية",
    description: "تقييم مدى طبيعية وواقعية الحوار",
    category: "dialogue",
    severity: "minor",
    priority: "low",
    enabled: true,
    parameters: [
      {
        name: "checkNaturalness",
        type: "boolean",
        value: true,
        description: "فحص طبيعية الحوار",
      },
    ],
    check: (
      text: string,
      _context?: unknown,
      params?: Record<string, unknown>,
    ) => {
      const naturalnessIndicators = [
        /طبيعي/gi,
        /واقعي/gi,
        /عفوي/gi,
        /تلقائي/gi,
      ];

      // Check if analysis addresses naturalness
      const addressesNaturalness = naturalnessIndicators.some((pattern) =>
        pattern.test(text),
      );

      // Or check if it mentions artificiality
      const artificialityIndicators = [/مصطنع/gi, /متكلف/gi, /غير.*طبيعي/gi];

      const addressesArtificiality = artificialityIndicators.some((pattern) =>
        pattern.test(text),
      );

      return (
        addressesNaturalness ||
        addressesArtificiality ||
        !params?.checkNaturalness
      );
    },
    suggest: (_text: string) => {
      return "قيّم مدى طبيعية الحوار وما إذا كان يبدو كحوار حقيقي";
    },
  },

  {
    id: "dialogue-function-analysis",
    name: "تحليل وظيفة الحوار",
    description:
      "يجب تحليل ما يحققه الحوار في السرد (معلومات، تطوير شخصيات، إلخ)",
    category: "dialogue",
    severity: "minor",
    priority: "medium",
    enabled: true,
    parameters: [
      {
        name: "requireFunctionAnalysis",
        type: "boolean",
        value: true,
        description: "يتطلب تحليل وظيفة الحوار",
      },
    ],
    check: (
      text: string,
      _context?: unknown,
      params?: Record<string, unknown>,
    ) => {
      const functionIndicators = [
        /يقدم.*معلومات/gi,
        /يطور.*شخصية/gi,
        /يدفع.*حدث/gi,
        /يكشف/gi,
        /يساهم.*في/gi,
        /وظيفة.*الحوار/gi,
      ];

      const analyzeFunction = functionIndicators.some((pattern) =>
        pattern.test(text),
      );

      return analyzeFunction || !params?.requireFunctionAnalysis;
    },
    suggest: (_text: string) => {
      return "وضح ما يحققه الحوار في السرد: هل يقدم معلومات؟ يطور الشخصيات؟ يدفع الأحداث؟";
    },
  },
];
