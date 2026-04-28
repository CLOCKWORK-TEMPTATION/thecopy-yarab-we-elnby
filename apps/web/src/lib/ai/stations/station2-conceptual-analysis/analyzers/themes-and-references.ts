import { GeminiModel, GeminiService } from "../../gemini-service";
import { safeSub, toText } from "../../../utils/text-utils";
import {
  getDefaultArtisticReferences,
  getDefaultThemeAnalysis,
} from "../defaults";
import {
  validateArtisticReferences,
  validateThemeAnalysis,
} from "../validators";
import type {
  ArtisticReferencesResult,
  Station2Context,
  ThemeAnalysis,
} from "../types";

export async function generateArtisticReferences(
  geminiService: GeminiService,
  hybridGenre: string,
  context: Station2Context
): Promise<ArtisticReferencesResult> {
  const prompt = `
للنوع الهجين: **"${hybridGenre}"**
والسياق الدرامي المتاح

اقترح **مراجع فنية شاملة** تشمل:

1. **مراجع بصرية (3-5 أعمال):**
   - لوحات فنية أو أعمال تصوير فوتوغرافي
   - سبب الاختيار وكيفية التطبيق على المشاهد

2. **المزاج الموسيقي:**
   - النمط الموسيقي العام
   - أمثلة لمؤلفين أو أعمال مرجعية

3. **تأثيرات سينمائية (3-5 أفلام):**
   - أفلام مرجعية مع أسماء المخرجين
   - الجانب المستوحى (إضاءة، إيقاع، بناء مشهد)

4. **موازيات أدبية (2-3 أعمال):**
   - أعمال أدبية ذات صلة
   - أوجه التشابه الثيمية أو الأسلوبية

**التنسيق:**
JSON صارم:
{
  "visualReferences": [
    {
      "work": "...",
      "artist": "...",
      "reason": "...",
      "sceneApplication": "..."
    }
  ],
  "musicalMood": "...",
  "cinematicInfluences": [
    {
      "film": "...",
      "director": "...",
      "aspect": "..."
    }
  ],
  "literaryParallels": [
    {
      "work": "...",
      "author": "...",
      "connection": "..."
    }
  ]
}
`;

  const result = await geminiService.generate<string>({
    prompt,
    context: safeSub(context.fullText, 0, 12000),
    model: GeminiModel.FLASH,
    temperature: 0.8,
  });

  try {
    const parsed: unknown = JSON.parse(toText(result.content));
    return validateArtisticReferences(parsed);
  } catch (error) {
    console.error("[Station2] Failed to parse artistic references:", error);
    return getDefaultArtisticReferences(hybridGenre);
  }
}

export async function analyzeThemes(
  geminiService: GeminiService,
  context: Station2Context
): Promise<ThemeAnalysis> {
  const prompt = `
بناءً على السياق الدرامي الكامل:

**السياق:**
${JSON.stringify(
  {
    characters: context.majorCharacters.map((c) => ({
      name: c.name,
      role: c.role,
    })),
    tone: context.narrativeTone,
    conflicts: context.conflictSummary,
  },
  null,
  2
)}

قم بتحليل **الثيمات (Themes)** بشكل شامل:

**المطلوب:**
1. **الثيمات الأساسية (3-5):**
   - اسم الثيمة
   - أدلة نصية تدعمها (3-5 أمثلة)
   - قوة الثيمة (1-10)
   - كيفية تطورها عبر السيناريو

2. **الثيمات الثانوية (2-4):**
   - اسم الثيمة
   - عدد مرات ظهورها

3. **اتساق الثيمات:**
   - مقياس من 1-10 لمدى اتساق الثيمات

**التنسيق:**
JSON صارم:
{
  "primaryThemes": [
    {
      "theme": "...",
      "evidence": ["...", "...", "..."],
      "strength": 8,
      "development": "..."
    }
  ],
  "secondaryThemes": [
    {
      "theme": "...",
      "occurrences": 5
    }
  ],
  "thematicConsistency": 8
}
`;

  const result = await geminiService.generate<string>({
    prompt,
    context: safeSub(context.fullText, 0, 20000),
    model: GeminiModel.FLASH,
    temperature: 0.7,
  });

  try {
    const parsed: unknown = JSON.parse(toText(result.content));
    return validateThemeAnalysis(parsed);
  } catch (error) {
    console.error("[Station2] Failed to parse theme analysis:", error);
    return getDefaultThemeAnalysis();
  }
}
