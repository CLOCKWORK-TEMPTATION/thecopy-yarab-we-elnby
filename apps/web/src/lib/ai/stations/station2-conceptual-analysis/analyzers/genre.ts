import { GeminiModel, GeminiService } from "../../gemini-service";
import { safeSub, toText } from "../../../utils/text-utils";
import { getDefaultGenreMatrix } from "../defaults";
import { validateGenreMatrix } from "../validators";
import type { GenreMatrixResult, Station2Context } from "../types";

export async function generateHybridGenre(
  geminiService: GeminiService,
  context: Station2Context
): Promise<string[]> {
  const prompt = `
بناءً على التحليل الشامل للنص:

**السياق:**
- الشخصيات: ${context.majorCharacters.map((c) => c.name).join("، ")}
- النبرة: ${context.narrativeTone}
- الصراعات: ${context.conflictSummary}
- جودة الحوار: ${context.dialogueQuality}/10

**المطلوب:**
اقترح **5 بدائل** لتركيبة نوع هجين (Hybrid Genre) دقيقة ومبتكرة.

**معايير الاقتراح:**
- دمج 2-3 أنواع رئيسية بطريقة منطقية
- تجنب الأنواع العامة جداً (مثل: "دراما")
- استخدم مصطلحات صناعة السينما المعاصرة
- ركز على الأنواع القابلة للتسويق

**أمثلة للتوضيح:**
- "Psychological Thriller مع عناصر Family Drama"
- "Dark Comedy بطابع Film Noir"
- "Social Realism مع لمسات Magical Realism"

**التنسيق:**
قدم كل بديل في سطر واحد، بدون ترقيم أو شرح إضافي.
`;

  const result = await geminiService.generate<string>({
    prompt,
    context: safeSub(context.fullText, 0, 20000),
    model: GeminiModel.FLASH,
    temperature: 0.85,
  });

  if (!result.content) {
    return ["دراما نفسية"];
  }

  const genres = toText(result.content)
    .split("\n")
    .filter((line) => line.trim().length > 5)
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .slice(0, 5);

  return genres.length > 0 ? genres : ["دراما معاصرة"];
}

export async function generateGenreMatrix(
  geminiService: GeminiService,
  hybridGenre: string,
  context: Station2Context
): Promise<GenreMatrixResult> {
  const prompt = `
للنوع الهجين المحدد: **"${hybridGenre}"**

قم بإنشاء **مصفوفة مساهمة النوع** تفصيلية توضح كيف يُثري كل نوع فرعي العناصر الخمسة التالية:

**العناصر المطلوب تحليلها:**
1. **الصراعات** (Conflict Structure)
2. **الإيقاع** (Pacing)
3. **التكوين البصري** (Visual Composition)
4. **الصوت والموسيقى** (Sound & Music)
5. **الشخصيات** (Characters)

**مثال للتوضيح:**
إذا كان النوع "Psychological Thriller + Family Drama"، فيجب تحليل:
- كيف يساهم "Psychological Thriller" في بناء الصراعات؟
- كيف يؤثر "Family Drama" على إيقاع السرد؟
- إلخ...

**التنسيق المطلوب:**
قدم JSON بدون أي نص إضافي:
{
  "النوع الأول": {
    "conflictContribution": "شرح تفصيلي",
    "pacingContribution": "شرح تفصيلي",
    "visualCompositionContribution": "شرح تفصيلي",
    "soundMusicContribution": "شرح تفصيلي",
    "charactersContribution": "شرح تفصيلي",
    "weight": 0.6
  },
  "النوع الثاني": {
    ...
    "weight": 0.4
  }
}

**ملاحظة:** weight يمثل الوزن النسبي للنوع في التركيبة الهجينة (مجموع الأوزان = 1).
`;

  const result = await geminiService.generate<string>({
    prompt,
    context: safeSub(context.fullText, 0, 15000),
    model: GeminiModel.FLASH,
    temperature: 0.75,
  });

  try {
    const parsed: unknown = JSON.parse(toText(result.content));
    return validateGenreMatrix(parsed);
  } catch (error) {
    console.error("[Station2] Failed to parse genre matrix:", error);
    return getDefaultGenreMatrix(hybridGenre);
  }
}
