import type { DebateArgument, DebateRound } from "./multi-agent-debate-models";

export function buildPreviousRoundsContext(
  previousRounds: DebateRound[]
): string {
  if (previousRounds.length === 0) {
    return "";
  }

  let debateContext = "\n\nالجولات السابقة:\n";
  previousRounds.forEach((round, index) => {
    debateContext += `\nجولة ${index + 1}:\n`;
    debateContext += `المدعي: ${round.prosecutorArgument.argument.substring(0, 200)}...\n`;
    debateContext += `المدافع: ${round.defenderArgument.argument.substring(0, 200)}...\n`;
  });
  return debateContext;
}

export function buildProsecutorPrompt(
  text: string,
  analysis: string,
  debateContext: string
): string {
  return `
أنت المدعي الناقد في نقاش علمي حول جودة التحليل.
مهمتك: تحديد نقاط الضعف والأخطاء والتحيزات في التحليل المقدم.

النص الأصلي:
"""
 ${text.substring(0, 2000)}
"""

التحليل المقدم:
"""
 ${analysis.substring(0, 2000)}
"""

 ${debateContext}

قدم حجتك النقدية مع التركيز على:
1. **الأخطاء المنطقية**: هل هناك تناقضات أو قفزات منطقية؟
2. **التحيزات**: هل يظهر التحليل تحيزاً معيناً؟
3. **النقاط غير المدعومة**: ادعاءات بدون دليل كافٍ
4. **الإغفالات**: جوانب مهمة لم يتطرق لها التحليل

قدم إجابتك بالصيغة التالية:
الحجة: [حجتك النقدية الرئيسية]
الأدلة: 
- [دليل 1]
- [دليل 2]
- [دليل 3]
قوة الحجة: [رقم من 0 إلى 10]
`;
}

export function buildDefenderPrompt(
  text: string,
  analysis: string,
  prosecutorArgument: string,
  debateContext: string
): string {
  return `
أنت المدافع البناء في نقاش علمي حول جودة التحليل.
مهمتك: إبراز نقاط القوة والرد على اتهامات المدعي بشكل موضوعي.

النص الأصلي:
"""
 ${text.substring(0, 2000)}
"""

التحليل المقدم:
"""
 ${analysis.substring(0, 2000)}
"""

حجة المدعي:
"""
 ${prosecutorArgument}
"""

 ${debateContext}

قدم دفاعك مع التركيز على:
1. **نقاط القوة**: ما الجيد في هذا التحليل؟
2. **الرد على الاتهامات**: رد موضوعي على نقاط المدعي
3. **السياق المفقود**: جوانب لم يأخذها المدعي بعين الاعتبار
4. **القيمة الإجمالية**: ما القيمة التي يضيفها هذا التحليل؟

قدم إجابتك بالصيغة التالية:
الحجة: [حجتك الدفاعية الرئيسية]
الأدلة:
- [دليل 1]
- [دليل 2]
- [دليل 3]
قوة الحجة: [رقم من 0 إلى 10]
`;
}

export function buildJudgePrompt(
  prosecutorArg: DebateArgument,
  defenderArg: DebateArgument
): string {
  return `
أنت القاضي الموضوعي في نقاش علمي.
مهمتك: تقييم حجج الطرفين بموضوعية والتعليق على الجولة.

حجة المدعي:
 ${prosecutorArg.argument}

حجة المدافع:
 ${defenderArg.argument}

قدم تعليقاً موجزاً (3-4 جمل) يتضمن:
1. تقييم قوة كل حجة
2. النقاط الصحيحة من كل طرف
3. ما الذي نتفق عليه حتى الآن؟
`;
}

export function buildVerdictPrompt(rounds: DebateRound[]): string {
  let debateSummary = "ملخص النقاش:\n\n";
  rounds.forEach((round, index) => {
    debateSummary += `جولة ${index + 1}:\n`;
    debateSummary += `- المدعي: ${round.prosecutorArgument.argument.substring(0, 150)}...\n`;
    debateSummary += `- المدافع: ${round.defenderArgument.argument.substring(0, 150)}...\n`;
    debateSummary += `- تعليق القاضي: ${round.judgeComments.substring(0, 100)}...\n\n`;
  });

  return `
بصفتك القاضي الموضوعي، قدم حكمك النهائي على التحليل بناءً على النقاش الكامل.

 ${debateSummary}

قدم حكمك بالصيغة التالية (JSON):
{
  "consensusAreas": [
    {
      "aspect": "الجانب المتفق عليه",
      "agreement": "وصف الاتفاق",
      "confidence": 0.9
    }
  ],
  "disputedAreas": [
    {
      "aspect": "الجانب الخلافي",
      "prosecutorView": "رأي المدعي",
      "defenderView": "رأي المدافع",
      "judgeOpinion": "رأيك كقاضي",
      "resolution": "الحل المقترح"
    }
  ],
  "finalVerdict": {
    "overallAssessment": "تقييم شامل للتحليل",
    "strengths": ["نقطة قوة 1", "نقطة قوة 2"],
    "weaknesses": ["نقطة ضعف 1", "نقطة ضعف 2"],
    "recommendations": ["توصية 1", "توصية 2"],
    "confidence": 0.85
  }
}
`;
}
