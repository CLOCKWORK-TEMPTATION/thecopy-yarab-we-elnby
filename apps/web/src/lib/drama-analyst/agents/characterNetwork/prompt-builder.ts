/**
 * Prompt builder utilities for CharacterNetworkAgent
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
 * Build characters list section
 */
export function buildCharactersSection(characters: unknown[]): string {
  if (characters.length === 0) return "";

  let section = `الشخصيات في الشبكة:\n`;
  characters.slice(0, 8).forEach((char: unknown, idx: number) => {
    const charObj: { name?: string; role?: string } =
      typeof char === "object" && char !== null ? char : {};
    const charName =
      typeof char === "string" ? char : (charObj.name ?? `شخصية ${idx + 1}`);
    const charRole =
      typeof char === "object" && charObj.role ? ` - ${charObj.role}` : "";
    section += `${idx + 1}. ${charName}${charRole}\n`;
  });
  section += "\n";
  return section;
}

/**
 * Build focus characters section
 */
export function buildFocusCharactersSection(focusCharacters: string[]): string {
  if (focusCharacters.length === 0) return "";
  return `شخصيات للتركيز عليها: ${focusCharacters.join("، ")}\n\n`;
}

/**
 * Build analysis options section
 */
interface AnalysisOptionsSectionInput {
  analyzeEvolution: boolean;
  identifyGroups: boolean;
  mapPowerDynamics: boolean;
  relationshipTypes: string[];
  trackInfluence: boolean;
  translateFn: (type: string) => string;
}

export function buildAnalysisOptionsSection({
  analyzeEvolution,
  identifyGroups,
  mapPowerDynamics,
  relationshipTypes,
  trackInfluence,
  translateFn,
}: AnalysisOptionsSectionInput): string {
  let section = `أنواع العلاقات للتحليل: ${relationshipTypes.map(translateFn).join("، ")}\n`;
  section += `تحليل التطور: ${analyzeEvolution ? "نعم" : "لا"}\n`;
  section += `تتبع النفوذ: ${trackInfluence ? "نعم" : "لا"}\n`;
  section += `تحديد المجموعات: ${identifyGroups ? "نعم" : "لا"}\n`;
  section += `رسم ديناميكيات القوة: ${mapPowerDynamics ? "نعم" : "لا"}\n\n`;
  return section;
}

/**
 * Build conditional instructions sections
 */
export function buildConditionalInstructions(
  analyzeEvolution: boolean,
  identifyGroups: boolean,
  mapPowerDynamics: boolean,
  trackInfluence: boolean
): string {
  let instructions = "";

  if (analyzeEvolution) {
    instructions += `4. **تطور العلاقات**:
   - كيف تتغير العلاقات الرئيسية عبر النص
   - نقاط التحول في العلاقات
   - العوامل المؤثرة في التغيير

`;
  }

  if (identifyGroups) {
    instructions += `5. **المجموعات والتحالفات**:
   - المجموعات أو الفصائل الموجودة
   - أساس التجمع (عائلة، طبقة، مصلحة، عقيدة)
   - العلاقات بين المجموعات

`;
  }

  if (mapPowerDynamics) {
    instructions += `6. **ديناميكيات القوة والنفوذ**:
   - من يملك السلطة والنفوذ
   - كيف تُمارس هذه السلطة
   - توازنات القوى والتبعيات

`;
  }

  if (trackInfluence) {
    instructions += `7. **خطوط التأثير**:
   - من يؤثر على من
   - آليات التأثير (إقناع، إجبار، إلهام، تلاعب)
   - سلاسل التأثير غير المباشر

`;
  }

  return instructions;
}

/**
 * Get base instructions template
 */
export function getBaseInstructions(): string {
  return `التعليمات:

1. **نظرة عامة على الشبكة** (3-4 جمل):
   - عدد الشخصيات الرئيسية والثانوية
   - الطابع العام للعلاقات (متماسكة، متشابكة، معزولة)
   - المركزية والهامشية في الشبكة

2. **الشخصيات المركزية** (Hub Characters):
   - من هم الشخصيات الأكثر ارتباطاً
   - دورهم في ربط الشبكة
   - تأثيرهم على الأحداث

3. **العلاقات الثنائية الرئيسية**:
   لكل علاقة مهمة، حدد:
   - **الأطراف**: من ومن
   - **نوع العلاقة**: عائلية، رومانسية، مهنية، صداقة، عدائية
   - **طبيعة العلاقة**: متوازنة، سلطوية، متبادلة، أحادية الاتجاه
   - **قوة الرابطة**: قوية، متوسطة، ضعيفة، متقلبة
   - **الديناميكية**: ثابتة، متطورة، متدهورة، متحسنة
   - **الأدلة النصية**: مشاهد أو لحظات تبرز هذه العلاقة

`;
}

/**
 * Get closing instructions
 */
export function getClosingInstructions(): string {
  return `8. **العزلة والاتصال**:
   - شخصيات معزولة أو منفصلة
   - شخصيات تربط بين مجموعات منفصلة (Bridges)
   - الفراغات أو الفجوات في الشبكة

9. **الوظيفة السردية**:
   - كيف تخدم هذه الشبكة الحبكة
   - ماذا تكشف عن الثيمات والرسائل
   - التعقيد والعمق الذي تضيفه

10. **الرسم البياني الوصفي**:
    - وصف نصي لبنية الشبكة (مركزية، موزعة، هرمية، دائرية)
    - المحاور الرئيسية للاتصال
    - النقاط الحرجة في الشبكة

اكتب بشكل نصي تحليلي واضح مع أسماء الشخصيات وأمثلة محددة.
استخدم أسهم نصية (→ ← ↔) لتوضيح اتجاهات التأثير عند الحاجة.
لا تستخدم JSON أو رسومات معقدة - وصف نصي مفصل فقط.`;
}
