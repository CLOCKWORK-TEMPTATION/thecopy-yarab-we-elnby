"use server";

/**
 * @fileOverview يعرض نتائج التحليل بصريًا، مع التركيز على شبكات الصراع وعلاقات الشخصيات والعناصر الموضوعية.
 *
 * @remarks
 * يأخذ هذا التدفق نتائج التحليل ويستخدم Gemini AI لإنشاء تصور لشبكات الصراع،
 * وعلاقات الشخصيات، والعناصر الموضوعية، مما يوفر تمثيلًا مرئيًا لتسهيل التفسير.
 *
 * @interface VisualizeAnalysisResultsInput - يحدد مخطط الإدخال لدالة visualizeAnalysisResults.
 * @interface VisualizeAnalysisResultsOutput - يحدد مخطط الإخراج لدالة visualizeAnalysisResults.
 * @function visualizeAnalysisResults - ينسق عرض نتائج التحليل.
 */

import { ai } from "@/ai/genkit";
import { z } from "genkit";

const VisualizeAnalysisResultsInputSchema = z.object({
  conflictNetwork: z.string().describe("سلسلة JSON لشبكة الصراع المراد عرضها."),
  characterRelationships: z
    .string()
    .describe("سلسلة JSON لعلاقات الشخصيات المراد عرضها."),
  thematicElements: z
    .string()
    .describe("سلسلة JSON للعناصر الموضوعية المراد عرضها."),
});

export type VisualizeAnalysisResultsInput = z.infer<
  typeof VisualizeAnalysisResultsInputSchema
>;

const VisualizeAnalysisResultsOutputSchema = z.object({
  visualization: z
    .string()
    .describe(
      "وصف للتصور، بما في ذلك شبكات الصراع وعلاقات الشخصيات والعناصر الموضوعية."
    ),
  mediaUrl: z
    .string()
    .optional()
    .describe("عنوان URI للبيانات للصورة المرئية التي تم إنشاؤها."),
});

export type VisualizeAnalysisResultsOutput = z.infer<
  typeof VisualizeAnalysisResultsOutputSchema
>;

const visualizeAnalysisResultsPrompt = ai.definePrompt({
  name: "visualizeAnalysisResultsPrompt",
  input: { schema: VisualizeAnalysisResultsInputSchema },
  output: { schema: VisualizeAnalysisResultsOutputSchema },
  prompt: `أنت خبير في تصور البيانات وتحليل النصوص الدرامية.

  بناءً على شبكة الصراع المقدمة وعلاقات الشخصيات والعناصر الموضوعية، قم بإنشاء وصف نصي لتصور يمثل نتائج التحليل بشكل فعال. اختياريًا، قم بإنشاء صورة لتصور الميزات الموصوفة، إن أمكن.

  شبكة الصراع: {{{conflictNetwork}}}
  علاقات الشخصيات: {{{characterRelationships}}}
  العناصر الموضوعية: {{{thematicElements}}}

  تأكد من أن التصور يركز على الصراعات والعلاقات والمواضيع الرئيسية الموجودة في النص.
  تأكد من استخراج الميزات المهمة. كن مفصلاً قدر الإمكان واستخدم أمثلة من المدخلات.
  إذا كنت قادرًا على إنشاء صورة، فاستجب بعنوان URI للبيانات للصورة.
`,
});

const visualizeAnalysisResultsFlow = ai.defineFlow(
  {
    name: "visualizeAnalysisResultsFlow",
    inputSchema: VisualizeAnalysisResultsInputSchema,
    outputSchema: VisualizeAnalysisResultsOutputSchema,
  },
  async (input) => {
    const { output } = await visualizeAnalysisResultsPrompt(input);
    return output!;
  }
);

export async function visualizeAnalysisResults(
  input: VisualizeAnalysisResultsInput
): Promise<VisualizeAnalysisResultsOutput> {
  return visualizeAnalysisResultsFlow(input);
}
