/**
 * Plot Analysis Rules
 * Domain-specific rules for plot and narrative structure analysis
 */

import { Rule } from "../shared/constitutionalRules";

export const plotRules: Rule[] = [
  {
    id: "plot-causal-links",
    name: "الروابط السببية",
    description: "يجب التحقق من الروابط السببية المنطقية بين الأحداث",
    category: "plot",
    severity: "critical",
    priority: "high",
    enabled: true,
    parameters: [
      {
        name: "requireCausality",
        type: "boolean",
        value: true,
        description: "يتطلب تحليل العلاقات السببية",
      },
    ],
    check: (
      text: string,
      _context?: unknown,
      params?: Record<string, unknown>,
    ) => {
      const causalIndicators = [
        /بسبب/gi,
        /نتيجة/gi,
        /لذلك/gi,
        /مما.*أدى/gi,
        /بالتالي/gi,
        /يترتب/gi,
      ];

      const hasCausalAnalysis = causalIndicators.some((pattern) =>
        pattern.test(text),
      );

      return hasCausalAnalysis || !params?.requireCausality;
    },
    suggest: (_text: string) => {
      return "وضح كيف تؤدي الأحداث إلى بعضها البعض بشكل منطقي";
    },
  },

  {
    id: "plot-no-holes",
    name: "عدم وجود ثغرات",
    description: "تحديد أي ثغرات منطقية أو أحداث غير مبررة",
    category: "plot",
    severity: "major",
    priority: "high",
    enabled: true,
    parameters: [
      {
        name: "identifyPlotHoles",
        type: "boolean",
        value: true,
        description: "تحديد الثغرات في الحبكة",
      },
    ],
    check: (
      text: string,
      _context?: unknown,
      params?: Record<string, unknown>,
    ) => {
      // Look for mentions of plot holes or inconsistencies
      const plotHoleIndicators = [
        /ثغرة/gi,
        /تناقض.*منطقي/gi,
        /غير.*مبرر/gi,
        /بدون.*تفسير/gi,
      ];

      const mentionsPlotHoles = plotHoleIndicators.some((pattern) =>
        pattern.test(text),
      );

      // If plot holes are mentioned, that's good (identifying them)
      // If we require identification and none are mentioned, we check if analysis is comprehensive
      if (!mentionsPlotHoles && params?.identifyPlotHoles) {
        // Check if analysis is thorough enough
        const thoroughnessIndicators = [
          /متسق/gi,
          /منطقي/gi,
          /مبرر/gi,
          /واضح/gi,
        ];

        return thoroughnessIndicators.some((pattern) => pattern.test(text));
      }

      return true;
    },
    suggest: (_text: string) => {
      return "ابحث عن أي ثغرات أو تناقضات في الحبكة وأشر إليها";
    },
  },

  {
    id: "plot-pacing-consistency",
    name: "اتساق الإيقاع",
    description: "تحليل إيقاع السرد وتناسقه",
    category: "plot",
    severity: "minor",
    priority: "medium",
    enabled: true,
    parameters: [
      {
        name: "analyzePacing",
        type: "boolean",
        value: true,
        description: "تحليل إيقاع السرد",
      },
    ],
    check: (
      text: string,
      _context?: unknown,
      params?: Record<string, unknown>,
    ) => {
      const pacingIndicators = [
        /إيقاع/gi,
        /سرعة.*السرد/gi,
        /بطء/gi,
        /تسارع/gi,
        /وتيرة/gi,
      ];

      const analyzesPacing = pacingIndicators.some((pattern) =>
        pattern.test(text),
      );

      return analyzesPacing || !params?.analyzePacing;
    },
    suggest: (_text: string) => {
      return "ناقش إيقاع السرد: هل هو سريع؟ بطيء؟ متنوع؟";
    },
  },

  {
    id: "plot-structure-recognition",
    name: "التعرف على البنية",
    description: "التعرف على البنية السردية والهيكل الدرامي",
    category: "plot",
    severity: "minor",
    priority: "medium",
    enabled: true,
    parameters: [
      {
        name: "requireStructureAnalysis",
        type: "boolean",
        value: true,
        description: "يتطلب تحليل البنية السردية",
      },
    ],
    check: (
      text: string,
      _context?: unknown,
      params?: Record<string, unknown>,
    ) => {
      const structureIndicators = [
        /بنية/gi,
        /هيكل/gi,
        /مقدمة.*عقدة.*حل/gi,
        /فصل.*مشهد/gi,
        /تصاعد.*ذروة/gi,
      ];

      const recognizesStructure = structureIndicators.some((pattern) =>
        pattern.test(text),
      );

      return recognizesStructure || !params?.requireStructureAnalysis;
    },
    suggest: (_text: string) => {
      return "حدد البنية السردية: المقدمة، التصاعد، الذروة، الحل";
    },
  },

  {
    id: "plot-foreshadowing-analysis",
    name: "تحليل التلميحات المسبقة",
    description: "التعرف على التلميحات والإرهاصات في السرد",
    category: "plot",
    severity: "minor",
    priority: "low",
    enabled: true,
    parameters: [
      {
        name: "identifyForeshadowing",
        type: "boolean",
        value: false,
        description: "تحديد التلميحات المسبقة",
      },
    ],
    check: (
      text: string,
      _context?: unknown,
      params?: Record<string, unknown>,
    ) => {
      const foreshadowingIndicators = [
        /تلميح/gi,
        /إرهاص/gi,
        /إشارة.*مسبقة/gi,
        /تنبؤ/gi,
      ];

      const identifiesForeshadowing = foreshadowingIndicators.some((pattern) =>
        pattern.test(text),
      );

      return identifiesForeshadowing || !params?.identifyForeshadowing;
    },
    suggest: (_text: string) => {
      return "ابحث عن التلميحات المسبقة التي تشير إلى أحداث لاحقة";
    },
  },

  {
    id: "plot-subplots-integration",
    name: "تكامل الحبكات الفرعية",
    description: "تحليل كيفية تكامل الحبكات الفرعية مع الحبكة الرئيسية",
    category: "plot",
    severity: "minor",
    priority: "medium",
    enabled: true,
    parameters: [
      {
        name: "analyzeSubplots",
        type: "boolean",
        value: true,
        description: "تحليل الحبكات الفرعية",
      },
    ],
    check: (
      text: string,
      context?: unknown,
      params?: Record<string, unknown>,
    ) => {
      // Check if there are subplots mentioned in context
      const ctx = context as Record<string, unknown> | undefined;
      const hasSubplots = ctx?.hasSubplots ?? false;

      if (!hasSubplots) {
        return true; // Rule doesn't apply
      }

      const subplotIndicators = [
        /حبكة.*فرعية/gi,
        /خط.*سردي.*ثانوي/gi,
        /قصة.*جانبية/gi,
        /متوازي/gi,
      ];

      const analyzesSubplots = subplotIndicators.some((pattern) =>
        pattern.test(text),
      );

      return analyzesSubplots || !params?.analyzeSubplots;
    },
    suggest: (_text: string) => {
      return "ناقش كيف تتكامل الحبكات الفرعية مع الحبكة الرئيسية";
    },
  },

  {
    id: "plot-tension-arc",
    name: "قوس التوتر",
    description: "تحليل تصاعد وهبوط التوتر الدرامي",
    category: "plot",
    severity: "minor",
    priority: "medium",
    enabled: true,
    parameters: [
      {
        name: "requireTensionAnalysis",
        type: "boolean",
        value: true,
        description: "يتطلب تحليل قوس التوتر",
      },
    ],
    check: (
      text: string,
      _context?: unknown,
      params?: Record<string, unknown>,
    ) => {
      const tensionIndicators = [
        /توتر/gi,
        /تشويق/gi,
        /تصاعد/gi,
        /ذروة/gi,
        /تراجع/gi,
      ];

      const analyzesTension = tensionIndicators.some((pattern) =>
        pattern.test(text),
      );

      return analyzesTension || !params?.requireTensionAnalysis;
    },
    suggest: (_text: string) => {
      return "وصف كيف يتصاعد التوتر الدرامي ويتطور عبر السرد";
    },
  },
];
