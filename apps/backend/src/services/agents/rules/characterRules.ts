/**
 * Character Analysis Rules
 * Domain-specific rules for character development analysis
 */

import { Rule } from '../shared/constitutionalRules';

function countTermOccurrences(text: string, terms: string[]): number {
  return terms.reduce((count, term) => {
    const matches = text.match(new RegExp(term, 'gi'));
    return count + (matches ? matches.length : 0);
  }, 0);
}

export const characterRules: Rule[] = [
  {
    id: 'char-no-anachronistic-psychology',
    name: 'عدم التحليل النفسي المعاصر للشخصيات التاريخية',
    description: 'تجنب تطبيق مفاهيم نفسية معاصرة على شخصيات من فترات تاريخية مختلفة',
    category: 'character',
    severity: 'major',
    priority: 'high',
    enabled: true,
    parameters: [
      {
        name: 'modernPsychTerms',
        type: 'array',
        value: [
          'الاكتئاب',
          'القلق',
          'الصدمة النفسية',
          'اضطراب',
          'العلاج النفسي',
          'الوعي الذاتي المعاصر',
        ],
        description: 'المصطلحات النفسية المعاصرة التي يجب تجنبها في السياقات التاريخية',
      },
      {
        name: 'threshold',
        type: 'number',
        value: 2,
        description: 'الحد الأقصى لعدد المصطلحات المعاصرة المسموح بها',
      },
    ],
    // eslint-disable-next-line complexity
    check: (text: string, context?: unknown, params?: Record<string, unknown>) => {
      // Check if context suggests historical setting
      const ctx = context as Record<string, string> | undefined;
      const isHistorical = ctx?.setting?.includes('تاريخي') ||
                          ctx?.period?.includes('قديم');

      if (!isHistorical) {
        return true; // Rule doesn't apply
      }

      const modernTerms = (params?.modernPsychTerms || []) as string[];
      const threshold = (params?.threshold || 2) as number;

      return countTermOccurrences(text, modernTerms) <= threshold;
    },
    suggest: async (_text: string, _context?: unknown) => {
      return 'استخدم مصطلحات ومفاهيم مناسبة للفترة التاريخية للشخصية';
    },
  },

  {
    id: 'char-chronological-consistency',
    name: 'الاتساق الزمني للتطور',
    description: 'يجب أن يكون تطور الشخصية متسقاً مع التسلسل الزمني للأحداث',
    category: 'character',
    severity: 'critical',
    priority: 'high',
    enabled: true,
    parameters: [
      {
        name: 'requireTimeline',
        type: 'boolean',
        value: true,
        description: 'يتطلب وجود إشارات زمنية واضحة',
      },
    ],
    check: (text: string, _context?: unknown, _params?: Record<string, unknown>) => {
      // Check for contradictory temporal statements
      const contradictions = [
        /في البداية.*ثم.*في البداية/gi,
        /أولاً.*أخيراً.*أولاً/gi,
      ];

      return !contradictions.some(pattern => pattern.test(text));
    },
    suggest: async (_text: string) => {
      return 'تأكد من تسلسل منطقي واضح لتطور الشخصية عبر الزمن';
    },
  },

  {
    id: 'char-evidence-based-claims',
    name: 'الادعاءات المبنية على الأدلة',
    description: 'يجب أن تكون التحليلات مبنية على أدلة من النص وليس افتراضات',
    category: 'character',
    severity: 'major',
    priority: 'medium',
    enabled: true,
    parameters: [
      {
        name: 'maxUnsupportedClaims',
        type: 'number',
        value: 1,
        description: 'الحد الأقصى للادعاءات غير المدعومة',
      },
      {
        name: 'requireEvidence',
        type: 'boolean',
        value: true,
        description: 'يتطلب أدلة نصية لكل ادعاء رئيسي',
      },
    ],
    check: (text: string, _context?: unknown, params?: Record<string, unknown>) => {
      // Count unsupported claims (heuristic)
      const unsupportedPhrases = [
        /ربما.*دون.*دليل/gi,
        /نفترض/gi,
        /من المحتمل.*دون.*ذكر/gi,
        /بدون.*أساس/gi,
      ];

      let count = 0;
      unsupportedPhrases.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) {
          count += matches.length;
        }
      });

      const maxUnsupported = (params?.maxUnsupportedClaims || 1) as number;
      return count <= maxUnsupported;
    },
    suggest: async (_text: string) => {
      return 'أضف إشارات أو اقتباسات من النص لدعم تحليلاتك عن الشخصية';
    },
  },

  {
    id: 'char-avoid-stereotypes',
    name: 'تجنب الصور النمطية',
    description: 'تجنب التحليلات المبنية على صور نمطية أو تعميمات مفرطة',
    category: 'character',
    severity: 'major',
    priority: 'high',
    enabled: true,
    parameters: [
      {
        name: 'stereotypicalPhrases',
        type: 'array',
        value: [
          'كل النساء',
          'جميع الرجال',
          'كل العرب',
          'دائماً يتصرف',
          'أبداً لا يفعل',
        ],
        description: 'عبارات نمطية يجب تجنبها',
      },
    ],
    check: (text: string, _context?: unknown, params?: Record<string, unknown>) => {
      const stereotypes = (params?.stereotypicalPhrases || []) as string[];

      return !stereotypes.some((phrase: string) => {
        return text.toLowerCase().includes(phrase.toLowerCase());
      });
    },
    suggest: async (_text: string) => {
      return 'ركز على الخصائص الفردية للشخصية بدلاً من التعميمات';
    },
  },

  {
    id: 'char-depth-requirement',
    name: 'متطلبات العمق التحليلي',
    description: 'يجب أن يكون التحليل عميقاً وليس سطحياً',
    category: 'character',
    severity: 'minor',
    priority: 'medium',
    enabled: true,
    parameters: [
      {
        name: 'minLength',
        type: 'number',
        value: 200,
        description: 'الحد الأدنى لطول التحليل بالأحرف',
      },
      {
        name: 'requireLayers',
        type: 'boolean',
        value: true,
        description: 'يتطلب تحليل طبقات متعددة للشخصية',
      },
    ],
    check: (text: string, _context?: unknown, params?: Record<string, unknown>) => {
      const minLength = (params?.minLength || 200) as number;

      // Check minimum length
      if (text.length < minLength) {
        return false;
      }

      // Check for depth indicators
      const depthIndicators = [
        /على السطح.*في العمق/gi,
        /ظاهرياً.*في الحقيقة/gi,
        /من جهة.*من جهة أخرى/gi,
        /البعد.*البعد/gi,
      ];

      const hasDepth = depthIndicators.some(pattern => pattern.test(text));

      return hasDepth || !params?.requireLayers;
    },
    suggest: async (_text: string) => {
      return 'قدم تحليلاً متعدد الأبعاد يستكشف الدوافع الظاهرة والخفية للشخصية';
    },
  },
];
