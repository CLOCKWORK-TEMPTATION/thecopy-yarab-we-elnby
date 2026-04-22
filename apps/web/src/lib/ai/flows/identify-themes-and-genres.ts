"use server";
/**
 * @fileOverview يحدد المواضيع والأنواع الموجودة في نص درامي.
 *
 * - identifyThemesAndGenres - دالة تعالج تحديد المواضيع والأنواع.
 * - IdentifyThemesAndGenresInput - نوع الإدخال لدالة identifyThemesAndGenres.
 * - IdentifyThemesAndGenresOutput - نوع الإخراج لدالة identifyThemesAndGenres.
 */

import { ai } from "@/ai/genkit";
import { z } from "genkit";

const IdentifyThemesAndGenresInputSchema = z.object({
  text: z.string().describe("النص الدرامي المراد تحليله."),
});
export type IdentifyThemesAndGenresInput = z.infer<
  typeof IdentifyThemesAndGenresInputSchema
>;

const IdentifyThemesAndGenresOutputSchema = z.object({
  themes: z.array(z.string()).describe("المواضيع الموجودة في النص."),
  genres: z.array(z.string()).describe("أنواع النص."),
});
export type IdentifyThemesAndGenresOutput = z.infer<
  typeof IdentifyThemesAndGenresOutputSchema
>;

export async function identifyThemesAndGenres(
  input: IdentifyThemesAndGenresInput
): Promise<IdentifyThemesAndGenresOutput> {
  return identifyThemesAndGenresFlow(input);
}

const prompt = ai.definePrompt({
  name: "identifyThemesAndGenresPrompt",
  input: { schema: IdentifyThemesAndGenresInputSchema },
  output: { schema: IdentifyThemesAndGenresOutputSchema },
  prompt: `أنت خبير في تحليل النصوص الدرامية.
  مهمتك هي تحديد المواضيع والأنواع الموجودة في النص المحدد.
  أرجع المواضيع والأنواع كمصفوفات من السلاسل النصية.

  النص: {{{text}}}
  المواضيع:
  الأنواع:`,
  config: {
    model: "googleai/gemini-1.5-pro-latest",
  },
});

const identifyThemesAndGenresFlow = ai.defineFlow(
  {
    name: "identifyThemesAndGenresFlow",
    inputSchema: IdentifyThemesAndGenresInputSchema,
    outputSchema: IdentifyThemesAndGenresOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
