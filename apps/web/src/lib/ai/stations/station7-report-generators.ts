/**
 * @fileoverview Human-readable, Markdown, and JSON report generators for Station 7.
 * Extracted from station7-finalization.ts to keep each file ≤ 500 lines.
 */

import type { ScoreMatrix, Station7Output } from "./station7-types";

// ---------------------------------------------------------------------------
// JSON report
// ---------------------------------------------------------------------------

export function generateJsonReport(output: Station7Output): string {
  const { finalReport, scoreMatrix } = output;
  const report = {
    executiveSummary: finalReport.executiveSummary,
    overallAssessment: {
      narrativeQualityScore:
        finalReport.overallAssessment.narrativeQualityScore,
      structuralIntegrityScore:
        finalReport.overallAssessment.structuralIntegrityScore,
      characterDevelopmentScore:
        finalReport.overallAssessment.characterDevelopmentScore,
      conflictEffectivenessScore:
        finalReport.overallAssessment.conflictEffectivenessScore,
      overallScore: finalReport.overallAssessment.overallScore,
      rating: finalReport.overallAssessment.rating,
    },
    strengthsAnalysis: finalReport.strengthsAnalysis,
    weaknessesIdentified: finalReport.weaknessesIdentified,
    opportunitiesForImprovement: finalReport.opportunitiesForImprovement,
    threatsToCohesion: finalReport.threatsToCoherence,
    detailedFindings: {
      scoreMatrix,
      audienceResonance: finalReport.audienceResonance,
      finalRecommendations: finalReport.finalRecommendations,
    },
  };
  return JSON.stringify(report, null, 2);
}

// ---------------------------------------------------------------------------
// Human-readable report
// ---------------------------------------------------------------------------

export function generateHumanReadableReport(output: Station7Output): string {
  const { finalReport, scoreMatrix, metadata } = output;

  return `
تقرير التحليل الدرامي الشامل
=====================================

تاريخ التحليل: ${metadata.analysisTimestamp.toISOString()}
وقت التنفيذ: ${(metadata.totalExecutionTime / 1000).toFixed(2)} ثانية
المحطات المكتملة: ${metadata.stationsCompleted}
النموذج المستخدم: ${metadata.modelUsed}
إجمالي التوكنات: ${metadata.tokensUsed.toLocaleString()}

=====================================
الملخص التنفيذي
=====================================
${finalReport.executiveSummary}

=====================================
التقييم الشامل
=====================================
النتيجة الإجمالية: ${finalReport.overallAssessment.overallScore}/100
التصنيف: ${finalReport.overallAssessment.rating}

جودة السرد: ${finalReport.overallAssessment.narrativeQualityScore}/100
سلامة البنية: ${finalReport.overallAssessment.structuralIntegrityScore}/100
تطوير الشخصيات: ${finalReport.overallAssessment.characterDevelopmentScore}/100
فعالية الصراع: ${finalReport.overallAssessment.conflictEffectivenessScore}/100
العمق الموضوعي: ${finalReport.overallAssessment.thematicDepthScore}/100

${formatScoreMatrixText(scoreMatrix)}

=====================================
نقاط القوة
=====================================
${finalReport.strengthsAnalysis.map((s, i) => `${i + 1}. ${s}`).join("\n")}

=====================================
نقاط الضعف
=====================================
${finalReport.weaknessesIdentified.map((w, i) => `${i + 1}. ${w}`).join("\n")}

=====================================
فرص التحسين
=====================================
${finalReport.opportunitiesForImprovement.map((o, i) => `${i + 1}. ${o}`).join("\n")}

=====================================
التهديدات للتماسك
=====================================
${finalReport.threatsToCoherence.map((t, i) => `${i + 1}. ${t}`).join("\n")}

=====================================
صدى الجمهور المتوقع
=====================================
التأثير العاطفي: ${finalReport.audienceResonance.emotionalImpact}/10
التفاعل الفكري: ${finalReport.audienceResonance.intellectualEngagement}/10
القابلية للارتباط: ${finalReport.audienceResonance.relatability}/10
قابلية التذكر: ${finalReport.audienceResonance.memorability}/10
الإمكانات الفيروسية: ${finalReport.audienceResonance.viralPotential}/10

الاستجابة الأولية المتوقعة:
${finalReport.audienceResonance.primaryResponse}

=====================================
التوصيات النهائية
=====================================

يجب عمله (Must Do):
${finalReport.finalRecommendations.mustDo.map((r, i) => `${i + 1}. ${r}`).join("\n")}

ينبغي عمله (Should Do):
${finalReport.finalRecommendations.shouldDo.map((r, i) => `${i + 1}. ${r}`).join("\n")}

يمكن عمله (Could Do):
${finalReport.finalRecommendations.couldDo.map((r, i) => `${i + 1}. ${r}`).join("\n")}

=====================================
اقتراحات إعادة الكتابة (أعلى ${Math.min(5, finalReport.rewritingSuggestions.length)} اقتراحات)
=====================================
${finalReport.rewritingSuggestions
  .slice(0, 5)
  .map(
    (s, i) => `
${i + 1}. ${s.location}
   المشكلة: ${s.currentIssue}
   الاقتراح: ${s.suggestedRewrite}
   التبرير: ${s.reasoning}
   التأثير: ${s.impact}/10
   الأولوية: ${s.priority}
`
  )
  .join("\n")}

=====================================
تقرير الثقة النهائي
=====================================
الثقة الإجمالية: ${(output.finalConfidence.overallConfidence * 100).toFixed(1)}%

الوكلاء المستخدمون: ${metadata.agentsUsed.join(", ") || "لا يوجد"}

=====================================
نهاية التقرير
=====================================
`.trim();
}

// ---------------------------------------------------------------------------
// Markdown report
// ---------------------------------------------------------------------------

export function generateMarkdownReport(output: Station7Output): string {
  const { finalReport, scoreMatrix, metadata } = output;

  return `
# تقرير التحليل الدرامي الشامل

**تاريخ التحليل:** ${metadata.analysisTimestamp.toISOString()}
**وقت التنفيذ:** ${(metadata.totalExecutionTime / 1000).toFixed(2)} ثانية
**المحطات المكتملة:** ${metadata.stationsCompleted}
**النموذج المستخدم:** ${metadata.modelUsed}
**إجمالي التوكنات:** ${metadata.tokensUsed.toLocaleString()}

---

## الملخص التنفيذي

${finalReport.executiveSummary}

---

## التقييم الشامل

### النتيجة الإجمالية
**${finalReport.overallAssessment.overallScore}/100** - **${finalReport.overallAssessment.rating}**

| المعيار | النتيجة |
|---------|---------|
| جودة السرد | ${finalReport.overallAssessment.narrativeQualityScore}/100 |
| سلامة البنية | ${finalReport.overallAssessment.structuralIntegrityScore}/100 |
| تطوير الشخصيات | ${finalReport.overallAssessment.characterDevelopmentScore}/100 |
| فعالية الصراع | ${finalReport.overallAssessment.conflictEffectivenessScore}/100 |
| العمق الموضوعي | ${finalReport.overallAssessment.thematicDepthScore}/100 |

---

${formatScoreMatrixMarkdown(scoreMatrix)}

---

## تحليل SWOT

### نقاط القوة (Strengths)
${finalReport.strengthsAnalysis.map((s, i) => `${i + 1}. ${s}`).join("\n")}

### نقاط الضعف (Weaknesses)
${finalReport.weaknessesIdentified.map((w, i) => `${i + 1}. ${w}`).join("\n")}

### فرص التحسين (Opportunities)
${finalReport.opportunitiesForImprovement.map((o, i) => `${i + 1}. ${o}`).join("\n")}

### التهديدات للتماسك (Threats)
${finalReport.threatsToCoherence.map((t, i) => `${i + 1}. ${t}`).join("\n")}

---

## صدى الجمهور المتوقع

| المعيار | النتيجة |
|---------|---------|
| التأثير العاطفي | ${finalReport.audienceResonance.emotionalImpact}/10 |
| التفاعل الفكري | ${finalReport.audienceResonance.intellectualEngagement}/10 |
| القابلية للارتباط | ${finalReport.audienceResonance.relatability}/10 |
| قابلية التذكر | ${finalReport.audienceResonance.memorability}/10 |
| الإمكانات الفيروسية | ${finalReport.audienceResonance.viralPotential}/10 |

**الاستجابة الأولية المتوقعة:**
${finalReport.audienceResonance.primaryResponse}

---

## التوصيات النهائية

### يجب عمله (Must Do)
${finalReport.finalRecommendations.mustDo.map((r, i) => `${i + 1}. ${r}`).join("\n")}

### ينبغي عمله (Should Do)
${finalReport.finalRecommendations.shouldDo.map((r, i) => `${i + 1}. ${r}`).join("\n")}

### يمكن عمله (Could Do)
${finalReport.finalRecommendations.couldDo.map((r, i) => `${i + 1}. ${r}`).join("\n")}

---

## اقتراحات إعادة الكتابة

${finalReport.rewritingSuggestions
  .slice(0, 5)
  .map(
    (s, i) => `### ${i + 1}. ${s.location}

- **المشكلة:** ${s.currentIssue}
- **الاقتراح:** ${s.suggestedRewrite}
- **التبرير:** ${s.reasoning}
- **التأثير:** ${s.impact}/10
- **الأولوية:** ${s.priority}
`
  )
  .join("\n")}

---

## تقرير الثقة النهائي

**الثقة الإجمالية:** ${(output.finalConfidence.overallConfidence * 100).toFixed(1)}%

**الوكلاء المستخدمون:** ${metadata.agentsUsed.join(", ") || "لا يوجد"}

---

*تم إنشاء هذا التقرير بواسطة نظام المحطات السبع للتحليل الدرامي*
`.trim();
}

// ---------------------------------------------------------------------------
// Private formatting helpers
// ---------------------------------------------------------------------------

function formatScoreMatrixText(scoreMatrix: ScoreMatrix): string {
  return `=====================================
مصفوفة النتائج
=====================================
المحطة 1 (التأسيس): ${scoreMatrix.foundation.toFixed(2)}
المحطة 2 (المفاهيم): ${scoreMatrix.conceptual.toFixed(2)}
المحطة 3 (شبكة الصراعات): ${scoreMatrix.conflictNetwork.toFixed(2)}
المحطة 4 (الكفاءة): ${scoreMatrix.efficiency.toFixed(2)}
المحطة 5 (الديناميكية والرمزية): ${scoreMatrix.dynamicSymbolic.toFixed(2)}
المحطة 6 (التشخيص): ${scoreMatrix.diagnostics.toFixed(2)}
النتيجة الإجمالية: ${scoreMatrix.overall.toFixed(2)}`;
}

function formatScoreMatrixMarkdown(scoreMatrix: ScoreMatrix): string {
  return `## مصفوفة النتائج

| المحطة | النتيجة |
|--------|---------|
| المحطة 1: التأسيس | ${scoreMatrix.foundation.toFixed(2)} |
| المحطة 2: المفاهيم | ${scoreMatrix.conceptual.toFixed(2)} |
| المحطة 3: شبكة الصراعات | ${scoreMatrix.conflictNetwork.toFixed(2)} |
| المحطة 4: الكفاءة | ${scoreMatrix.efficiency.toFixed(2)} |
| المحطة 5: الديناميكية والرمزية | ${scoreMatrix.dynamicSymbolic.toFixed(2)} |
| المحطة 6: التشخيص | ${scoreMatrix.diagnostics.toFixed(2)} |
| **النتيجة الإجمالية** | **${scoreMatrix.overall.toFixed(2)}** |`;
}
