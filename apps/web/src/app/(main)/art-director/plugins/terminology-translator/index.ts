// CineArchitect AI - Multilingual Cinema Terminology Translator
// مترجم المصطلحات السينمائية متعدد اللغات

import { logger } from "@/lib/logger";

import {
  Plugin,
  PluginInput,
  PluginOutput,
  TranslationResult,
} from "../../types";

interface CinemaTerm {
  en: string;
  ar: string;
  fr?: string;
  es?: string;
  category: string;
  definition: string;
  definitionAr: string;
  example?: string;
}

// Comprehensive cinema terminology database
const CINEMA_TERMS: CinemaTerm[] = [
  // Camera & Cinematography
  {
    en: "Dolly Shot",
    ar: "لقطة الدولي",
    category: "camera",
    definition: "A shot where the camera moves on a wheeled platform",
    definitionAr: "لقطة تتحرك فيها الكاميرا على منصة ذات عجلات",
  },
  {
    en: "Crane Shot",
    ar: "لقطة الرافعة",
    category: "camera",
    definition: "A shot taken from a camera mounted on a crane",
    definitionAr: "لقطة مأخوذة من كاميرا مثبتة على رافعة",
  },
  {
    en: "Dutch Angle",
    ar: "الزاوية الهولندية",
    category: "camera",
    definition: "A tilted camera angle for dramatic effect",
    definitionAr: "زاوية كاميرا مائلة للتأثير الدرامي",
  },
  {
    en: "Tracking Shot",
    ar: "لقطة التتبع",
    category: "camera",
    definition: "A shot where the camera follows the subject",
    definitionAr: "لقطة تتبع فيها الكاميرا الموضوع",
  },
  {
    en: "POV Shot",
    ar: "لقطة وجهة النظر",
    category: "camera",
    definition: "Point of view shot showing what a character sees",
    definitionAr: "لقطة تظهر ما تراه الشخصية",
  },
  {
    en: "Establishing Shot",
    ar: "اللقطة التأسيسية",
    category: "camera",
    definition: "Wide shot that establishes location and context",
    definitionAr: "لقطة واسعة تؤسس للموقع والسياق",
  },
  {
    en: "Close-up",
    ar: "لقطة قريبة",
    category: "camera",
    definition: "A shot that closely frames a subject",
    definitionAr: "لقطة تؤطر الموضوع عن قرب",
  },
  {
    en: "Wide Shot",
    ar: "لقطة واسعة",
    category: "camera",
    definition: "A shot showing the full subject and surroundings",
    definitionAr: "لقطة تظهر الموضوع كاملاً ومحيطه",
  },

  // Lighting
  {
    en: "Key Light",
    ar: "الإضاءة الرئيسية",
    category: "lighting",
    definition: "The primary source of light in a scene",
    definitionAr: "مصدر الضوء الرئيسي في المشهد",
  },
  {
    en: "Fill Light",
    ar: "إضاءة التعبئة",
    category: "lighting",
    definition: "Secondary light that fills in shadows",
    definitionAr: "إضاءة ثانوية تملأ الظلال",
  },
  {
    en: "Back Light",
    ar: "الإضاءة الخلفية",
    category: "lighting",
    definition: "Light placed behind the subject for separation",
    definitionAr: "ضوء خلف الموضوع للفصل عن الخلفية",
  },
  {
    en: "Practical",
    ar: "إضاءة عملية",
    category: "lighting",
    definition: "A visible light source within the scene",
    definitionAr: "مصدر ضوء مرئي داخل المشهد",
  },
  {
    en: "High Key",
    ar: "إضاءة عالية المفتاح",
    category: "lighting",
    definition: "Bright, even lighting with few shadows",
    definitionAr: "إضاءة ساطعة ومتساوية مع ظلال قليلة",
  },
  {
    en: "Low Key",
    ar: "إضاءة منخفضة المفتاح",
    category: "lighting",
    definition: "Dark, dramatic lighting with strong shadows",
    definitionAr: "إضاءة داكنة ودرامية مع ظلال قوية",
  },

  // Art Direction
  {
    en: "Set Dressing",
    ar: "تأثيث الديكور",
    category: "art-direction",
    definition: "Decorating and arranging items on a set",
    definitionAr: "تزيين وترتيب العناصر في الديكور",
  },
  {
    en: "Props",
    ar: "الإكسسوارات",
    category: "art-direction",
    definition: "Objects used by actors in a scene",
    definitionAr: "أغراض يستخدمها الممثلون في المشهد",
  },
  {
    en: "Color Palette",
    ar: "لوحة الألوان",
    category: "art-direction",
    definition: "The range of colors used in visual design",
    definitionAr: "مجموعة الألوان المستخدمة في التصميم البصري",
  },
  {
    en: "Mood Board",
    ar: "لوحة المزاج",
    category: "art-direction",
    definition: "Visual reference collection for design inspiration",
    definitionAr: "مجموعة مراجع بصرية للإلهام التصميمي",
  },
  {
    en: "Production Design",
    ar: "تصميم الإنتاج",
    category: "art-direction",
    definition: "Overall visual appearance of a production",
    definitionAr: "المظهر البصري العام للإنتاج",
  },

  // Production
  {
    en: "Call Sheet",
    ar: "ورقة الاستدعاء",
    category: "production",
    definition: "Daily schedule and information for cast and crew",
    definitionAr: "الجدول والمعلومات اليومية للممثلين والطاقم",
  },
  {
    en: "Wrap",
    ar: "انتهاء التصوير",
    category: "production",
    definition: "End of shooting for the day or project",
    definitionAr: "نهاية التصوير لليوم أو المشروع",
  },
  {
    en: "Continuity",
    ar: "الاستمرارية",
    category: "production",
    definition: "Maintaining consistency between shots",
    definitionAr: "الحفاظ على الاتساق بين اللقطات",
  },
  {
    en: "Blocking",
    ar: "تخطيط الحركة",
    category: "production",
    definition: "Planning actor and camera movements",
    definitionAr: "تخطيط حركة الممثلين والكاميرا",
  },
  {
    en: "Coverage",
    ar: "التغطية",
    category: "production",
    definition: "All angles and shots needed for a scene",
    definitionAr: "جميع الزوايا واللقطات المطلوبة للمشهد",
  },
];

export class TerminologyTranslator implements Plugin {
  id = "terminology-translator";
  name = "Multilingual Cinema Terminology Translator";
  nameAr = "مترجم المصطلحات السينمائية متعدد اللغات";
  version = "1.0.0";
  description = "Translates cinema technical terms with high accuracy";
  descriptionAr = "ترجمة المصطلحات الفنية السينمائية بدقة عالية";
  category = "collaboration" as const;

  private terms = new Map<string, CinemaTerm>();
  private termsAr = new Map<string, CinemaTerm>();

  initialize(): void {
    // Build lookup maps
    for (const term of CINEMA_TERMS) {
      this.terms.set(term.en.toLowerCase(), term);
      this.termsAr.set(term.ar, term);
    }
    logger.info(`[${this.name}] Initialized with ${CINEMA_TERMS.length} terms`);
  }

  execute(input: PluginInput): PluginOutput {
    switch (input.type) {
      case "translate":
        return this.translate(
          input.data as unknown as {
            text: string;
            from: "en" | "ar";
            to: "en" | "ar";
          }
        );
      case "lookup":
        return this.lookup(input.data as unknown as { term: string });
      case "list":
        return this.listTerms(input.data);
      case "search":
        return this.searchTerms(
          input.data as unknown as {
            query: string;
            language?: "en" | "ar";
          }
        );
      default:
        return {
          success: false,
          error: `Unknown operation type: ${input.type}`,
        };
    }
  }

  private translate(data: {
    text: string;
    from: "en" | "ar";
    to: "en" | "ar";
  }): PluginOutput {
    const { text, from, to } = data;

    if (from === to) {
      return {
        success: true,
        data: {
          original: text,
          translated: text,
          sourceLanguage: from,
          targetLanguage: to,
        },
      };
    }

    let term: CinemaTerm | undefined;

    if (from === "en") {
      term = this.terms.get(text.toLowerCase());
    } else {
      term = this.termsAr.get(text);
    }

    if (!term) {
      // Try partial match
      const matches = this.searchTermsInternal(text, from);
      if (matches.length > 0) {
        term = matches[0];
      }
    }

    if (term) {
      const result: TranslationResult = {
        original: text,
        translated: to === "en" ? term.en : term.ar,
        sourceLanguage: from,
        targetLanguage: to,
        context: term.category,
        alternatives: [],
      };

      return {
        success: true,
        data: {
          ...result,
          definition: to === "en" ? term.definition : term.definitionAr,
          category: term.category,
        },
      };
    }

    return {
      success: false,
      error: `Term "${text}" not found in database`,
      warnings: ["Consider adding this term to the terminology database"],
    };
  }

  private lookup(data: { term: string }): PluginOutput {
    const { term } = data;

    // Search in both languages
    let found = this.terms.get(term.toLowerCase()) ?? this.termsAr.get(term);

    if (!found) {
      const matches = this.searchTermsInternal(term, "en");
      if (matches.length === 0) {
        const matchesAr = this.searchTermsInternal(term, "ar");
        if (matchesAr.length > 0) {
          found = matchesAr[0];
        }
      } else {
        found = matches[0];
      }
    }

    if (found) {
      return {
        success: true,
        data: {
          en: found.en,
          ar: found.ar,
          category: found.category,
          definition: found.definition,
          definitionAr: found.definitionAr,
        },
      };
    }

    return {
      success: false,
      error: `Term "${term}" not found`,
    };
  }

  private listTerms(data: { category?: string }): PluginOutput {
    let terms = CINEMA_TERMS;

    if (data.category) {
      terms = terms.filter((t) => t.category === data.category);
    }

    return {
      success: true,
      data: {
        count: terms.length,
        categories: [...new Set(CINEMA_TERMS.map((t) => t.category))],
        terms: terms.map((t) => ({
          en: t.en,
          ar: t.ar,
          category: t.category,
        })),
      },
    };
  }

  private searchTerms(data: {
    query: string;
    language?: "en" | "ar";
  }): PluginOutput {
    const { query, language = "en" } = data;
    const matches = this.searchTermsInternal(query, language);

    return {
      success: true,
      data: {
        query,
        count: matches.length,
        results: matches.map((t) => ({
          en: t.en,
          ar: t.ar,
          category: t.category,
          definition: t.definition,
          definitionAr: t.definitionAr,
        })),
      },
    };
  }

  private searchTermsInternal(
    query: string,
    language: "en" | "ar"
  ): CinemaTerm[] {
    const queryLower = query.toLowerCase();

    return CINEMA_TERMS.filter((term) => {
      if (language === "en") {
        return (
          term.en.toLowerCase().includes(queryLower) ||
          term.definition.toLowerCase().includes(queryLower)
        );
      } else {
        return term.ar.includes(query) || term.definitionAr.includes(query);
      }
    });
  }

  shutdown(): void {
    this.terms.clear();
    this.termsAr.clear();
    logger.info(`[${this.name}] Shut down`);
  }
}

export const terminologyTranslator = new TerminologyTranslator();
