/**
 * @fileoverview Station 7: Finalization — main façade class.
 *
 * Heavy implementation split into:
 *   - station7-types.ts              (types, interfaces)
 *   - station7-score-utils.ts        (score matrix, confidence, metadata helpers)
 *   - station7-text-parsers.ts       (extractText, SWOT/audience/rewriting parsers)
 *   - station7-report-generators.ts  (human-readable, Markdown, JSON generators)
 */

import { BaseStation, type StationConfig } from "../core/pipeline/base-station";
import { logger } from "../utils/logger";
import { saveText } from "../utils/saveText";

import { GeminiModel, GeminiService } from "./gemini-service";
import { Station1Output } from "./station1-text-analysis";
import { Station2Output } from "./station2-conceptual-analysis";
import { Station3Output } from "./station3-network-builder";
import { Station4Output } from "./station4-efficiency-metrics";
import { Station5Output } from "./station5-dynamic-symbolic-stylistic";
import { Station6Output } from "./station6-diagnostics-treatment";

// Re-export public types
export type {
  Station7Input,
  Station7Output,
  AudienceResonance,
  RewritingSuggestion,
  ScoreMatrix,
} from "./station7-types";

import {
  generateHumanReadableReport,
  generateMarkdownReport,
  generateJsonReport,
} from "./station7-report-generators";
import {
  calculateScoreMatrix,
  calculateCharacterScore,
  calculateConflictScore,
  determineRating,
  calculateFinalConfidence,
  extractAgentsUsed,
  calculateTotalTokens,
} from "./station7-score-utils";
import {
  extractText,
  parseStructuredText,
  parseAudienceResonance,
  parseRewritingSuggestions,
} from "./station7-text-parsers";

import type {
  AudienceResonance,
  RewritingSuggestion,
  ScoreMatrix,
  Station2AudienceContext,
  Station7Input,
  Station7Output,
} from "./station7-types";

// ---------------------------------------------------------------------------
// Station7Finalization
// ---------------------------------------------------------------------------

export class Station7Finalization extends BaseStation<
  Station7Input,
  Station7Output
> {
  private outputDir: string;

  constructor(
    config: StationConfig<Station7Input, Station7Output>,
    geminiService: GeminiService,
    outputDir = "analysis_output"
  ) {
    super(config, geminiService);
    this.outputDir = outputDir;
  }

  protected async process(input: Station7Input): Promise<Station7Output> {
    const startTime = Date.now();
    logger.info("[S7] Starting comprehensive final report generation...");

    try {
      const station1 = input.allPreviousStationsData.get(1) as
        | Station1Output
        | undefined;
      const station2 = input.allPreviousStationsData.get(2) as
        | Station2Output
        | undefined;
      const station3 = input.allPreviousStationsData.get(3) as
        | Station3Output
        | undefined;
      const station4 = input.allPreviousStationsData.get(4) as
        | Station4Output
        | undefined;
      const station5 = input.allPreviousStationsData.get(5) as
        | Station5Output
        | undefined;
      const station6 = input.station6Output;

      const scoreMatrix = calculateScoreMatrix(
        station1,
        station2,
        station3,
        station4,
        station5,
        station6
      );

      const [
        executiveSummary,
        overallAssessment,
        swotAnalysis,
        audienceResonance,
        rewritingSuggestions,
        finalConfidence,
      ] = await Promise.all([
        this.generateExecutiveSummary(
          station1,
          station2,
          station3,
          station4,
          station5,
          station6,
          scoreMatrix
        ),
        Promise.resolve(
          this.generateOverallAssessment(
            scoreMatrix,
            station1,
            station2,
            station3,
            station4,
            station5,
            station6
          )
        ),
        this.generateSWOTAnalysis(
          station1,
          station2,
          station3,
          station4,
          station5,
          station6
        ),
        this.analyzeAudienceResonance(
          station1,
          station2,
          station3,
          station4,
          station5,
          station6
        ),
        this.generateRewritingSuggestions(station6, station4, station5),
        Promise.resolve(
          calculateFinalConfidence(
            station1,
            station2,
            station3,
            station4,
            station5,
            station6
          )
        ),
      ]);

      const finalReport = {
        executiveSummary,
        overallAssessment,
        strengthsAnalysis: swotAnalysis.strengths,
        weaknessesIdentified: swotAnalysis.weaknesses,
        opportunitiesForImprovement: swotAnalysis.opportunities,
        threatsToCoherence: swotAnalysis.threats,
        finalRecommendations: {
          mustDo: rewritingSuggestions
            .filter((s) => s.priority === "must")
            .map((s) => s.suggestedRewrite),
          shouldDo: rewritingSuggestions
            .filter((s) => s.priority === "should")
            .map((s) => s.suggestedRewrite),
          couldDo: rewritingSuggestions
            .filter((s) => s.priority === "could")
            .map((s) => s.suggestedRewrite),
        },
        audienceResonance,
        rewritingSuggestions,
      };

      const totalExecutionTime = Date.now() - startTime;
      const agentsUsed = extractAgentsUsed(
        station1,
        station2,
        station3,
        station4,
        station5,
        station6
      );
      const tokensUsed = calculateTotalTokens(
        station1,
        station2,
        station3,
        station4,
        station5,
        station6
      );

      const output: Station7Output = {
        finalReport,
        scoreMatrix,
        finalConfidence,
        metadata: {
          analysisTimestamp: new Date(),
          totalExecutionTime,
          stationsCompleted: 7,
          agentsUsed,
          tokensUsed,
          modelUsed: "gemini-2.5-pro",
          status: "Complete",
        },
      };

      await this.saveReports(output);
      logger.info("[S7] Final report generation completed successfully");
      return output;
    } catch (error) {
      logger.error("[S7] Error generating final report:", error);
      throw error;
    }
  }

  // -------------------------------------------------------------------------
  // Prompt-based generation methods
  // -------------------------------------------------------------------------

  private async generateExecutiveSummary(
    _s1?: Station1Output,
    _s2?: Station2Output,
    s3?: Station3Output,
    s4?: Station4Output,
    _s5?: Station5Output,
    s6?: Station6Output,
    scoreMatrix?: ScoreMatrix
  ): Promise<string> {
    const prompt = `
بناءً على التحليل الشامل للنص الدرامي عبر 7 محطات متخصصة، قم بكتابة ملخص تنفيذي شامل (200-300 كلمة) يتضمن:

1. الطبيعة الأساسية للعمل والنوع الدرامي
2. أبرز نقاط القوة الإبداعية
3. التحديات الرئيسية المكتشفة
4. التقييم العام (النتيجة: ${scoreMatrix?.overall ?? 0}/100)
5. التوصية النهائية

معلومات أساسية:
- عدد الشخصيات: ${s3?.conflictNetwork?.characters?.size ?? 0}
- عدد الصراعات: ${s3?.conflictNetwork?.conflicts?.size ?? 0}
- نتيجة الكفاءة: ${s4?.efficiencyMetrics?.overallEfficiencyScore ?? 0}/100
- نتيجة الصحة العامة: ${s6?.diagnosticsReport?.overallHealthScore ?? 0}/100
- المشاكل الحرجة: ${s6?.diagnosticsReport?.criticalIssues?.length ?? 0}

اكتب بأسلوب احترافي وموضوعي، مع التركيز على القيمة الإبداعية والإمكانات الإنتاجية.
`;
    const response = await this.geminiService.generate<string>({
      prompt,
      model: GeminiModel.PRO,
      temperature: 0.3,
      maxTokens: 1024,
      systemInstruction:
        "أنت محلل دراما محترف متخصص في كتابة ملخصات تنفيذية دقيقة وشاملة.",
    });
    return extractText(response.content);
  }

  private generateOverallAssessment(
    scoreMatrix: ScoreMatrix,
    _s1?: Station1Output,
    _s2?: Station2Output,
    s3?: Station3Output,
    s4?: Station4Output,
    _s5?: Station5Output,
    _s6?: Station6Output
  ): Station7Output["finalReport"]["overallAssessment"] {
    const narrativeQualityScore =
      (scoreMatrix.foundation + scoreMatrix.conceptual) / 2;
    const structuralIntegrityScore = scoreMatrix.conflictNetwork;
    const characterDevelopmentScore = calculateCharacterScore(s3);
    const conflictEffectivenessScore = calculateConflictScore(s3, s4);
    const thematicDepthScore = scoreMatrix.dynamicSymbolic;
    const overallScore = scoreMatrix.overall;

    return {
      narrativeQualityScore: Math.round(narrativeQualityScore),
      structuralIntegrityScore: Math.round(structuralIntegrityScore),
      characterDevelopmentScore: Math.round(characterDevelopmentScore),
      conflictEffectivenessScore: Math.round(conflictEffectivenessScore),
      thematicDepthScore: Math.round(thematicDepthScore),
      overallScore: Math.round(overallScore),
      rating: determineRating(overallScore),
    };
  }

  private async generateSWOTAnalysis(
    _s1?: Station1Output,
    _s2?: Station2Output,
    _s3?: Station3Output,
    s4?: Station4Output,
    _s5?: Station5Output,
    s6?: Station6Output
  ): Promise<{
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  }> {
    const prompt = `
بناءً على التحليل الشامل للنص، حدد:

1. نقاط القوة (Strengths): 5 نقاط رئيسية تميز العمل
2. نقاط الضعف (Weaknesses): 5 نقاط تحتاج معالجة
3. الفرص (Opportunities): 5 فرص للتحسين والتطوير
4. التهديدات (Threats): 5 تهديدات محتملة للتماسك السردي

المعلومات المتاحة:
- المشاكل الحرجة من المحطة 6: ${s6?.diagnosticsReport?.criticalIssues?.map((i) => i.description).join("; ") ?? "لا يوجد"}
- التحذيرات: ${s6?.diagnosticsReport?.warnings?.map((w) => w.description).join("; ") ?? "لا يوجد"}
- نتيجة الكفاءة: ${s4?.efficiencyMetrics?.overallEfficiencyScore ?? 0}/100

قدم كل نقطة في جملة واحدة. استخدم التنسيق التالي:

نقاط القوة:
- نقطة 1
نقاط الضعف:
- نقطة 1
الفرص:
- نقطة 1
التهديدات:
- نقطة 1
`;
    const response = await this.geminiService.generate<unknown>({
      prompt,
      model: GeminiModel.PRO,
      temperature: 0.4,
      maxTokens: 2048,
      systemInstruction:
        "أنت محلل استراتيجي متخصص في تحليل SWOT للأعمال الدرامية.",
    });

    try {
      const text = extractText(response.content);
      const parsed = parseStructuredText(text);
      return {
        strengths: parsed.strengths || [],
        weaknesses: parsed.weaknesses || [],
        opportunities: parsed.opportunities || [],
        threats: parsed.threats || [],
      };
    } catch {
      return { strengths: [], weaknesses: [], opportunities: [], threats: [] };
    }
  }

  private async analyzeAudienceResonance(
    _s1?: Station1Output,
    s2?: Station2Output,
    _s3?: Station3Output,
    _s4?: Station4Output,
    s5?: Station5Output,
    _s6?: Station6Output
  ): Promise<AudienceResonance> {
    const audienceContext = s2 as Station2AudienceContext | undefined;
    const prompt = `
قم بتحليل مدى صدى العمل الدرامي مع الجمهور:

النوع: ${audienceContext?.hybridGenre?.primary ?? "غير محدد"}
الجمهور المستهدف: ${audienceContext?.targetAudience?.primaryAudience ?? "غير محدد"}
القوة الرمزية: ${s5?.symbolicAnalysis?.depthScore ?? 0}/10
التناسق الأسلوبي: ${s5?.stylisticAnalysis?.toneAssessment?.toneConsistency ?? 0}/10

التأثير العاطفي: [0-10]
التفاعل الفكري: [0-10]
القابلية للارتباط: [0-10]
قابلية التذكر: [0-10]
الإمكانات الفيروسية: [0-10]
الاستجابة الأولية:
الاستجابات الثانوية:
- استجابة 1
العناصر المثيرة للجدل:
- عنصر 1
`;
    const response = await this.geminiService.generate<unknown>({
      prompt,
      model: GeminiModel.PRO,
      temperature: 0.5,
      maxTokens: 1024,
      systemInstruction:
        "أنت محلل جمهور متخصص في توقع استجابات الجمهور للأعمال الدرامية.",
    });

    try {
      const text = extractText(response.content);
      const parsed = parseAudienceResonance(text);
      return {
        emotionalImpact: parsed.emotionalImpact ?? 5,
        intellectualEngagement: parsed.intellectualEngagement ?? 5,
        relatability: parsed.relatability ?? 5,
        memorability: parsed.memorability ?? 5,
        viralPotential: parsed.viralPotential ?? 5,
        primaryResponse: parsed.primaryResponse ?? "غير متاح",
        secondaryResponses: parsed.secondaryResponses ?? [],
        controversialElements: parsed.controversialElements ?? [],
      };
    } catch {
      return {
        emotionalImpact: 5,
        intellectualEngagement: 5,
        relatability: 5,
        memorability: 5,
        viralPotential: 5,
        primaryResponse: "تحليل الجمهور غير متاح",
        secondaryResponses: [],
        controversialElements: [],
      };
    }
  }

  private async generateRewritingSuggestions(
    s6?: Station6Output,
    _s4?: Station4Output,
    _s5?: Station5Output
  ): Promise<RewritingSuggestion[]> {
    if (!s6?.diagnosticsReport) return [];

    const criticalIssues = s6.diagnosticsReport.criticalIssues || [];
    const warnings = s6.diagnosticsReport.warnings || [];
    const allIssues = [...criticalIssues, ...warnings].slice(0, 10);
    if (allIssues.length === 0) return [];

    const prompt = `
بناءً على المشاكل المكتشفة، قدم اقتراحات محددة لإعادة الكتابة:

المشاكل:
${allIssues.map((issue, i) => `${i + 1}. ${issue.description} (نوع: ${issue.category}, خطورة: ${issue.type})`).join("\n")}

لكل مشكلة:
الاقتراح [رقم]:
الموقع: [موقع المشكلة]
المشكلة الحالية: [المشكلة]
الاقتراح: [الاقتراح]
التبرير: [التبرير]
التأثير: [0-10]
الأولوية: [must/should/could]
---
`;
    const response = await this.geminiService.generate<unknown>({
      prompt,
      model: GeminiModel.PRO,
      temperature: 0.4,
      maxTokens: 4096,
      systemInstruction: "أنت مستشار كتابة إبداعية متخصص.",
    });

    try {
      return parseRewritingSuggestions(extractText(response.content));
    } catch {
      return [];
    }
  }

  // -------------------------------------------------------------------------
  // Save reports
  // -------------------------------------------------------------------------

  private async saveReports(output: Station7Output): Promise<void> {
    try {
      await saveText(
        `${this.outputDir}/final-report.txt`,
        generateHumanReadableReport(output)
      );
      await saveText(
        `${this.outputDir}/final-report.md`,
        generateMarkdownReport(output)
      );
      await saveText(
        `${this.outputDir}/final-report.json`,
        generateJsonReport(output)
      );
      logger.info("[S7] All report formats saved successfully");
    } catch (error) {
      logger.error("[S7] Error saving reports:", error);
    }
  }

  // -------------------------------------------------------------------------
  // BaseStation required overrides
  // -------------------------------------------------------------------------

  protected extractRequiredData(input: Station7Input): Record<string, unknown> {
    return {
      charactersCount: input.conflictNetwork.characters.size,
      conflictsCount: input.conflictNetwork.conflicts?.size ?? 0,
      station6Issues:
        input.station6Output.diagnosticsReport.criticalIssues.length,
      stationsTracked: input.allPreviousStationsData.size,
    };
  }

  protected getErrorFallback(): Station7Output {
    return {
      finalReport: {
        executiveSummary: "فشل في توليد التقرير النهائي",
        overallAssessment: {
          narrativeQualityScore: 0,
          structuralIntegrityScore: 0,
          characterDevelopmentScore: 0,
          conflictEffectivenessScore: 0,
          thematicDepthScore: 0,
          overallScore: 0,
          rating: "Needs Work",
        },
        strengthsAnalysis: [],
        weaknessesIdentified: [],
        opportunitiesForImprovement: [],
        threatsToCoherence: [],
        finalRecommendations: { mustDo: [], shouldDo: [], couldDo: [] },
        audienceResonance: {
          emotionalImpact: 0,
          intellectualEngagement: 0,
          relatability: 0,
          memorability: 0,
          viralPotential: 0,
          primaryResponse: "",
          secondaryResponses: [],
          controversialElements: [],
        },
        rewritingSuggestions: [],
      },
      scoreMatrix: {
        foundation: 0,
        conceptual: 0,
        conflictNetwork: 0,
        efficiency: 0,
        dynamicSymbolic: 0,
        diagnostics: 0,
        overall: 0,
      },
      finalConfidence: {
        overallConfidence: 0,
        stationConfidences: new Map(),
        uncertaintyAggregation: {
          epistemicUncertainties: [],
          aleatoricUncertainties: [],
          resolvableIssues: [],
        },
      },
      metadata: {
        analysisTimestamp: new Date(),
        totalExecutionTime: 0,
        stationsCompleted: 0,
        agentsUsed: [],
        tokensUsed: 0,
        modelUsed: "gemini-2.5-pro",
        status: "Failed",
      },
    };
  }
}
