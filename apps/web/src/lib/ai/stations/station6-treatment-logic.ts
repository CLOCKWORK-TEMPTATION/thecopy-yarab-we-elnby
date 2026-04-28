/**
 * @fileoverview Treatment plan logic for Station 6.
 * Extracted from station6-diagnostics-treatment.ts to keep file ≤ 600 lines.
 */

import {
  asArray,
  asJsonNumber,
  asJsonRecord,
  asString,
} from "./station6-json-helpers";
import { buildTreatmentPlanPrompt } from "./station6-prompts";

import type { GeminiService } from "./gemini-service";
import type {
  DiagnosticsReport,
  Recommendation,
  TreatmentPlan,
} from "./station6-types";
import type { DebateResult } from "../constitutional/multi-agent-debate";

export class TreatmentLogic {
  constructor(private geminiService: GeminiService) {}

  async generateDetailedTreatmentPlan(
    diagnosticsReport: DiagnosticsReport,
    debateResults: DebateResult
  ): Promise<TreatmentPlan> {
    const prompt = buildTreatmentPlanPrompt(
      diagnosticsReport,
      debateResults.verdict
    );

    try {
      const response = await this.geminiService.generate<string>({
        prompt,
        temperature: 0.3,
        maxTokens: 6144,
      });

      const jsonText = /\{[\s\S]*\}/.exec(response.content)?.[0] ?? null;
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

  validateAndEnrichTreatmentPlan(data: unknown): TreatmentPlan {
    const record = asJsonRecord(data);
    const implementationRoadmap = asJsonRecord(record.implementationRoadmap);
    const riskAssessment = asJsonRecord(record.riskAssessment);

    const validComplexity = (value: unknown): "low" | "medium" | "high" => {
      if (value === "low" || value === "medium" || value === "high") {
        return value;
      }
      return "medium";
    };

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
      implementationComplexity: validComplexity(
        record.implementationComplexity
      ),
      totalTimeEstimate: asString(record.totalTimeEstimate, "غير محدد"),
      riskAssessment: {
        overallRisk: validComplexity(riskAssessment.overallRisk),
        specificRisks: asArray<
          TreatmentPlan["riskAssessment"]["specificRisks"][number]
        >(riskAssessment.specificRisks).slice(0, 10),
      },
      successMetrics: asArray<TreatmentPlan["successMetrics"][number]>(
        record.successMetrics
      ).slice(0, 8),
    };
  }

  generateFallbackTreatmentPlan(
    diagnosticsReport: DiagnosticsReport
  ): TreatmentPlan {
    const mapCategory = (
      category: string
    ): "character" | "plot" | "structure" | "dialogue" | "theme" | "pacing" => {
      if (category === "continuity") return "structure";
      const validCategories = [
        "character",
        "plot",
        "structure",
        "dialogue",
        "theme",
        "pacing",
      ];
      if (validCategories.includes(category)) {
        return category as
          | "character"
          | "plot"
          | "structure"
          | "dialogue"
          | "theme"
          | "pacing";
      }
      return "structure";
    };

    const recommendations: Recommendation[] =
      diagnosticsReport.criticalIssues.map((issue) => ({
        priority: "immediate",
        category: mapCategory(issue.category),
        title: `معالجة: ${issue.description.substring(0, 50)}`,
        description: issue.description,
        rationale: `قضية حرجة بتأثير ${issue.impact}/10`,
        impact: issue.impact,
        effort: 7,
        riskLevel: "high",
        prerequisites: [],
        implementation: {
          steps: [issue.suggestion],
          estimatedTime: "1-2 أسابيع",
          potentialChallenges: ["قد يتطلب إعادة هيكلة كبيرة"],
        },
        expectedOutcome: "تحسين جوهري في الجودة",
      }));

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
