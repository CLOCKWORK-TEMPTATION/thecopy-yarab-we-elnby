// lib/prompt-data.ts
// Prompt templates and sample data for Arabic Prompt Engineering Studio

import type {
  PromptTemplate,
  PromptCategory,
} from "../types";

/**
 * Default prompt templates library
 */
export const defaultPromptTemplates: PromptTemplate[] = [
  {
    id: "creative-writing-ar",
    name: "كتابة إبداعية عربية",
    description: "قالب لإنشاء prompts للكتابة الإبداعية بالعربية",
    category: "creative_writing",
    language: "ar",
    template: `اكتب نصاً إبداعياً باللغة العربية حول الموضوع التالي:

الموضوع: {{topic}}
النوع الأدبي: {{genre}}
الطول: {{length}}
الطابع: {{tone}}

التعليمات:
- استخدم لغة عربية فصيحة ومبدعة
- ركز على {{focus}}
- اجعل النص {{style}}`,
    variables: [
      {
        name: "topic",
        description: "الموضوع الرئيسي للنص",
        required: true,
        type: "string",
      },
      {
        name: "genre",
        description: "النوع الأدبي (قصة، مقال، شعر، إلخ)",
        required: false,
        defaultValue: "قصة",
        type: "string",
      },
      {
        name: "length",
        description: "الطول المطلوب (قصير، متوسط، طويل)",
        required: false,
        defaultValue: "متوسط",
        type: "string",
      },
      {
        name: "tone",
        description: "الطابع المطلوب (جدي، فكاهي، درامي، إلخ)",
        required: false,
        defaultValue: "متوازن",
        type: "string",
      },
      {
        name: "focus",
        description: "ما يجب التركيز عليه",
        required: false,
        type: "string",
      },
      {
        name: "style",
        description: "نمط الكتابة",
        required: false,
        defaultValue: "طبيعي وسلس",
        type: "string",
      },
    ],
    examples: [
      "موضوع: الحلم والواقع، النوع: قصة قصيرة، الطول: متوسط",
      "موضوع: التكنولوجيا والمجتمع، النوع: مقال، الطول: طويل",
    ],
    tags: ["كتابة", "إبداع", "عربي"],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "text-analysis-ar",
    name: "تحليل النصوص",
    description: "قالب لتحليل النصوص العربية",
    category: "analysis",
    language: "ar",
    template: `حلل النص التالي بشكل شامل:

النص:
{{text}}

أجب على الأسئلة التالية:
1. ما الموضوع الرئيسي؟
2. ما الأفكار الفرعية؟
3. ما أسلوب الكاتب؟
4. ما نقاط القوة والضعف؟
5. ما التوصيات للتحسين؟`,
    variables: [
      {
        name: "text",
        description: "النص المراد تحليله",
        required: true,
        type: "string",
      },
    ],
    examples: [],
    tags: ["تحليل", "نصوص", "عربي"],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "translation-ar-en",
    name: "ترجمة عربي-إنجليزي",
    description: "قالب لترجمة النصوص من العربية إلى الإنجليزية",
    category: "translation",
    language: "ar",
    template: `ترجم النص التالي من العربية إلى الإنجليزية مع الحفاظ على:
- المعنى الأصلي
- السياق الثقافي
- النبرة والأسلوب
{{preserveFormat}}

النص:
{{text}}

التعليمات الإضافية:
{{instructions}}`,
    variables: [
      {
        name: "text",
        description: "النص المراد ترجمته",
        required: true,
        type: "string",
      },
      {
        name: "preserveFormat",
        description: "الحفاظ على التنسيق",
        required: false,
        defaultValue: "- التنسيق الأصلي",
        type: "string",
      },
      {
        name: "instructions",
        description: "تعليمات إضافية",
        required: false,
        type: "string",
      },
    ],
    examples: [],
    tags: ["ترجمة", "عربي", "إنجليزي"],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "summarization-ar",
    name: "تلخيص النصوص",
    description: "قالب لتلخيص النصوص العربية",
    category: "summarization",
    language: "ar",
    template: `لخص النص التالي بشكل مختصر ودقيق:

النص:
{{text}}

الطول المطلوب: {{length}}
التركيز على: {{focus}}

التعليمات:
- احتفظ بالأفكار الرئيسية
- استخدم لغة واضحة ومباشرة
- {{additionalInstructions}}`,
    variables: [
      {
        name: "text",
        description: "النص المراد تلخيصه",
        required: true,
        type: "string",
      },
      {
        name: "length",
        description: "طول الملخص (قصير جداً، قصير، متوسط)",
        required: false,
        defaultValue: "متوسط",
        type: "string",
      },
      {
        name: "focus",
        description: "الجوانب التي يجب التركيز عليها",
        required: false,
        type: "string",
      },
      {
        name: "additionalInstructions",
        description: "تعليمات إضافية",
        required: false,
        type: "string",
      },
    ],
    examples: [],
    tags: ["تلخيص", "نصوص"],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

/**
 * Get template by ID
 */
export function getTemplateById(id: string): PromptTemplate | undefined {
  return defaultPromptTemplates.find((t) => t.id === id);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(
  category: PromptCategory
): PromptTemplate[] {
  return defaultPromptTemplates.filter((t) => t.category === category);
}

/**
 * Get templates by language
 */
export function getTemplatesByLanguage(
  language: "ar" | "en"
): PromptTemplate[] {
  return defaultPromptTemplates.filter((t) => t.language === language);
}

/**
 * Render template with variables
 */
export function renderTemplate(
  template: PromptTemplate,
  variables: Record<string, string>
): string {
  let result = template.template;

  for (const variable of template.variables) {
    const value =
      variables[variable.name] || variable.defaultValue || `[${variable.name}]`;
    result = result.replace(
      new RegExp(`\\{\\{${variable.name}\\}\\}`, "g"),
      value
    );
  }

  // Remove any remaining template variables
  result = result.replace(/\{\{[\w]+\}\}/g, "");

  return result;
}

/**
 * Validate template variables
 */
export function validateTemplateVariables(
  template: PromptTemplate,
  variables: Record<string, string>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const variable of template.variables) {
    if (variable.required && !variables[variable.name]) {
      errors.push(`المتغير المطلوب "${variable.name}" مفقود`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Extract template variables from text
 */
export function extractTemplateVariables(text: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const matches = text.matchAll(regex);
  const variables: string[] = [];

  for (const match of matches) {
    const variable = match[1];
    if (variable && !variables.includes(variable)) {
      variables.push(variable);
    }
  }

  return variables;
}
