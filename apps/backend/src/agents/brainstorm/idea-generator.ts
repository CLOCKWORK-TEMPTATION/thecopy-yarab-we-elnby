import { z } from "zod";

import { platformGenAIService } from "@/services/platform-genai.service";

export const ideaSchema = z.object({
  ideaStrId: z.string(),
  headline: z.string(),
  premise: z.string(),
  technique: z.string(),
});

export type GeneratedIdea = z.infer<typeof ideaSchema>;

const generatedIdeasSchema = z.object({
  ideas: z.array(ideaSchema),
});

export async function generateIdeasByTechnique(input: {
  briefTitle: string;
  briefBody: string;
  audienceProfile?: string;
  constraints?: string;
  technique:
    | "scamper"
    | "whatif"
    | "reversal"
    | "mashup"
    | "constraint_removal";
  count: number;
  startIndex: number;
}): Promise<GeneratedIdea[]> {
  const techniquePrompts: Record<string, string> = {
    scamper:
      "استخدم تقنية SCAMPER: استبدل (Substitute)، دمج (Combine)، تكيّف (Adapt)، عدّل (Modify)، استخدم لغرض آخر (Put to other uses)، احذف (Eliminate)، اعكس (Reverse). لكل فكرة طبّق مبدأً مختلفاً.",
    whatif:
      "استخدم تقنية 'ماذا لو؟': ابدأ كل فكرة بسيناريو افتراضي مبتكر يعكس العالم أو الشخصية أو الموقف.",
    reversal:
      "استخدم تقنية الانعكاس: اقلب التوقعات التقليدية رأساً على عقب. الضعيف يصبح قوياً، الشرير يصبح بطلاً، النهاية تصبح البداية.",
    mashup:
      "استخدم تقنية المزج: دمج عالمين أو نوعين مختلفين من الدراما العربية أو العالمية. مثلاً: أكشن + عائلي، تاريخي + خيال علمي.",
    constraint_removal:
      "استخدم تقنية رفع القيود: افترض غياب قيود الميزانية، أو الحساسيات، أو الزمن. ماذا يمكن أن تكون القصة في عالم بلا حدود؟",
  };

  const prompt = `أنت مولّد أفكار إبداعي متخصص في الدراما العربية.

Brief العمل:
العنوان: ${input.briefTitle}
الوصف: ${input.briefBody}
${input.audienceProfile ? `الجمهور المستهدف: ${input.audienceProfile}` : ""}
${input.constraints ? `القيود: ${input.constraints}` : ""}

المهمة: ${techniquePrompts[input.technique]}

أنتج بالضبط ${input.count} أفكار سردية عربية مبتكرة.
IDs تبدأ من IDEA_${String(input.startIndex + 1).padStart(3, "0")} إلى IDEA_${String(input.startIndex + input.count).padStart(3, "0")}.

أرجع JSON فقط بهذا الشكل:
{
  "ideas": [
    {
      "ideaStrId": "IDEA_001",
      "headline": "عنوان الفكرة (≤10 كلمات عربية)",
      "premise": "وصف الفكرة (3-5 أسطر عربية)",
      "technique": "${input.technique}"
    }
  ]
}`;

  const raw = await platformGenAIService.generateJson<{ ideas?: unknown[] }>(
    prompt,
    { temperature: 0.85, maxOutputTokens: 8192 },
  );

  const parsed = generatedIdeasSchema.safeParse(raw);
  if (!parsed.success) {
    return [];
  }

  return parsed.data.ideas;
}
