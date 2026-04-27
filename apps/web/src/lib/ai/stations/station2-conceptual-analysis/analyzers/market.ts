import { GeminiModel, GeminiService } from "../../gemini-service";
import { toText } from "../../../utils/text-utils";
import { asJsonRecord, asNumber, asString, asStringArray } from "../json-helpers";
import type { Station2Context } from "../types";

export async function identifyTargetAudience(
  geminiService: GeminiService,
  context: Station2Context
): Promise<{
  primaryAudience: string;
  demographics: string[];
  psychographics: string[];
}> {
  const prompt = `
بناءً على السياق الدرامي:
- الشخصيات: ${context.majorCharacters.map((c) => c.name).join("، ")}
- النبرة: ${context.narrativeTone}
- الصراعات: ${context.conflictSummary}

حدد الجمهور المستهدف بدقة:

**المطلوب:**
1. **الجمهور الأساسي**: وصف موجز (مثال: "شباب بالغون 18-35 سنة")
2. **الخصائص الديموغرافية**: 3-5 خصائص (عمر، جنس، موقع، تعليم، دخل)
3. **الخصائص النفسية**: 3-5 خصائص (اهتمامات، قيم، نمط حياة)

**التنسيق:**
JSON صارم:
{
  "primaryAudience": "...",
  "demographics": ["...", "...", "..."],
  "psychographics": ["...", "...", "..."]
}
`;

  const result = await geminiService.generate<string>({
    prompt,
    model: GeminiModel.FLASH,
    temperature: 0.7,
  });

  try {
    const parsed = asJsonRecord(JSON.parse(toText(result.content)) as unknown);
    return {
      primaryAudience: asString(parsed.primaryAudience, "جمهور عام"),
      demographics: asStringArray(parsed.demographics),
      psychographics: asStringArray(parsed.psychographics),
    };
  } catch (error) {
    console.error("[Station2] Failed to parse target audience:", error);
    return {
      primaryAudience: "جمهور عام",
      demographics: ["بالغون", "كلا الجنسين"],
      psychographics: ["مهتمو الدراما"],
    };
  }
}

export async function analyzeMarketPotential(
  geminiService: GeminiService,
  hybridGenre: string,
  _context: Station2Context
): Promise<{
  producibility: number;
  commercialPotential: number;
  uniqueness: number;
}> {
  const prompt = `
للنوع الهجين: **"${hybridGenre}"**
والسياق الدرامي المتاح

قم بتقييم إمكانات السوق من خلال ثلاثة مؤشرات:

**المؤشرات المطلوبة (مقياس 1-10):**
1. **إمكانية الإنتاج** (Producibility):
   - سهولة التنفيذ التقني
   - متطلبات الموارد
   - التعقيد الإنتاجي

2. **الإمكانية التجارية** (Commercial Potential):
   - جاذبية السوق
   - حجم الجمهور المحتمل
   - فرص التوزيع

3. **الأصالة** (Uniqueness):
   - التميز عن الأعمال المشابهة
   - الابتكار في المفهوم
   - الجاذبية الفنية

**التنسيق:**
JSON صارم:
{
  "producibility": 7,
  "commercialPotential": 8,
  "uniqueness": 6
}
`;

  const result = await geminiService.generate<string>({
    prompt,
    model: GeminiModel.FLASH,
    temperature: 0.6,
  });

  try {
    const parsed = asJsonRecord(JSON.parse(toText(result.content)) as unknown);
    return {
      producibility: asNumber(parsed.producibility, 5),
      commercialPotential: asNumber(parsed.commercialPotential, 5),
      uniqueness: asNumber(parsed.uniqueness, 5),
    };
  } catch (error) {
    console.error("[Station2] Failed to parse market analysis:", error);
    return {
      producibility: 5,
      commercialPotential: 5,
      uniqueness: 5,
    };
  }
}
