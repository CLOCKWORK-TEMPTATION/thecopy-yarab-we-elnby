import {
  MultiAgentDebateSystem,
  DebateResult,
} from "../constitutional/multi-agent-debate";
import {
  UncertaintyQuantificationEngine,
  getUncertaintyQuantificationEngine,
} from "../constitutional/uncertainty-quantification";

import { GeminiService } from "./gemini-service";

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
  integrationSuggestions: {
    type: "conflict" | "relationship" | "subplot";
    description: string;
    expectedImpact: number;
  }[];
}

export interface AbandonedConflict {
  id: string;
  description: string;
  involvedCharacters: string[];
  introducedAt: string;
  abandonedAt: string;
  setupInvestment: number; // 0-10 مدى الاستثمار في إعداد هذا الصراع
  resolutionStrategies: {
    approach: string;
    complexity: "low" | "medium" | "high";
    narrativePayoff: number; // 0-10
    implementation: string;
  }[];
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
  contributingFactors: {
    factor: string;
    weight: number; // 0-1
  }[];
  potentialIssues: {
    issue: string;
    severity: number; // 0-10
    mitigation: string;
  }[];
  narrativePayoff: number; // 0-10
}

export interface PlotPath {
  name: string;
  description: string;
  probability: number; // 0-1
  divergencePoint: string;
  advantages: {
    aspect: string;
    benefit: string;
    impact: number; // 0-10
  }[];
  disadvantages: {
    aspect: string;
    drawback: string;
    severity: number; // 0-10
  }[];
  keyMoments: {
    moment: string;
    significance: string;
    timing: string;
  }[];
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
    specificRisks: {
      risk: string;
      probability: number;
      impact: number;
      mitigation: string;
    }[];
  };
  successMetrics: {
    metric: string;
    currentValue: number;
    targetValue: number;
    measurementMethod: string;
  }[];
}

export interface PlotPredictions {
  currentTrajectory: PlotPoint[];
  trajectoryConfidence: number; // 0-1
  likelyDevelopments: PlotDevelopment[];
  alternativePaths: PlotPath[];
  criticalDecisionPoints: {
    point: string;
    importance: number; // 0-10
    options: string[];
    implications: string;
  }[];
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
  uncertainties: {
    type: "epistemic" | "aleatoric";
    aspect: string;
    note: string;
  }[];
}

export interface Station6Output {
  diagnosticsReport: DiagnosticsReport;
  debateResults: DebateResult;
  treatmentPlan: TreatmentPlan;
  plotPredictions: PlotPredictions;
  uncertaintyReport: UncertaintyReport;
  metadata: StationMetadata;
}

type JsonRecord = Record<string, unknown>;

type PreviousStationsOutput = Partial<
  Record<
    "station1" | "station2" | "station3" | "station4" | "station5",
    JsonRecord
  >
>;

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}

function asJsonRecord(value: unknown): JsonRecord {
  return isJsonRecord(value) ? value : {};
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asJsonNumber(value: unknown, fallback: number): number {
  return Math.min(Math.max(asNumber(value, fallback), 0), 100);
}

function firstJsonObject(text: string): string | null {
  return /\{[\s\S]*\}/.exec(text)?.[0] ?? null;
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
    previousStationsOutput: PreviousStationsOutput
  ): Promise<Station6Output> {
    console.warn("[Station 6] Starting comprehensive diagnostics");

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

      console.warn(
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
    previousStationsOutput: PreviousStationsOutput
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
  private validateAndEnrichDiagnostics(data: unknown): DiagnosticsReport {
    const record = asJsonRecord(data);
    const healthBreakdown = asJsonRecord(record.healthBreakdown);

    return {
      overallHealthScore: asJsonNumber(record.overallHealthScore, 50),
      healthBreakdown: {
        characterDevelopment: asJsonNumber(
          healthBreakdown.characterDevelopment,
          50
        ),
        plotCoherence: asJsonNumber(healthBreakdown.plotCoherence, 50),
        structuralIntegrity: asJsonNumber(
          healthBreakdown.structuralIntegrity,
          50
        ),
        dialogueQuality: asJsonNumber(healthBreakdown.dialogueQuality, 50),
        thematicDepth: asJsonNumber(healthBreakdown.thematicDepth, 50),
      },
      criticalIssues: asArray<DiagnosticIssue>(record.criticalIssues).slice(
        0,
        10
      ),
      warnings: asArray<DiagnosticIssue>(record.warnings).slice(0, 15),
      suggestions: asArray<DiagnosticIssue>(record.suggestions).slice(0, 20),
      isolatedCharacters: asArray<IsolatedCharacter>(
        record.isolatedCharacters
      ).slice(0, 5),
      abandonedConflicts: asArray<AbandonedConflict>(
        record.abandonedConflicts
      ).slice(0, 8),
      structuralIssues: asArray<StructuralIssue>(record.structuralIssues).slice(
        0,
        10
      ),
      riskAreas: asArray<RiskArea>(record.riskAreas).slice(0, 8),
      opportunities: asArray<Opportunity>(record.opportunities).slice(0, 10),
      summary: asString(record.summary, "تحليل تشخيصي غير متوفر"),
    };
  }

  /**
   * Generate fallback diagnostics if main analysis fails
   */
  private generateFallbackDiagnostics(
    previousStationsOutput: PreviousStationsOutput
  ): DiagnosticsReport {
    const station4 = asJsonRecord(previousStationsOutput.station4);
    const efficiencyMetrics = asJsonRecord(station4.efficiencyMetrics);
    const efficiencyScore = asNumber(
      efficiencyMetrics.overallEfficiencyScore,
      50
    );

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
    _previousStationsOutput: PreviousStationsOutput,
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
  private validateAndEnrichTreatmentPlan(data: unknown): TreatmentPlan {
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
    previousStationsOutput: PreviousStationsOutput,
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
      const response = await this.geminiService.generate<string>({
        prompt,
        temperature: 0.4,
        maxTokens: 6144,
      });

      const jsonText = firstJsonObject(response.content);
      if (!jsonText) {
        throw new Error("No valid JSON found in response");
      }

      const parsed: unknown = JSON.parse(jsonText);
      return this.validateAndEnrichPlotPredictions(parsed);
    } catch (error) {
      console.error("[Station 6] Plot predictions parsing error:", error);
      return this.generateFallbackPlotPredictions(previousStationsOutput);
    }
  }

  /**
   * Validate and enrich plot predictions
   */
  private validateAndEnrichPlotPredictions(data: unknown): PlotPredictions {
    const record = asJsonRecord(data);

    return {
      currentTrajectory: asArray<PlotPoint>(record.currentTrajectory).slice(
        0,
        10
      ),
      trajectoryConfidence: Math.min(
        Math.max(asNumber(record.trajectoryConfidence, 0.5), 0),
        1
      ),
      likelyDevelopments: asArray<PlotDevelopment>(
        record.likelyDevelopments
      ).slice(0, 8),
      alternativePaths: asArray<PlotPath>(record.alternativePaths).slice(0, 5),
      criticalDecisionPoints: asArray<
        PlotPredictions["criticalDecisionPoints"][number]
      >(record.criticalDecisionPoints).slice(0, 8),
      narrativeMomentum: Math.min(
        Math.max(asNumber(record.narrativeMomentum, 5), 0),
        10
      ),
      predictabilityScore: Math.min(
        Math.max(asNumber(record.predictabilityScore, 5), 0),
        10
      ),
    };
  }

  /**
   * Generate fallback plot predictions
   */
  private generateFallbackPlotPredictions(
    _previousStationsOutput: PreviousStationsOutput
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
  private createStructuredAnalysisSummary(
    previousStationsOutput: PreviousStationsOutput
  ): string {
    const station1 = asJsonRecord(previousStationsOutput.station1);
    const station2 = asJsonRecord(previousStationsOutput.station2);
    const station3 = asJsonRecord(previousStationsOutput.station3);
    const station4 = asJsonRecord(previousStationsOutput.station4);
    const station5 = asJsonRecord(previousStationsOutput.station5);
    const station1MajorCharacters = asArray<unknown>(station1.majorCharacters);
    const station2HybridGenre = asJsonRecord(station2.hybridGenre);
    const station2Themes = asJsonRecord(station2.themes);
    const station2PrimaryThemes = asArray<unknown>(station2Themes.primary);
    const station3NetworkAnalysis = asJsonRecord(station3.networkAnalysis);
    const station3ConflictAnalysis = asJsonRecord(station3.conflictAnalysis);
    const station3MainConflict = asJsonRecord(
      station3ConflictAnalysis.mainConflict
    );
    const station4EfficiencyMetrics = asJsonRecord(station4.efficiencyMetrics);
    const station5SymbolicAnalysis = asJsonRecord(station5.symbolicAnalysis);
    const station5TensionAnalysis = asJsonRecord(station5.tensionAnalysis);

    return `
**محطة 1 - التحليل الأساسي:**
- الشخصيات الرئيسية: ${station1MajorCharacters.length}
- ملخص القصة: ${asString(station1.logline, "غير متوفر")}

**محطة 2 - التحليل المفاهيمي:**
- النوع: ${asString(station2HybridGenre.primary, "غير محدد")}
- المواضيع الرئيسية: ${station2PrimaryThemes.length}

**محطة 3 - شبكة الصراعات:**
- كثافة الشبكة: ${asNumber(station3NetworkAnalysis.density, 0)}
- الصراعات الرئيسية: ${asString(station3MainConflict.description, "غير محدد")}

**محطة 4 - مقاييس الكفاءة:**
- درجة الكفاءة الإجمالية: ${asNumber(station4EfficiencyMetrics.overallEfficiencyScore, 0)}

**محطة 5 - التحليل الديناميكي والرمزي:**
- عمق التحليل الرمزي: ${asNumber(station5SymbolicAnalysis.depthScore, 0)}
- توتر السرد: ${asNumber(station5TensionAnalysis.overallTension, 0)}
`;
  }
}
