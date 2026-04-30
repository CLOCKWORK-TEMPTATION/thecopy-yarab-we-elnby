import { z } from "zod";

import { platformGenAIService } from "@/services/platform-genai.service";

const attackVectorSchema = z.object({
  category: z.string(),
  attack: z.string(),
  severity: z.enum(["low", "medium", "high"]),
});

const critiqueResultSchema = z.object({
  ideaStrId: z.string(),
  attackVectors: z.array(attackVectorSchema).min(3),
  recommendation: z.enum(["survive_with_changes", "abandon", "promote_as_is"]),
  rationale: z.string(),
});

const critiqueResponseSchema = z.object({
  critiques: z.array(critiqueResultSchema),
});

export type CritiqueResult = z.infer<typeof critiqueResultSchema>;

export async function critiqueIdeas(input: {
  ideas: {
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
  }[];
  briefContext: { title: string; body: string };
}): Promise<CritiqueResult[]> {
  const prompt = `أنت محامي الشيطان (Devil's Advocate) متخصص في الدراما العربية. مهمتك الهجوم على كل فكرة بشكل منهجي لكشف نقاط ضعفها الحقيقية.

سياق المشروع: ${input.briefContext.title}: ${input.briefContext.body}

الأفكار الناجحة في التصفية الأولى:
${input.ideas
  .map(
    (idea) =>
      `${idea.ideaStrId}: ${idea.headline}
${idea.premise}
composite score: ${idea.scores.composite}`,
  )
  .join("\n\n")}

لكل فكرة:
1. حدد ≥3 attack vectors من فئات مختلفة: [narrative_logic, character_motivation, cultural_sensitivity, market_viability, production_risk, originality_challenge, audience_alienation]
2. كل attack له severity: low/medium/high
3. أصدر توصية واحدة:
   - promote_as_is: فكرة قوية، لا تحتاج تغييرات جوهرية
   - survive_with_changes: فكرة قابلة للتطوير لو عولجت نقاط محددة
   - abandon: الفكرة لا تستحق الاستثمار بسبب عيوب جوهرية لا يمكن إصلاحها

أرجع JSON فقط:
{
  "critiques": [
    {
      "ideaStrId": "IDEA_001",
      "attackVectors": [
        {"category": "narrative_logic", "attack": "الوصف الدقيق للمشكلة", "severity": "high"},
        {"category": "market_viability", "attack": "الوصف الدقيق", "severity": "medium"},
        {"category": "character_motivation", "attack": "الوصف الدقيق", "severity": "low"}
      ],
      "recommendation": "survive_with_changes",
      "rationale": "تبرير موجز للتوصية"
    }
  ]
}`;

  const raw = await platformGenAIService.generateJson<{
    critiques?: unknown[];
  }>(prompt, { temperature: 0.4, maxOutputTokens: 8192 });

  const parsed = critiqueResponseSchema.safeParse(raw);
  if (!parsed.success) {
    return input.ideas.map((idea) => ({
      ideaStrId: idea.ideaStrId,
      attackVectors: [
        {
          category: "general",
          attack: "تعذّر التحليل التلقائي",
          severity: "low" as const,
        },
        {
          category: "narrative_logic",
          attack: "يحتاج مراجعة بشرية",
          severity: "low" as const,
        },
        {
          category: "market_viability",
          attack: "يحتاج مراجعة بشرية",
          severity: "low" as const,
        },
      ],
      recommendation: "survive_with_changes" as const,
      rationale: "فشل التحليل التلقائي، يحتاج مراجعة يدوية",
    }));
  }

  return parsed.data.critiques;
}
