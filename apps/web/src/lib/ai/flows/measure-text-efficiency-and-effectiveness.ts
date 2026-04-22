"use server";
/**
 * @fileOverview يقيس كفاءة وفعالية النص الدرامي.
 *
 * - measureTextEfficiencyAndEffectiveness - دالة تحلل النص الدرامي وتعيد مقاييس الكفاءة والفعالية.
 * - MeasureTextEfficiencyAndEffectivenessInput - نوع الإدخال لدالة measureTextEfficiencyAndEffectiveness.
 * - MeasureTextEfficiencyAndEffectivenessOutput - نوع الإخراج لدالة measureTextEfficiencyAndEffectiveness.
 */

import { ai } from "@/ai/genkit";
import { z } from "genkit";

const MeasureTextEfficiencyAndEffectivenessInputSchema = z
  .string()
  .describe("النص الدرامي المراد تحليله.");
export type MeasureTextEfficiencyAndEffectivenessInput = z.infer<
  typeof MeasureTextEfficiencyAndEffectivenessInputSchema
>;

const MeasureTextEfficiencyAndEffectivenessOutputSchema = z.object({
  efficiencyScore: z.number().describe("درجة تمثل كفاءة النص."),
  effectivenessAnalysis: z
    .string()
    .describe("تحليل لفعالية النص في تحقيق أهدافه."),
});
export type MeasureTextEfficiencyAndEffectivenessOutput = z.infer<
  typeof MeasureTextEfficiencyAndEffectivenessOutputSchema
>;

export async function measureTextEfficiencyAndEffectiveness(
  input: MeasureTextEfficiencyAndEffectivenessInput
): Promise<MeasureTextEfficiencyAndEffectivenessOutput> {
  return measureTextEfficiencyAndEffectivenessFlow(input);
}

const prompt = ai.definePrompt({
  name: "measureTextEfficiencyAndEffectivenessPrompt",
  input: { schema: MeasureTextEfficiencyAndEffectivenessInputSchema },
  output: { schema: MeasureTextEfficiencyAndEffectivenessOutputSchema },
  prompt: `أنت خبير في تحليل النصوص الدرامية. حلل النص التالي وقدم درجة كفاءة وتحليل فعالية.

النص: {{{$input}}}

درجة الكفاءة (0-100): قدم درجة تمثل مدى كفاءة النص في نقل رسالته. تشير الدرجات الأعلى إلى كفاءة أفضل.
تحليل الفعالية: حلل مدى فعالية النص في تحقيق أهدافه المقصودة، مع مراعاة عوامل مثل الوضوح والتأثير ومشاركة الجمهور.

تأكد من أن الناتج هو كائن JSON يحتوي على حقلي 'efficiencyScore' (رقم بين 0 و 100) و 'effectivenessAnalysis' (سلسلة نصية)، حيث يقدم 'effectivenessAnalysis' تقييمًا مفصلاً. التزم بأوصاف المخطط لإنشاء كائن JSON هذا. لا تقم بتضمين أي نص محيط. قدم فقط كائن JSON.
`,
});

const measureTextEfficiencyAndEffectivenessFlow = ai.defineFlow(
  {
    name: "measureTextEfficiencyAndEffectivenessFlow",
    inputSchema: MeasureTextEfficiencyAndEffectivenessInputSchema,
    outputSchema: MeasureTextEfficiencyAndEffectivenessOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
