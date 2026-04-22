"use server";
/**
 * @fileOverview يحلل نصًا دراميًا لتحديد الشخصيات الرئيسية وعلاقاتهم.
 *
 * - analyzeTextForCharactersRelationships - دالة تعالج عملية التحليل.
 * - AnalyzeTextForCharactersRelationshipsInput - نوع الإدخال لدالة analyzeTextForCharactersRelationships.
 * - AnalyzeTextForCharactersRelationshipsOutput - نوع الإرجاع لدالة analyzeTextForCharactersRelationships.
 */

import { ai } from "@/ai/genkit";
import { z } from "genkit";

const AnalyzeTextForCharactersRelationshipsInputSchema = z.object({
  text: z.string().describe("النص الدرامي المراد تحليله."),
});
export type AnalyzeTextForCharactersRelationshipsInput = z.infer<
  typeof AnalyzeTextForCharactersRelationshipsInputSchema
>;

const AnalyzeTextForCharactersRelationshipsOutputSchema = z.object({
  characters: z
    .array(z.string())
    .describe("الشخصيات الرئيسية التي تم تحديدها في النص."),
  relationships: z.array(z.string()).describe("العلاقات بين الشخصيات."),
});
export type AnalyzeTextForCharactersRelationshipsOutput = z.infer<
  typeof AnalyzeTextForCharactersRelationshipsOutputSchema
>;

export async function analyzeTextForCharactersRelationships(
  input: AnalyzeTextForCharactersRelationshipsInput
): Promise<AnalyzeTextForCharactersRelationshipsOutput> {
  return analyzeTextForCharactersRelationshipsFlow(input);
}

const prompt = ai.definePrompt({
  name: "analyzeTextForCharactersRelationshipsPrompt",
  input: { schema: AnalyzeTextForCharactersRelationshipsInputSchema },
  output: { schema: AnalyzeTextForCharactersRelationshipsOutputSchema },
  prompt: `أنت خبير في تحليل النصوص الدرامية. مهمتك هي تحديد الشخصيات الرئيسية وعلاقاتهم في النص المحدد.\n\nالنص: {{{text}}}\n\nحدد الشخصيات الرئيسية ووصف علاقاتهم. أرجع الشخصيات كقائمة من الأسماء، والعلاقات كقائمة من الأوصاف.\n\nالشخصيات:\n- [أسماء الشخصيات]\n\nالعلاقات:\n- [أوصاف العلاقات]`,
  model: "googleai/gemini-2.5-flash",
});

const analyzeTextForCharactersRelationshipsFlow = ai.defineFlow(
  {
    name: "analyzeTextForCharactersRelationshipsFlow",
    inputSchema: AnalyzeTextForCharactersRelationshipsInputSchema,
    outputSchema: AnalyzeTextForCharactersRelationshipsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
