import { z } from "zod";

import { platformGenAIService } from "@/services/platform-genai.service";

export const rubricScoresSchema = z.object({
  originality: z.number().min(0).max(100),
  thematicDepth: z.number().min(0).max(100),
  audienceFit: z.number().min(0).max(100),
  conflictComplexity: z.number().min(0).max(100),
  producibility: z.number().min(0).max(100),
  culturalResonance: z.number().min(0).max(100),
  composite: z.number().min(0).max(100),
});

export type RubricScores = z.infer<typeof rubricScoresSchema>;

const scoredIdeaSchema = z.object({
  ideaStrId: z.string(),
  scores: rubricScoresSchema,
  eliminationReason: z.string().optional(),
});

const scoredIdeasResponseSchema = z.object({
  scoredIdeas: z.array(scoredIdeaSchema),
});

export type ScoredIdea = z.infer<typeof scoredIdeaSchema>;

export async function scoreIdeas(input: {
  ideas: { ideaStrId: string; headline: string; premise: string }[];
  briefContext: { title: string; body: string; audienceProfile?: string };
}): Promise<ScoredIdea[]> {
  const rubricWeights = {
    originality: 25,
    thematicDepth: 20,
    audienceFit: 20,
    conflictComplexity: 15,
    producibility: 10,
    culturalResonance: 10,
  };

  const prompt = `أنت ناقد صارم متخصص في تقييم الأفكار الدرامية العربية.

سياق المشروع:
${input.briefContext.title}: ${input.briefContext.body}
${input.briefContext.audienceProfile ? `الجمهور: ${input.briefContext.audienceProfile}` : ""}

قيّم كل فكرة من 0 إلى 100 على 6 محاور:
- originality (الأصالة) — الوزن: ${rubricWeights.originality}%
- thematicDepth (العمق الثيمي) — الوزن: ${rubricWeights.thematicDepth}%
- audienceFit (ملاءمة الجمهور) — الوزن: ${rubricWeights.audienceFit}%
- conflictComplexity (تعقيد الصراع) — الوزن: ${rubricWeights.conflictComplexity}%
- producibility (قابلية الإنتاج) — الوزن: ${rubricWeights.producibility}%
- culturalResonance (الصدى الثقافي) — الوزن: ${rubricWeights.culturalResonance}%

composite = مجموع (كل محور × وزنه / 100)
عتبة النجاح للـ composite: 60+

الأفكار للتقييم:
${input.ideas.map((idea) => `${idea.ideaStrId}: ${idea.headline}\n${idea.premise}`).join("\n\n")}

أرجع JSON فقط:
{
  "scoredIdeas": [
    {
      "ideaStrId": "IDEA_001",
      "scores": {
        "originality": 75,
        "thematicDepth": 80,
        "audienceFit": 70,
        "conflictComplexity": 65,
        "producibility": 60,
        "culturalResonance": 72,
        "composite": 72.75
      },
      "eliminationReason": "فقط إذا composite < 60 اشرح لماذا"
    }
  ]
}`;

  const raw = await platformGenAIService.generateJson<{
    scoredIdeas?: unknown[];
  }>(prompt, { temperature: 0.3, maxOutputTokens: 8192 });

  const parsed = scoredIdeasResponseSchema.safeParse(raw);
  if (!parsed.success) {
    return input.ideas.map((idea) => ({
      ideaStrId: idea.ideaStrId,
      scores: {
        originality: 50,
        thematicDepth: 50,
        audienceFit: 50,
        conflictComplexity: 50,
        producibility: 50,
        culturalResonance: 50,
        composite: 50,
      },
    }));
  }

  return parsed.data.scoredIdeas;
}
