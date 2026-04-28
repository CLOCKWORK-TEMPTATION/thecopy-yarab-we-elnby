import { safeSub, toText } from "../../../utils/text-utils";
import { GeminiModel, GeminiService } from "../../gemini-service";
import { getDefault3DMap, getDefaultDynamicTone } from "../defaults";
import { validate3DMap, validateDynamicTone } from "../validators";

import type {
  DynamicToneResult,
  Station2Context,
  ThreeDMapResult,
} from "../types";

export async function generate3DMap(
  geminiService: GeminiService,
  context: Station2Context
): Promise<ThreeDMapResult> {
  const prompt = `
قم بإنشاء **خريطة ثلاثية الأبعاد (3D Map)** شاملة للبنية الدرامية بناءً على السياق التالي:

**السياق:**
${JSON.stringify(
  {
    characters: context.majorCharacters.map((c) => c.name),
    relationships: context.relationshipSummary,
    conflicts: context.conflictSummary,
    tone: context.narrativeTone,
  },
  null,
  2
)}

**المحاور الثلاثة المطلوبة:**

1. **المحور الأفقي (الأحداث):**
   قدم قائمة بالأحداث الرئيسية مرتبة زمنياً، مع:
   - اسم الحدث (موجز ووصفي)
   - إشارة للمشهد المقابل (إن أمكن)
   - الوزن السردي (1-10)

2. **المحور العمودي (المعنى):**
   لكل حدث رئيسي، حدد:
   - الطبقة الرمزية أو الثيمة المرتبطة
   - العمق الفلسفي أو النفسي
   - الصلة بالثيمات الأساسية

3. **المحور الزمني (التطور):**
   حلل:
   - تأثير الماضي على الحاضر
   - الخيارات الحالية وعواقبها
   - توقعات المستقبل
   - الصلة بقوس تطور البطل
   - السببية (كيف يؤدي حدث لآخر)

**التنسيق:**
قدم إجابة JSON صارمة بدون أي نص إضافي:
{
  "horizontalEventsAxis": [
    {
      "event": "...",
      "sceneRef": "...",
      "timestamp": "...",
      "narrativeWeight": 8
    }
  ],
  "verticalMeaningAxis": [
    {
      "eventRef": "...",
      "symbolicLayer": "...",
      "thematicConnection": "...",
      "depth": 7
    }
  ],
  "temporalDevelopmentAxis": {
    "pastInfluence": "...",
    "presentChoices": "...",
    "futureExpectations": "...",
    "heroArcConnection": "...",
    "causality": "..."
  }
}
`;

  const result = await geminiService.generate<string>({
    prompt,
    context: safeSub(context.fullText, 0, 25000),
    model: GeminiModel.FLASH,
    temperature: 0.7,
  });

  try {
    const parsed: unknown = JSON.parse(toText(result.content));
    return validate3DMap(parsed);
  } catch (error) {
    console.error("[Station2] Failed to parse 3D Map:", error);
    return getDefault3DMap();
  }
}

export async function generateDynamicTone(
  geminiService: GeminiService,
  hybridGenre: string,
  context: Station2Context
): Promise<DynamicToneResult> {
  const prompt = `
للنوع الهجين: **"${hybridGenre}"**
والنبرة السردية: **"${context.narrativeTone}"**

حلل **النبرة الديناميكية (Dynamic Tone)** عبر مراحل السيناريو الثلاث.

**المراحل المطلوبة:**
1. **الفصل الأول (Setup)**
2. **الفصل الثاني (Confrontation)**
3. **الفصل الثالث (Resolution)**

**لكل مرحلة، قدم:**
- **الجو البصري** (Visual Atmosphere): الإضاءة، الألوان، التكوين
- **الإيقاع الكتابي** (Written Pacing): سرعة السرد، طول المشاهد
- **بنية الحوار** (Dialogue Structure): كثافة الحوار، نمطه
- **التوجيهات الصوتية** (Sound Indications): الموسيقى، المؤثرات
- **الكثافة العاطفية** (Emotional Intensity): مقياس من 1-10

**التنسيق:**
JSON صارم بدون أي نص إضافي:
{
  "setup": {
    "visualAtmosphereDescribed": "...",
    "writtenPacing": "...",
    "dialogueStructure": "...",
    "soundIndicationsDescribed": "...",
    "emotionalIntensity": 5
  },
  "confrontation": {...},
  "resolution": {...}
}
`;

  const result = await geminiService.generate<string>({
    prompt,
    context: safeSub(context.fullText, 0, 15000),
    model: GeminiModel.FLASH,
    temperature: 0.7,
  });

  try {
    const parsed: unknown = JSON.parse(toText(result.content));
    return validateDynamicTone(parsed);
  } catch (error) {
    console.error("[Station2] Failed to parse dynamic tone:", error);
    return getDefaultDynamicTone(context);
  }
}
