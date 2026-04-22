/**
 * Prompt builder utilities for TensionOptimizerAgent
 * Extracted to reduce buildPrompt complexity
 */

/**
 * Build original text section
 */
export function buildOriginalTextSection(originalText: string): string {
  if (!originalText) return "";
  return `النص المراد تحليله:\n${originalText.substring(0, 2500)}...\n\n`;
}

/**
 * Build scene breakdown section
 */
export function buildSceneBreakdownSection(sceneBreakdown: any[]): string {
  if (sceneBreakdown.length === 0) return "";

  let section = `تفصيل المشاهد:\n`;
  sceneBreakdown.slice(0, 5).forEach((scene: any, idx: number) => {
    const sceneDesc =
      typeof scene === "string"
        ? scene
        : scene.description || `مشهد ${idx + 1}`;
    section += `${idx + 1}. ${sceneDesc}\n`;
  });
  section += "\n";
  return section;
}

/**
 * Build tension information section
 */
export function buildTensionInfoSection(
  currentLevel: string,
  targetLevel: string,
  tensionType: string,
  pacePreference: string,
  identifyPeaks: boolean,
  analyzeRelease: boolean,
  provideRecommendations: boolean,
  translateLevel: (level: string) => string,
  translateTensionType: (type: string) => string,
  translatePace: (pace: string) => string
): string {
  let section = `معلومات التوتر:\n`;
  section += `- المستوى الحالي: ${translateLevel(currentLevel)}\n`;
  section += `- المستوى المستهدف: ${translateLevel(targetLevel)}\n`;
  section += `- نوع التوتر: ${translateTensionType(tensionType)}\n`;
  section += `- تفضيل الوتيرة: ${translatePace(pacePreference)}\n`;
  section += `- تحديد القمم: ${identifyPeaks ? "نعم" : "لا"}\n`;
  section += `- تحليل التحرر: ${analyzeRelease ? "نعم" : "لا"}\n`;
  section += `- تقديم توصيات: ${provideRecommendations ? "نعم" : "لا"}\n\n`;
  return section;
}

/**
 * Get base instructions template
 */
export function getBaseInstructions(): string {
  return `التعليمات:

1. **تقييم التوتر الحالي** (3-4 جمل):
   - حدد مستوى التوتر العام في النص
   - أين يكون التوتر فعالاً وأين يكون ضعيفاً
   - مدى ملاءمة التوتر للنوع الدرامي والجمهور

2. **تحليل منحنى التوتر**:
   - كيف يتطور التوتر عبر النص
   - الارتفاعات والانخفاضات
   - التدرج والتصاعد
   - العلاقة بين التوتر وبنية الحبكة

`;
}

/**
 * Build conditional instructions sections
 */
export function buildConditionalInstructions(
  identifyPeaks: boolean,
  analyzeRelease: boolean,
  provideRecommendations: boolean
): string {
  let instructions = "";

  if (identifyPeaks) {
    instructions += `3. **نقاط الذروة** (Tension Peaks):
   - حدد اللحظات ذات التوتر الأقصى
   - ما الذي يجعلها فعالة (أو غير فعالة)
   - توقيتها في البنية السردية
   - مدى إشباعها للتوقعات

`;
  }

  if (analyzeRelease) {
    instructions += `4. **لحظات التحرر** (Tension Release):
   - أين وكيف يتم تخفيف التوتر
   - هل التحرر مناسب أم سابق لأوانه
   - التوازن بين البناء والتحرر
   - الفرص الضائعة لتعزيز التوتر

`;
  }

  if (provideRecommendations) {
    instructions += `7. **التوصيات والتحسينات**:
   - كيفية رفع مستوى التوتر إلى المستوى المستهدف
   - مواضع محددة تحتاج تعزيز
   - تقنيات يمكن تطبيقها
   - أمثلة على تعديلات محتملة
   - تحذيرات من الإفراط أو المبالغة

`;
  }

  return instructions;
}

/**
 * Get middle instructions
 */
export function getMiddleInstructions(): string {
  return `5. **تقنيات بناء التوتر المستخدمة**:
   - التأخير والتعليق (Suspense)
   - المعلومات الناقصة (Mystery)
   - تصاعد الصراع
   - ضيق الوقت (Ticking Clock)
   - الرهانات المتزايدة (Rising Stakes)
   - التضارب والتناقض
   - التنبؤ والتلميح (Foreshadowing)

6. **تحليل الوتيرة والإيقاع**:
   - سرعة تصاعد التوتر
   - التوازن بين لحظات الهدوء والتوتر
   - الإيقاع العام (بطيء، سريع، متقطع)

`;
}

/**
 * Get closing instructions
 */
export function getClosingInstructions(): string {
  return `8. **التقييم النهائي**:
   - فعالية التوتر الحالي (درجة من 10)
   - الإمكانات غير المستغلة
   - التوقعات للقارئ/المشاهد

اكتب بشكل نصي تحليلي مباشر مع أمثلة محددة من النص.
لا تستخدم JSON أو رسوم بيانية معقدة - تحليل نصي واضح فقط.`;
}
