/**
 * @fileoverview Prompts for Station 6 — Diagnostics & Treatment.
 * Extracted from station6-diagnostics-treatment.ts to keep file ≤ 600 lines.
 */

import type { DiagnosticsReport } from "./station6-types";

export function buildDiagnosticsPrompt(
  text: string,
  analysisSummary: string
): string {
  return `
قم بتحليل تشخيصي شامل ومتعمق للنص بناءً على التحليلات السابقة.

**السياق:**
${analysisSummary}

**النص (عينة):**
${text.substring(0, 4000)}

**المطلوب: تقرير تشخيصي شامل بصيغة JSON يتضمن:**

1. **درجة الصحة الإجمالية والتفصيلية:**
   - overallHealthScore: رقم من 0-100
   - healthBreakdown: تفصيل لـ characterDevelopment, plotCoherence, structuralIntegrity, dialogueQuality, thematicDepth

2. **القضايا الحرجة (criticalIssues):**
   - مشاكل تؤثر بشكل جوهري على جودة العمل
   - كل قضية تحتوي: type, category, description, location, impact (0-10), suggestion, affectedElements[], priority (1-10)

3. **التحذيرات (warnings):**
   - مشاكل مهمة لكن غير حرجة
   - نفس البنية أعلاه

4. **الاقتراحات (suggestions):**
   - تحسينات ممكنة
   - نفس البنية أعلاه

5. **الشخصيات المعزولة (isolatedCharacters):**
   - name, isolationScore (0-10), currentConnections[], missedOpportunities[], integrationSuggestions[]

6. **الصراعات المتروكة (abandonedConflicts):**
   - id, description, involvedCharacters[], introducedAt, abandonedAt, setupInvestment (0-10), resolutionStrategies[]

7. **المشاكل الهيكلية (structuralIssues):**
   - type, description, location, severity (0-10), cascadingEffects[], fixStrategy{}

8. **مناطق الخطر (riskAreas):**
   - description, probability (0-1), impact (0-10), category, indicators[], mitigation{}

9. **الفرص (opportunities):**
   - description, potential (0-10), category, currentState, exploitation{}, expectedBenefit

10. **ملخص تنفيذي (summary):**
    - نص موجز (150-200 كلمة) يلخص الوضع الصحي العام

**ملاحظات مهمة:**
- كن دقيقاً في تحديد المواقع (أسماء الفصول، أرقام الصفحات، أسماء الشخصيات)
- قدم اقتراحات قابلة للتنفيذ وليست عامة
- رتب القضايا حسب الأولوية والتأثير
- تجنب التكرار بين الفئات المختلفة

قدم الرد بصيغة JSON نظيفة دون أي نص إضافي:
`;
}

export function buildTreatmentPlanPrompt(
  diagnosticsReport: DiagnosticsReport,
  debateResultsVerdict: unknown
): string {
  return `
بناءً على التقرير التشخيصي ونتائج النقاش، قم بإنشاء خطة علاج شاملة وقابلة للتنفيذ.

**التقرير التشخيصي:**
${JSON.stringify(diagnosticsReport, null, 2).substring(0, 3000)}

**نتائج النقاش:**
${JSON.stringify(debateResultsVerdict, null, 2).substring(0, 2000)}

**المطلوب: خطة علاج شاملة بصيغة JSON تتضمن:**

1. **التوصيات المرتبة حسب الأولوية (prioritizedRecommendations):**
   كل توصية تحتوي على:
   - priority: "immediate" | "short_term" | "long_term" | "optional"
   - category: نوع التوصية
   - title: عنوان مختصر
   - description: وصف التوصية
   - rationale: المنطق وراء التوصية
   - impact: 0-10
   - effort: 0-10
   - riskLevel: "low" | "medium" | "high"
   - prerequisites: متطلبات سابقة
   - implementation: {steps[], estimatedTime, potentialChallenges[]}
   - expectedOutcome: النتيجة المتوقعة

2. **خارطة طريق التنفيذ (implementationRoadmap):**
   - phase1: {title, tasks[], estimatedTime, expectedImpact (0-100)}
   - phase2: {title, tasks[], estimatedTime, expectedImpact}
   - phase3: {title, tasks[], estimatedTime, expectedImpact}

3. **تقديرات التحسين:**
   - estimatedImprovementScore: 0-100
   - implementationComplexity: "low" | "medium" | "high"
   - totalTimeEstimate: نص

4. **تقييم المخاطر (riskAssessment):**
   - overallRisk: "low" | "medium" | "high"
   - specificRisks: [{risk, probability, impact, mitigation}]

5. **مقاييس النجاح (successMetrics):**
   - [{metric, currentValue, targetValue, measurementMethod}]

**ملاحظات:**
- رتب التوصيات حسب التأثير والجهد (impact/effort ratio)
- كن محدداً في الخطوات والأطر الزمنية
- ضع أهدافاً قابلة للقياس

قدم الرد بصيغة JSON نظيفة:
`;
}

export function buildPlotPredictionPrompt(
  text: string,
  contextSummary: string,
  diagnosticsReport: DiagnosticsReport
): string {
  return `
بناءً على النص والتحليلات والتشخيص، توقع مسار الحبكة المحتمل والمسارات البديلة.

**السياق:**
${contextSummary}

**التشخيص:**
- درجة الصحة: ${diagnosticsReport.overallHealthScore}/100
- القضايا الحرجة: ${diagnosticsReport.criticalIssues.length}
- الفرص المتاحة: ${diagnosticsReport.opportunities.length}

**النص (عينة):**
${text.substring(0, 3000)}

**المطلوب: توقعات شاملة للحبكة بصيغة JSON:**

1. **المسار الحالي (currentTrajectory):**
   - مجموعة من النقاط الحبكية الرئيسية
   - كل نقطة: {timestamp, description, importance (0-10), confidence (0-1)}

2. **ثقة المسار (trajectoryConfidence):** 0-1

3. **التطورات المحتملة (likelyDevelopments):**
   - description: وصف التطور
   - probability: 0-1
   - confidence: 0-1
   - contributingFactors: [{factor, weight (0-1)}]
   - potentialIssues: [{issue, severity (0-10), mitigation}]
   - narrativePayoff: 0-10

4. **المسارات البديلة (alternativePaths):**
   - name: اسم المسار
   - description: وصف
   - probability: 0-1
   - divergencePoint: نقطة الانحراف
   - advantages: [{aspect, benefit, impact (0-10)}]
   - disadvantages: [{aspect, drawback, severity (0-10)}]
   - keyMoments: [{moment, significance, timing}]
   - requiredSetup: متطلبات الإعداد
   - compatibilityScore: 0-10

5. **نقاط القرار الحاسمة (criticalDecisionPoints):**
   - point: وصف النقطة
   - importance: 0-10
   - options: الخيارات المتاحة
   - implications: انعكاسات القرار

6. **مؤشرات السرد:**
   - narrativeMomentum: 0-10
   - predictabilityScore: 0-10

**ملاحظات:**
- ركز على التطورات المنطقية بناءً على ما سبق
- حدد نقاط الانحراف الرئيسية بوضوح
- قيم توافق المسارات البديلة مع النص الحالي

قدم الرد بصيغة JSON نظيفة:
`;
}

export function buildDebateContext(diagnosticsReport: DiagnosticsReport): string {
  return `
**التقرير التشخيصي:**
- درجة الصحة الإجمالية: ${diagnosticsReport.overallHealthScore}/100
- عدد القضايا الحرجة: ${diagnosticsReport.criticalIssues.length}
- عدد التحذيرات: ${diagnosticsReport.warnings.length}
- عدد الشخصيات المعزولة: ${diagnosticsReport.isolatedCharacters.length}
- عدد الصراعات المتروكة: ${diagnosticsReport.abandonedConflicts.length}

**أهم القضايا الحرجة:**
${diagnosticsReport.criticalIssues
  .slice(0, 5)
  .map(
    (issue) =>
      `- ${issue.category}: ${issue.description} (التأثير: ${issue.impact}/10)`
  )
  .join("\n")}

**الملخص:**
${diagnosticsReport.summary}
`;
}
