import {
  asArray,
  asJsonRecord,
  asJsonNumber,
  asString,
  firstJsonObject,
} from "./utils";

import type {
  TreatmentPlan,
  Recommendation,
  DebateResult,
  DiagnosticsReport,
  JsonRecord,
} from "./types";
import type { GeminiService } from "../gemini-service";

type PreviousStationsOutput = Partial<
  Record<
    "station1" | "station2" | "station3" | "station4" | "station5",
    JsonRecord
  >
>;

export class TreatmentPlanner {
  constructor(private geminiService: GeminiService) {}

  /**
   * Generate detailed treatment plan with implementation roadmap
   */
  async generateDetailedTreatmentPlan(
    diagnosticsReport: DiagnosticsReport,
    debateResults: DebateResult,
    _previousStationsOutput: PreviousStationsOutput
  ): Promise<TreatmentPlan> {
    const prompt = `
بناءً على التقرير التشخيصي ونتائج النقاش، قم بإنشاء خطة علاج شاملة وقابلة للتنفيذ.

**التقرير التشخيصي:**
${JSON.stringify(diagnosticsReport, null, 2).substring(0, 3000)}

**نتائج النقاش:**
${JSON.stringify(debateResults.verdict, null, 2).substring(0, 2000)}

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

    try {
      const response = await this.geminiService.generate<string>({
        prompt,
        temperature: 0.3,
        maxTokens: 6144,
      });

      const jsonText = firstJsonObject(response.content);
      if (!jsonText) {
        throw new Error("No valid JSON found in response");
      }

      const parsed: unknown = JSON.parse(jsonText);
      return this.validateAndEnrichTreatmentPlan(parsed);
    } catch (error) {
      console.error("[Station 6] Treatment plan parsing error:", error);
      return this.generateFallbackTreatmentPlan(diagnosticsReport);
    }
  }

  /**
   * Validate and enrich treatment plan
   */
  validateAndEnrichTreatmentPlan(data: unknown): TreatmentPlan {
    const record = asJsonRecord(data);
    const implementationRoadmap = asJsonRecord(record.implementationRoadmap);
    const riskAssessment = asJsonRecord(record.riskAssessment);

    return {
      prioritizedRecommendations: asArray<Recommendation>(
        record.prioritizedRecommendations
      ).slice(0, 20),
      implementationRoadmap: {
        phase1: (implementationRoadmap.phase1 as
          | TreatmentPlan["implementationRoadmap"]["phase1"]
          | undefined) ?? {
          title: "المرحلة الأولى",
          tasks: [],
          estimatedTime: "غير محدد",
          expectedImpact: 0,
        },
        phase2: (implementationRoadmap.phase2 as
          | TreatmentPlan["implementationRoadmap"]["phase2"]
          | undefined) ?? {
          title: "المرحلة الثانية",
          tasks: [],
          estimatedTime: "غير محدد",
          expectedImpact: 0,
        },
        phase3: (implementationRoadmap.phase3 as
          | TreatmentPlan["implementationRoadmap"]["phase3"]
          | undefined) ?? {
          title: "المرحلة الثالثة",
          tasks: [],
          estimatedTime: "غير محدد",
          expectedImpact: 0,
        },
      },
      estimatedImprovementScore: asJsonNumber(
        record.estimatedImprovementScore,
        50
      ),
      implementationComplexity:
        record.implementationComplexity === "low" ||
        record.implementationComplexity === "medium" ||
        record.implementationComplexity === "high"
          ? record.implementationComplexity
          : "medium",
      totalTimeEstimate: asString(record.totalTimeEstimate, "غير محدد"),
      riskAssessment: {
        overallRisk:
          riskAssessment.overallRisk === "low" ||
          riskAssessment.overallRisk === "medium" ||
          riskAssessment.overallRisk === "high"
            ? riskAssessment.overallRisk
            : "medium",
        specificRisks: asArray<
          TreatmentPlan["riskAssessment"]["specificRisks"][number]
        >(riskAssessment.specificRisks).slice(0, 10),
      },
      successMetrics: asArray<TreatmentPlan["successMetrics"][number]>(
        record.successMetrics
      ).slice(0, 8),
    };
  }

  /**
   * Generate fallback treatment plan
   */
  generateFallbackTreatmentPlan(
    diagnosticsReport: DiagnosticsReport
  ): TreatmentPlan {
    // Map category to valid Recommendation category type
    const mapCategory = (
      category: string
    ): "character" | "plot" | "structure" | "dialogue" | "theme" | "pacing" => {
      if (category === "continuity") return "structure";
      if (
        [
          "character",
          "plot",
          "structure",
          "dialogue",
          "theme",
          "pacing",
        ].includes(category)
      ) {
        return category as
          | "character"
          | "plot"
          | "structure"
          | "dialogue"
          | "theme"
          | "pacing";
      }
      return "structure"; // default fallback
    };

    const recommendations: Recommendation[] = [
      ...diagnosticsReport.criticalIssues.map((issue) => ({
        priority: "immediate" as const,
        category: mapCategory(issue.category),
        title: `معالجة: ${issue.description.substring(0, 50)}`,
        description: issue.description,
        rationale: `قضية حرجة بتأثير ${issue.impact}/10`,
        impact: issue.impact,
        effort: 7,
        riskLevel: "high" as const,
        prerequisites: [],
        implementation: {
          steps: [issue.suggestion],
          estimatedTime: "1-2 أسابيع",
          potentialChallenges: ["قد يتطلب إعادة هيكلة كبيرة"],
        },
        expectedOutcome: "تحسين جوهري في الجودة",
      })),
    ];

    return {
      prioritizedRecommendations: recommendations.slice(0, 10),
      implementationRoadmap: {
        phase1: {
          title: "معالجة القضايا الحرجة",
          tasks: diagnosticsReport.criticalIssues
            .map((i) => i.description)
            .slice(0, 5),
          estimatedTime: "2-3 أسابيع",
          expectedImpact: 30,
        },
        phase2: {
          title: "معالجة التحذيرات",
          tasks: diagnosticsReport.warnings
            .map((w) => w.description)
            .slice(0, 5),
          estimatedTime: "2-4 أسابيع",
          expectedImpact: 25,
        },
        phase3: {
          title: "التحسينات الإضافية",
          tasks: diagnosticsReport.suggestions
            .map((s) => s.description)
            .slice(0, 5),
          estimatedTime: "3-5 أسابيع",
          expectedImpact: 20,
        },
      },
      estimatedImprovementScore: Math.min(
        diagnosticsReport.overallHealthScore + 30,
        100
      ),
      implementationComplexity:
        diagnosticsReport.criticalIssues.length > 5 ? "high" : "medium",
      totalTimeEstimate: "6-12 أسبوع",
      riskAssessment: {
        overallRisk: "medium",
        specificRisks: [],
      },
      successMetrics: [
        {
          metric: "درجة الصحة الإجمالية",
          currentValue: diagnosticsReport.overallHealthScore,
          targetValue: Math.min(diagnosticsReport.overallHealthScore + 30, 95),
          measurementMethod: "إعادة التحليل الشامل",
        },
      ],
    };
  }
}
