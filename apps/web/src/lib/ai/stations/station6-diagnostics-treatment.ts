import { GeminiService } from "./gemini-service";
import {
  MultiAgentDebateSystem,
  DebateResult,
} from "../constitutional/multi-agent-debate";
import {
  UncertaintyQuantificationEngine,
  getUncertaintyQuantificationEngine,
} from "../constitutional/uncertainty-quantification";

// =====================================================
// INTERFACES
// =====================================================

export interface DiagnosticIssue {
  type: "critical" | "major" | "minor";
  category:
    | "character"
    | "plot"
    | "dialogue"
    | "structure"
    | "theme"
    | "pacing"
    | "continuity";
  description: string;
  location: string;
  impact: number; // 0-10
  suggestion: string;
  affectedElements: string[];
  priority: number; // 1-10 للترتيب
}

export interface IsolatedCharacter {
  name: string;
  isolationScore: number; // 0-10
  currentConnections: string[];
  missedOpportunities: string[];
  integrationSuggestions: Array<{
    type: "conflict" | "relationship" | "subplot";
    description: string;
    expectedImpact: number;
  }>;
}

export interface AbandonedConflict {
  id: string;
  description: string;
  involvedCharacters: string[];
  introducedAt: string;
  abandonedAt: string;
  setupInvestment: number; // 0-10 مدى الاستثمار في إعداد هذا الصراع
  resolutionStrategies: Array<{
    approach: string;
    complexity: "low" | "medium" | "high";
    narrativePayoff: number; // 0-10
    implementation: string;
  }>;
}

export interface StructuralIssue {
  type:
    | "pacing"
    | "continuity"
    | "logic"
    | "coherence"
    | "causality"
    | "timing";
  description: string;
  location: string;
  severity: number; // 0-10
  cascadingEffects: string[];
  fixStrategy: {
    approach: string;
    effort: "minimal" | "moderate" | "substantial";
    riskLevel: "low" | "medium" | "high";
    implementation: string;
  };
}

export interface Recommendation {
  priority: "immediate" | "short_term" | "long_term" | "optional";
  category:
    | "character"
    | "plot"
    | "structure"
    | "dialogue"
    | "theme"
    | "pacing";
  title: string;
  description: string;
  rationale: string;
  impact: number; // 0-10
  effort: number; // 0-10
  riskLevel: "low" | "medium" | "high";
  prerequisites: string[];
  implementation: {
    steps: string[];
    estimatedTime: string;
    potentialChallenges: string[];
  };
  expectedOutcome: string;
}

export interface PlotDevelopment {
  description: string;
  probability: number; // 0-1
  confidence: number; // 0-1
  contributingFactors: Array<{
    factor: string;
    weight: number; // 0-1
  }>;
  potentialIssues: Array<{
    issue: string;
    severity: number; // 0-10
    mitigation: string;
  }>;
  narrativePayoff: number; // 0-10
}

export interface PlotPath {
  name: string;
  description: string;
  probability: number; // 0-1
  divergencePoint: string;
  advantages: Array<{
    aspect: string;
    benefit: string;
    impact: number; // 0-10
  }>;
  disadvantages: Array<{
    aspect: string;
    drawback: string;
    severity: number; // 0-10
  }>;
  keyMoments: Array<{
    moment: string;
    significance: string;
    timing: string;
  }>;
  requiredSetup: string[];
  compatibilityScore: number; // 0-10 مدى التوافق مع النص الحالي
}

export interface RiskArea {
  description: string;
  probability: number; // 0-1
  impact: number; // 0-10
  category: "narrative" | "character" | "theme" | "audience" | "execution";
  indicators: string[];
  mitigation: {
    strategy: string;
    effort: "low" | "medium" | "high";
    effectiveness: number; // 0-10
  };
}

export interface Opportunity {
  description: string;
  potential: number; // 0-10
  category: "character" | "plot" | "theme" | "emotional" | "commercial";
  currentState: string;
  exploitation: {
    approach: string;
    effort: "minimal" | "moderate" | "substantial";
    timeline: string;
  };
  expectedBenefit: string;
}

export interface PlotPoint {
  timestamp: string;
  description: string;
  importance: number; // 0-10
  confidence: number; // 0-1
}

export interface DiagnosticsReport {
  overallHealthScore: number; // 0-100
  healthBreakdown: {
    characterDevelopment: number; // 0-100
    plotCoherence: number; // 0-100
    structuralIntegrity: number; // 0-100
    dialogueQuality: number; // 0-100
    thematicDepth: number; // 0-100
  };
  criticalIssues: DiagnosticIssue[];
  warnings: DiagnosticIssue[];
  suggestions: DiagnosticIssue[];
  isolatedCharacters: IsolatedCharacter[];
  abandonedConflicts: AbandonedConflict[];
  structuralIssues: StructuralIssue[];
  riskAreas: RiskArea[];
  opportunities: Opportunity[];
  summary: string;
}

export interface TreatmentPlan {
  prioritizedRecommendations: Recommendation[];
  implementationRoadmap: {
    phase1: {
      title: string;
      tasks: string[];
      estimatedTime: string;
      expectedImpact: number; // 0-100
    };
    phase2: {
      title: string;
      tasks: string[];
      estimatedTime: string;
      expectedImpact: number;
    };
    phase3: {
      title: string;
      tasks: string[];
      estimatedTime: string;
      expectedImpact: number;
    };
  };
  estimatedImprovementScore: number; // 0-100
  implementationComplexity: "low" | "medium" | "high";
  totalTimeEstimate: string;
  riskAssessment: {
    overallRisk: "low" | "medium" | "high";
    specificRisks: Array<{
      risk: string;
      probability: number;
      impact: number;
      mitigation: string;
    }>;
  };
  successMetrics: Array<{
    metric: string;
    currentValue: number;
    targetValue: number;
    measurementMethod: string;
  }>;
}

export interface PlotPredictions {
  currentTrajectory: PlotPoint[];
  trajectoryConfidence: number; // 0-1
  likelyDevelopments: PlotDevelopment[];
  alternativePaths: PlotPath[];
  criticalDecisionPoints: Array<{
    point: string;
    importance: number; // 0-10
    options: string[];
    implications: string;
  }>;
  narrativeMomentum: number; // 0-10
  predictabilityScore: number; // 0-10
}

export interface StationMetadata {
  analysisTimestamp: Date;
  status: "Success" | "Partial" | "Failed";
  executionTime: number;
  agentsUsed: string[];
  tokensUsed?: number;
}

export interface UncertaintyReport {
  overallConfidence: number;
  uncertainties: Array<{
    type: "epistemic" | "aleatoric";
    aspect: string;
    note: string;
  }>;
}

export interface Station6Output {
  diagnosticsReport: DiagnosticsReport;
  debateResults: DebateResult;
  treatmentPlan: TreatmentPlan;
  plotPredictions: PlotPredictions;
  uncertaintyReport: UncertaintyReport;
  metadata: StationMetadata;
}

// =====================================================
// MAIN CLASS
// =====================================================

export class Station6Diagnostics {
  private debateSystem: MultiAgentDebateSystem;
  private uncertaintyEngine: UncertaintyQuantificationEngine;

  constructor(private geminiService: GeminiService) {
    this.debateSystem = new MultiAgentDebateSystem(geminiService);
    this.uncertaintyEngine = getUncertaintyQuantificationEngine(geminiService);
  }

  /**
   * Execute comprehensive diagnostics and treatment analysis
   */
  async execute(
    text: string,
    previousStationsOutput: {
      station1: any;
      station2: any;
      station3: any;
      station4: any;
      station5: any;
    }
  ): Promise<Station6Output> {
    console.log("[Station 6] Starting comprehensive diagnostics");

    const startTime = Date.now();

    try {
      // Generate comprehensive diagnostics report
      const diagnosticsReport = await this.generateComprehensiveDiagnostics(
        text,
        previousStationsOutput
      );

      // Conduct multi-agent debate for critical validation
      const debateResults = await this.conductValidationDebate(
        text,
        previousStationsOutput,
        diagnosticsReport
      );

      // Generate detailed treatment plan
      const treatmentPlan = await this.generateDetailedTreatmentPlan(
        diagnosticsReport,
        debateResults,
        previousStationsOutput
      );

      // Predict plot trajectory with alternatives
      const plotPredictions = await this.predictPlotTrajectoryWithAlternatives(
        text,
        previousStationsOutput,
        diagnosticsReport
      );

      // Quantify uncertainty across all analyses
      const uncertaintyReport = await this.quantifyComprehensiveUncertainty({
        diagnosticsReport,
        debateResults,
        treatmentPlan,
        plotPredictions,
      });

      const metadata: StationMetadata = {
        analysisTimestamp: new Date(),
        status: "Success",
        agentsUsed: [
          "DiagnosticsAnalyzer",
          "HealthScorer",
          "IssueDetector",
          "MultiAgentDebateSystem",
          "TreatmentPlanner",
          "RoadmapGenerator",
          "PlotPredictor",
          "PathAnalyzer",
          "UncertaintyQuantifier",
        ],
        executionTime: Date.now() - startTime,
      };

      console.log(
        `[Station 6] Analysis completed in ${metadata.executionTime}ms`
      );

      return {
        diagnosticsReport,
        debateResults,
        treatmentPlan,
        plotPredictions,
        uncertaintyReport,
        metadata,
      };
    } catch (error) {
      console.error("[Station 6] Execution error:", error);
      throw new Error(
        `Station 6 execution failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  // =====================================================
  // DIAGNOSTICS GENERATION
  // =====================================================

  /**
   * Generate comprehensive diagnostics report with detailed scoring
   */
  private async generateComprehensiveDiagnostics(
    text: string,
    previousStationsOutput: any
  ): Promise<DiagnosticsReport> {
    const analysisSummary = this.createStructuredAnalysisSummary(
      previousStationsOutput
    );

    const prompt = `
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

    try {
      const response = await this.geminiService.generate({
        prompt,
        temperature: 0.3,
        maxTokens: 6144,
      });

      const result =
        typeof response.content === "string"
          ? response.content
          : (response.content as any).raw || "";
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No valid JSON found in response");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate and ensure all required fields exist
      return this.validateAndEnrichDiagnostics(parsed);
    } catch (error) {
      console.error("[Station 6] Diagnostics parsing error:", error);
      return this.generateFallbackDiagnostics(previousStationsOutput);
    }
  }

  /**
   * Validate and enrich diagnostics data
   */
  private validateAndEnrichDiagnostics(data: any): DiagnosticsReport {
    return {
      overallHealthScore: Math.min(
        Math.max(data.overallHealthScore || 50, 0),
        100
      ),
      healthBreakdown: {
        characterDevelopment: Math.min(
          Math.max(data.healthBreakdown?.characterDevelopment || 50, 0),
          100
        ),
        plotCoherence: Math.min(
          Math.max(data.healthBreakdown?.plotCoherence || 50, 0),
          100
        ),
        structuralIntegrity: Math.min(
          Math.max(data.healthBreakdown?.structuralIntegrity || 50, 0),
          100
        ),
        dialogueQuality: Math.min(
          Math.max(data.healthBreakdown?.dialogueQuality || 50, 0),
          100
        ),
        thematicDepth: Math.min(
          Math.max(data.healthBreakdown?.thematicDepth || 50, 0),
          100
        ),
      },
      criticalIssues: (data.criticalIssues || []).slice(0, 10),
      warnings: (data.warnings || []).slice(0, 15),
      suggestions: (data.suggestions || []).slice(0, 20),
      isolatedCharacters: (data.isolatedCharacters || []).slice(0, 5),
      abandonedConflicts: (data.abandonedConflicts || []).slice(0, 8),
      structuralIssues: (data.structuralIssues || []).slice(0, 10),
      riskAreas: (data.riskAreas || []).slice(0, 8),
      opportunities: (data.opportunities || []).slice(0, 10),
      summary: data.summary || "تحليل تشخيصي غير متوفر",
    };
  }

  /**
   * Generate fallback diagnostics if main analysis fails
   */
  private generateFallbackDiagnostics(
    previousStationsOutput: any
  ): DiagnosticsReport {
    const efficiencyScore =
      previousStationsOutput.station4?.efficiencyMetrics
        ?.overallEfficiencyScore || 50;

    return {
      overallHealthScore: Math.min(100, efficiencyScore),
      healthBreakdown: {
        characterDevelopment: Math.min(100, efficiencyScore),
        plotCoherence: Math.min(100, efficiencyScore),
        structuralIntegrity: Math.min(100, efficiencyScore),
        dialogueQuality: Math.min(100, efficiencyScore),
        thematicDepth: Math.min(100, efficiencyScore),
      },
      criticalIssues: [],
      warnings: [],
      suggestions: [],
      isolatedCharacters: [],
      abandonedConflicts: [],
      structuralIssues: [],
      riskAreas: [],
      opportunities: [],
      summary:
        "فشل التحليل التشخيصي التفصيلي. تم استخدام بيانات أساسية من المحطات السابقة.",
    };
  }

  // =====================================================
  // MULTI-AGENT DEBATE
  // =====================================================

  /**
   * Conduct validation debate on diagnostics findings
   */
  private async conductValidationDebate(
    text: string,
    _previousStationsOutput: any,
    diagnosticsReport: DiagnosticsReport
  ): Promise<DebateResult> {
    const debateContext = `
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

    try {
      return await this.debateSystem.conductDebate(
        text.substring(0, 3000),
        debateContext,
        {
          analysisType: "diagnostics-validation",
        },
        3
      );
    } catch (error) {
      console.error("[Station 6] Debate error:", error);
      // Return minimal debate result
      return {
        participants: [],
        rounds: [],
        verdict: {
          consensusAreas: [],
          disputedAreas: [],
          finalVerdict: {
            overallAssessment: "فشل النقاش متعدد الوكلاء",
            strengths: [],
            weaknesses: [],
            recommendations: [],
            confidence: 0.3,
          },
        },
        debateDynamics: {
          rounds: 0,
          convergenceScore: 0,
          controversialTopics: [],
        },
      };
    }
  }

  // =====================================================
  // TREATMENT PLAN GENERATION
  // =====================================================

  /**
   * Generate detailed treatment plan with implementation roadmap
   */
  private async generateDetailedTreatmentPlan(
    diagnosticsReport: DiagnosticsReport,
    debateResults: DebateResult,
    _previousStationsOutput: any
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
      const response = await this.geminiService.generate({
        prompt,
        temperature: 0.3,
        maxTokens: 6144,
      });

      const result =
        typeof response.content === "string"
          ? response.content
          : (response.content as any).raw || "";
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No valid JSON found in response");
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return this.validateAndEnrichTreatmentPlan(parsed);
    } catch (error) {
      console.error("[Station 6] Treatment plan parsing error:", error);
      return this.generateFallbackTreatmentPlan(diagnosticsReport);
    }
  }

  /**
   * Validate and enrich treatment plan
   */
  private validateAndEnrichTreatmentPlan(data: any): TreatmentPlan {
    return {
      prioritizedRecommendations: (data.prioritizedRecommendations || []).slice(
        0,
        20
      ),
      implementationRoadmap: {
        phase1: data.implementationRoadmap?.phase1 || {
          title: "المرحلة الأولى",
          tasks: [],
          estimatedTime: "غير محدد",
          expectedImpact: 0,
        },
        phase2: data.implementationRoadmap?.phase2 || {
          title: "المرحلة الثانية",
          tasks: [],
          estimatedTime: "غير محدد",
          expectedImpact: 0,
        },
        phase3: data.implementationRoadmap?.phase3 || {
          title: "المرحلة الثالثة",
          tasks: [],
          estimatedTime: "غير محدد",
          expectedImpact: 0,
        },
      },
      estimatedImprovementScore: Math.min(
        Math.max(data.estimatedImprovementScore || 50, 0),
        100
      ),
      implementationComplexity: data.implementationComplexity || "medium",
      totalTimeEstimate: data.totalTimeEstimate || "غير محدد",
      riskAssessment: {
        overallRisk: data.riskAssessment?.overallRisk || "medium",
        specificRisks: (data.riskAssessment?.specificRisks || []).slice(0, 10),
      },
      successMetrics: (data.successMetrics || []).slice(0, 8),
    };
  }

  /**
   * Generate fallback treatment plan
   */
  private generateFallbackTreatmentPlan(
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

  // =====================================================
  // PLOT PREDICTIONS
  // =====================================================

  /**
   * Predict plot trajectory with detailed alternatives
   */
  private async predictPlotTrajectoryWithAlternatives(
    text: string,
    previousStationsOutput: any,
    diagnosticsReport: DiagnosticsReport
  ): Promise<PlotPredictions> {
    const contextSummary = this.createStructuredAnalysisSummary(
      previousStationsOutput
    );

    const prompt = `
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

    try {
      const response = await this.geminiService.generate({
        prompt,
        temperature: 0.4,
        maxTokens: 6144,
      });

      const result =
        typeof response.content === "string"
          ? response.content
          : (response.content as any).raw || "";
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No valid JSON found in response");
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return this.validateAndEnrichPlotPredictions(parsed);
    } catch (error) {
      console.error("[Station 6] Plot predictions parsing error:", error);
      return this.generateFallbackPlotPredictions(previousStationsOutput);
    }
  }

  /**
   * Validate and enrich plot predictions
   */
  private validateAndEnrichPlotPredictions(data: any): PlotPredictions {
    return {
      currentTrajectory: (data.currentTrajectory || []).slice(0, 10),
      trajectoryConfidence: Math.min(
        Math.max(data.trajectoryConfidence || 0.5, 0),
        1
      ),
      likelyDevelopments: (data.likelyDevelopments || []).slice(0, 8),
      alternativePaths: (data.alternativePaths || []).slice(0, 5),
      criticalDecisionPoints: (data.criticalDecisionPoints || []).slice(0, 8),
      narrativeMomentum: Math.min(Math.max(data.narrativeMomentum || 5, 0), 10),
      predictabilityScore: Math.min(
        Math.max(data.predictabilityScore || 5, 0),
        10
      ),
    };
  }

  /**
   * Generate fallback plot predictions
   */
  private generateFallbackPlotPredictions(
    _previousStationsOutput: any
  ): PlotPredictions {
    return {
      currentTrajectory: [
        {
          timestamp: "الآن",
          description: "الوضع الحالي كما هو",
          importance: 5,
          confidence: 0.8,
        },
        {
          timestamp: "قريباً",
          description: "تطور الصراعات الحالية",
          importance: 7,
          confidence: 0.6,
        },
      ],
      trajectoryConfidence: 0.5,
      likelyDevelopments: [
        {
          description: "تصاعد الصراع الرئيسي",
          probability: 0.7,
          confidence: 0.6,
          contributingFactors: [{ factor: "شخصيات", weight: 0.8 }],
          potentialIssues: [
            { issue: "تكرار", severity: 4, mitigation: "تنويع الأساليب" },
          ],
          narrativePayoff: 7,
        },
      ],
      alternativePaths: [
        {
          name: "مسار بديل",
          description: "خيار مختلف للقصة",
          probability: 0.3,
          divergencePoint: "نقطة تحول محتملة",
          advantages: [{ aspect: "جدة", benefit: "مفاجأة للجمهور", impact: 8 }],
          disadvantages: [
            { aspect: "توافق", drawback: "يتطلب تغييرات كبيرة", severity: 7 },
          ],
          keyMoments: [
            {
              moment: "حدث رئيسي",
              significance: "تحول",
              timing: "منتصف القصة",
            },
          ],
          requiredSetup: ["إعداد مسبق"],
          compatibilityScore: 5,
        },
      ],
      criticalDecisionPoints: [
        {
          point: "قرار مصيري",
          importance: 8,
          options: ["خيار أ", "خيار ب"],
          implications: "تأثير كبير على مسار القصة",
        },
      ],
      narrativeMomentum: 5,
      predictabilityScore: 5,
    };
  }

  // =====================================================
  // UNCERTAINTY QUANTIFICATION
  // =====================================================

  /**
   * Quantify uncertainty across all analyses
   */
  private async quantifyComprehensiveUncertainty(analyses: {
    diagnosticsReport: DiagnosticsReport;
    debateResults: DebateResult;
    treatmentPlan: TreatmentPlan;
    plotPredictions: PlotPredictions;
  }): Promise<UncertaintyReport> {
    const combinedAnalysis = `
**التقرير التشخيصي:**
 ${JSON.stringify(analyses.diagnosticsReport, null, 2).substring(0, 1000)}

**نتائج النقاش:**
 ${JSON.stringify(analyses.debateResults.verdict, null, 2).substring(0, 800)}

**خطة العلاج:**
 ${JSON.stringify(analyses.treatmentPlan, null, 2).substring(0, 800)}

**توقعات الحبكة:**
 ${JSON.stringify(analyses.plotPredictions, null, 2).substring(0, 800)}
`;

    try {
      const metrics = await this.uncertaintyEngine.quantify(combinedAnalysis, {
        originalText: "",
        analysisType: "comprehensive-diagnostics",
        previousResults: analyses,
      });

      // Map UncertaintyMetrics to UncertaintyReport format
      return {
        overallConfidence: metrics.confidence,
        uncertainties: metrics.sources.map((source) => ({
          type: metrics.type,
          aspect: source.aspect,
          note: source.reason,
        })),
      };
    } catch (error) {
      console.error("[Station 6] Uncertainty quantification error:", error);
      return {
        overallConfidence: 0.5,
        uncertainties: [
          {
            type: "epistemic",
            aspect: "فشل التحليل",
            note: "خطأ في معالجة البيانات",
          },
        ],
      };
    }
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  /**
   * Create structured summary of previous analyses
   */
  private createStructuredAnalysisSummary(previousStationsOutput: any): string {
    return `
**محطة 1 - التحليل الأساسي:**
- الشخصيات الرئيسية: ${previousStationsOutput.station1?.majorCharacters?.length || 0}
- ملخص القصة: ${previousStationsOutput.station1?.logline || "غير متوفر"}

**محطة 2 - التحليل المفاهيمي:**
- النوع: ${previousStationsOutput.station2?.hybridGenre?.primary || "غير محدد"}
- المواضيع الرئيسية: ${previousStationsOutput.station2?.themes?.primary?.length || 0}

**محطة 3 - شبكة الصراعات:**
- كثافة الشبكة: ${previousStationsOutput.station3?.networkAnalysis?.density || 0}
- الصراعات الرئيسية: ${previousStationsOutput.station3?.conflictAnalysis?.mainConflict?.description || "غير محدد"}

**محطة 4 - مقاييس الكفاءة:**
- درجة الكفاءة الإجمالية: ${previousStationsOutput.station4?.efficiencyMetrics?.overallEfficiencyScore || 0}

**محطة 5 - التحليل الديناميكي والرمزي:**
- عمق التحليل الرمزي: ${previousStationsOutput.station5?.symbolicAnalysis?.depthScore || 0}
- توتر السرد: ${previousStationsOutput.station5?.tensionAnalysis?.overallTension || 0}
`;
  }
}
