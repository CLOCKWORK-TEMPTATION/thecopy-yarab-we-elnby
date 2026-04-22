"use server";

/**
 * @fileOverview يحدد هذا الملف تدفق Genkit لتوليد شبكة صراع من نص تم تحليله.
 *
 * يتضمن تعريف التدفق، ومخططات الإدخال والإخراج، ودالة مجمعة لاستدعاء التدفق.
 *
 * - generateConflictNetwork - دالة تولد شبكة صراع من نص تم تحليله.
 * - GenerateConflictNetworkInput - نوع الإدخال لدالة generateConflictNetwork.
 * - GenerateConflictNetworkOutput - نوع الإخراج لدالة generateConflictNetwork.
 */

import { ai } from "@/ai/genkit";
import { z } from "genkit";

const GenerateConflictNetworkInputSchema = z.object({
  analyzedText: z
    .string()
    .describe("النص الدرامي الذي تم تحليله لتوليد شبكة الصراع منه."),
});
export type GenerateConflictNetworkInput = z.infer<
  typeof GenerateConflictNetworkInputSchema
>;

const GenerateConflictNetworkOutputSchema = z.object({
  conflictNetworkJson: z
    .string()
    .describe(
      "سلسلة JSON تمثل شبكة الصراع، بما في ذلك الشخصيات والعلاقات والصراعات."
    ),
});
export type GenerateConflictNetworkOutput = z.infer<
  typeof GenerateConflictNetworkOutputSchema
>;

export async function generateConflictNetwork(
  input: GenerateConflictNetworkInput
): Promise<GenerateConflictNetworkOutput> {
  return generateConflictNetworkFlow(input);
}

const prompt = ai.definePrompt({
  name: "generateConflictNetworkPrompt",
  input: { schema: GenerateConflictNetworkInputSchema },
  output: { schema: GenerateConflictNetworkOutputSchema },
  prompt: `أنت خبير في تحليل النصوص الدرامية، متخصص في توليد شبكات الصراع.

  بناءً على النص المحلل المقدم، قم بإنشاء شبكة صراع تشمل الشخصيات والعلاقات والصراعات.
  أرجع شبكة الصراع كسلسلة JSON.

  النص المحلل: {{{analyzedText}}}
  \n  تأكد من أن JSON قابل للتحليل ويلتزم بتنسيق قياسي لتمثيل بيانات الرسم البياني، بما في ذلك العقد (الشخصيات) والحواف (العلاقات والصراعات).`,
});

const generateConflictNetworkFlow = ai.defineFlow(
  {
    name: "generateConflictNetworkFlow",
    inputSchema: GenerateConflictNetworkInputSchema,
    outputSchema: GenerateConflictNetworkOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
