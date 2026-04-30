import { z } from "zod";

import { platformGenAIService } from "@/services/platform-genai.service";

const dossierSectionsSchema = z.object({
  logline: z.string().min(1),
  premise: z.string().min(1),
  themes: z.string().min(1),
  characters: z.string().min(1),
  conflictMap: z.string().min(1),
  plotArc: z.string().min(1),
  audienceGenre: z.string().min(1),
  producibilityBrief: z.string().min(1),
  productionNotes: z.string().min(1),
});

export type DossierSections = z.infer<typeof dossierSectionsSchema>;

const dossierResponseSchema = z.object({
  dossierJson: dossierSectionsSchema,
  dossierMd: z.string().min(600),
});

export type DossierResult = z.infer<typeof dossierResponseSchema>;

export async function synthesizeDossier(input: {
  idea: {
    ideaStrId: string;
    headline: string;
    premise: string;
    scores: {
      originality: number;
      thematicDepth: number;
      audienceFit: number;
      conflictComplexity: number;
      producibility: number;
      culturalResonance: number;
      composite: number;
    };
  };
  critique: {
    attackVectors: {
      category: string;
      attack: string;
      severity: string;
    }[];
    recommendation: string;
    rationale?: string;
  };
  briefContext: {
    title: string;
    body: string;
    audienceProfile?: string;
    constraints?: string;
  };
}): Promise<DossierResult> {
  const prompt = `أنت كاتب محترف متخصص في تطوير أفكار الدراما العربية إلى ملفات مفاهيم (Concept Dossiers) متكاملة.

سياق المشروع:
العنوان: ${input.briefContext.title}
الوصف: ${input.briefContext.body}
${input.briefContext.audienceProfile ? `الجمهور: ${input.briefContext.audienceProfile}` : ""}
${input.briefContext.constraints ? `القيود: ${input.briefContext.constraints}` : ""}

الفكرة المختارة (${input.idea.ideaStrId}):
العنوان: ${input.idea.headline}
الفكرة: ${input.idea.premise}
النتائج: Originality ${input.idea.scores.originality}/100 | Audience Fit ${input.idea.scores.audienceFit}/100 | Composite ${input.idea.scores.composite}/100

ملاحظات النقد:
${input.critique.attackVectors.map((v) => `- [${v.severity}] ${v.category}: ${v.attack}`).join("\n")}
التوصية: ${input.critique.recommendation}
${input.critique.rationale ? `المبرر: ${input.critique.rationale}` : ""}

المطلوب: أنتج Concept Dossier شامل بـ 9 أقسام إلزامية، بالعربية المهنية، ≥600 كلمة إجمالاً.

أرجع JSON بهذا الشكل فقط:
{
  "dossierJson": {
    "logline": "سطر واحد ≤30 كلمة يلخص الفكرة كاملة",
    "premise": "3-5 أسطر تشرح الفكرة بعمق",
    "themes": "الثيمة الرئيسية + الثيمات الفرعية + الثيمة المضادة",
    "characters": "3-7 شخصيات مع archetype + want vs need لكل منها",
    "conflictMap": "خريطة الصراعات وعلاقاتها",
    "plotArc": "3-act أو 5-act outline تفصيلي",
    "audienceGenre": "الجمهور المستهدف + الجنر + tone/mood",
    "producibilityBrief": "شريحة ميزانية + مخاطر إنتاجية + توصيات",
    "productionNotes": "مرجعيات أسلوبية + دروس من النقد + ملاحظات"
  },
  "dossierMd": "نص Markdown كامل للـ dossier ≥600 كلمة يغطي كل الأقسام التسعة بعناوين واضحة"
}`;

  const raw = await platformGenAIService.generateJson<{
    dossierJson?: unknown;
    dossierMd?: unknown;
  }>(prompt, { temperature: 0.6, maxOutputTokens: 16384 });

  const parsed = dossierResponseSchema.safeParse(raw);
  if (!parsed.success) {
    const fallbackMd = `# ${input.idea.headline}\n\n${input.idea.premise}\n\n*تعذّر توليد الـ dossier الكامل تلقائياً. يحتاج مراجعة يدوية.*`;
    return {
      dossierJson: {
        logline: input.idea.headline,
        premise: input.idea.premise,
        themes: "يحتاج مراجعة",
        characters: "يحتاج مراجعة",
        conflictMap: "يحتاج مراجعة",
        plotArc: "يحتاج مراجعة",
        audienceGenre: "يحتاج مراجعة",
        producibilityBrief: "يحتاج مراجعة",
        productionNotes: "يحتاج مراجعة",
      },
      dossierMd: fallbackMd,
    };
  }

  return parsed.data;
}
