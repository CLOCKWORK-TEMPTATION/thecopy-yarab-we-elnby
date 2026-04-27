import { GeminiModel, GeminiService } from "../../gemini-service";
import { safeSub, toText } from "../../../utils/text-utils";
import type { Station2Context } from "../types";

export async function generateStoryStatements(
  geminiService: GeminiService,
  context: Station2Context
): Promise<string[]> {
  const prompt = `
بصفتك خبير تحليل درامي، قم بصياغة **ثلاثة (3)** بيانات قصة (Story Statements) متميزة ومحكمة البناء.

**السياق المتاح:**
- الشخصيات الرئيسية: ${context.majorCharacters.map((c) => c.name).join("، ")}
- العلاقات الأساسية: ${context.relationshipSummary}
- الصراعات: ${context.conflictSummary}
- النبرة السردية: ${context.narrativeTone}
- ملخص القصة: ${context.logline}

**متطلبات كل بيان (4 جمل):**
1. **الحدث المحوري**: الحدث الجامع أو نقطة الانطلاق الدرامية
2. **الصراعات المتشابكة**: الدوافع المتقاطعة والتوترات المركزية
3. **العالم القصصي**: السياق الفريد والبيئة الدرامية المميزة
4. **السؤال الفلسفي**: الثيمة الجامعة أو القضية الفكرية المطروحة

**التنسيق المطلوب:**
قدم الإجابة كنص عادي، كل بيان في فقرة منفصلة بدون ترقيم أو عناوين.
كل فقرة يجب أن تحتوي على 4 جمل متماسكة ومترابطة.

**ملاحظة مهمة:**
- استخدم لغة سينمائية قوية ومباشرة
- تجنب التعميمات والعبارات المبهمة
- ركز على التفاصيل الدرامية الملموسة
- اجعل كل بيان يقدم زاوية مختلفة للقصة
`;

  const result = await geminiService.generate<string>({
    prompt,
    context: safeSub(context.fullText, 0, 30000),
    model: GeminiModel.FLASH,
    temperature: 0.85,
  });

  if (!result.content) {
    return ["فشل توليد بيان القصة"];
  }

  const statements = toText(result.content)
    .split("\n\n")
    .filter((s) => s.trim().length > 50)
    .slice(0, 3);

  return statements.length > 0 ? statements : ["فشل توليد بيانات قصة متعددة"];
}

export async function generateElevatorPitch(
  geminiService: GeminiService,
  storyStatement: string,
  context: Station2Context
): Promise<string> {
  const prompt = `
بناءً على:
- **بيان القصة**: "${storyStatement}"
- **الشخصيات**: ${context.majorCharacters.map((c) => c.name).join("، ")}
- **النبرة**: ${context.narrativeTone}

صغ **Elevator Pitch** احترافي وجذاب:
- لا يتجاوز 40 كلمة
- يركز على الصراع المحوري
- يثير الفضول والتشويق
- يستهدف المنتجين/الممولين

قدم النص فقط بدون مقدمات أو تنسيقات.
`;

  const result = await geminiService.generate<string>({
    prompt,
    model: GeminiModel.FLASH,
    temperature: 0.9,
  });

  return toText(result.content) || "فشل توليد العرض المختصر";
}
