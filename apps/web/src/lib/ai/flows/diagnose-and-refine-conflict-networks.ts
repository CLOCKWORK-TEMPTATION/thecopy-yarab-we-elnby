"use server";
/**
 * @fileOverview يحدد هذا الملف تدفق Genkit لتشخيص وتحسين شبكات الصراع في النصوص الدرامية.
 *
 * يأخذ التدفق شبكة صراع كمدخل، ويستخدم Gemini AI لتشخيص المشكلات المحتملة،
 * ويقترح تحسينات لتحسين الشبكة واكتشاف الصراعات المحتملة.
 *
 * - diagnoseAndRefineConflictNetwork - الدالة الرئيسية لبدء عملية التشخيص والتحسين.
 * - DiagnoseAndRefineConflictNetworkInput - نوع الإدخال لدالة diagnoseAndRefineConflictNetwork.
 * - DiagnoseAndRefineConflictNetworkOutput - نوع الإخراج لدالة diagnoseAndRefineConflictNetwork.
 */

import { ai } from "@/ai/genkit";
import { z } from "genkit";

// تحديد مخطط الشخصية والعلاقة والصراع. هذه مبسطة
// نظرًا لعدم تقديم التعريفات الكاملة في الطلب، لكنها ضرورية
// لتعريف مخطط شبكة الصراع.
const CharacterSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const RelationshipSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  type: z.string(),
});

const ConflictSchema = z.object({
  id: z.string(),
  description: z.string(),
  involvedCharacters: z.array(z.string()),
});

const ConflictNetworkSchema = z.object({
  id: z.string(),
  name: z.string(),
  characters: z.array(CharacterSchema),
  relationships: z.array(RelationshipSchema),
  conflicts: z.array(ConflictSchema),
  metadata: z.record(z.any()).optional(),
});

export type ConflictNetwork = z.infer<typeof ConflictNetworkSchema>;

const DiagnoseAndRefineConflictNetworkInputSchema = z.object({
  conflictNetwork: ConflictNetworkSchema.describe(
    "شبكة الصراع المراد تشخيصها وتحسينها."
  ),
});
export type DiagnoseAndRefineConflictNetworkInput = z.infer<
  typeof DiagnoseAndRefineConflictNetworkInputSchema
>;

const DiagnoseAndRefineConflictNetworkOutputSchema = z.object({
  diagnosis: z
    .string()
    .describe(
      "تشخيص شبكة الصراع، بما في ذلك المشكلات المحتملة ومجالات التحسين."
    ),
  refinedNetwork: ConflictNetworkSchema.describe(
    "شبكة الصراع المحسنة مع التحسينات المقترحة."
  ),
});
export type DiagnoseAndRefineConflictNetworkOutput = z.infer<
  typeof DiagnoseAndRefineConflictNetworkOutputSchema
>;

export async function diagnoseAndRefineConflictNetwork(
  input: DiagnoseAndRefineConflictNetworkInput
): Promise<DiagnoseAndRefineConflictNetworkOutput> {
  return diagnoseAndRefineConflictNetworkFlow(input);
}

const diagnoseAndRefineConflictNetworkPrompt = ai.definePrompt({
  name: "diagnoseAndRefineConflictNetworkPrompt",
  input: { schema: DiagnoseAndRefineConflictNetworkInputSchema },
  output: { schema: DiagnoseAndRefineConflictNetworkOutputSchema },
  prompt: `أنت خبير في تحليل النصوص الدرامية، متخصص في شبكات الصراع.
  مهمتك هي تشخيص وتحسين شبكة الصراع المقدمة لتحسين هيكلها واكتشاف الصراعات المحتملة.

  حلل شبكة الصراع التالية:
  الشخصيات: {{#each conflictNetwork.characters}}{{@index}}: {{this.name}} (المعرف: {{this.id}})
  {{/each}}
  العلاقات: {{#each conflictNetwork.relationships}}{{@index}}: المصدر: {{this.source}}، الهدف: {{this.target}}، النوع: {{this.type}}
  {{/each}}
  الصراعات: {{#each conflictNetwork.conflicts}}{{@index}}: {{this.description}} (الشخصيات المشاركة: {{this.involvedCharacters}})
  {{/each}}

  قدم تشخيصًا للشبكة، وحدد أي مشكلات محتملة مثل العلاقات المفقودة، أو الصراعات غير الواضحة، أو التناقضات.
  اقترح تحسينات على الشبكة لمعالجة هذه المشكلات وتحسين جودتها الإجمالية. يجب أن تتضمن الشبكة المحسنة البيانات الأصلية، بالإضافة إلى التغييرات المقترحة. انتبه جيدًا للصراعات المحتملة التي لم يتم ذكرها صراحة في قائمة الصراع. يجب إضافة هذه الصراعات المحتملة إلى قائمة الصراع.

  نسق الشبكة المحسنة تمامًا مثل الأصلية، بما في ذلك جميع المعرفات.

  التشخيص:
  {{diagnosis}}

  الشبكة المحسنة:
  {{refinedNetwork}}
  `,
});

const diagnoseAndRefineConflictNetworkFlow = ai.defineFlow(
  {
    name: "diagnoseAndRefineConflictNetworkFlow",
    inputSchema: DiagnoseAndRefineConflictNetworkInputSchema,
    outputSchema: DiagnoseAndRefineConflictNetworkOutputSchema,
  },
  async (input) => {
    const { output } = await diagnoseAndRefineConflictNetworkPrompt(input);
    return output!;
  }
);
