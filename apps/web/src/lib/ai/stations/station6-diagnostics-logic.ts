/**
 * @fileoverview Diagnostics logic for Station 6.
 * Extracted from station6-diagnostics-treatment.ts to keep file ≤ 600 lines.
 */


import {
  asArray,
  asJsonNumber,
  asJsonRecord,
  asString,
  firstJsonObject,
} from "./station6-json-helpers";
import { buildDiagnosticsPrompt } from "./station6-prompts";

import type { GeminiService } from "./gemini-service";
import type {
  AbandonedConflict,
  DiagnosticIssue,
  DiagnosticsReport,
  IsolatedCharacter,
  Opportunity,
  PreviousStationsOutput,
  RiskArea,
  StructuralIssue,
} from "./station6-types";

export class DiagnosticsLogic {
  constructor(private geminiService: GeminiService) {}

  async generateComprehensiveDiagnostics(
    text: string,
    previousStationsOutput: PreviousStationsOutput,
    createAnalysisSummary: (output: PreviousStationsOutput) => string
  ): Promise<DiagnosticsReport> {
    const analysisSummary = createAnalysisSummary(previousStationsOutput);
    const prompt = buildDiagnosticsPrompt(text, analysisSummary);

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
      return this.validateAndEnrichDiagnostics(parsed);
    } catch (error) {
      console.error("[Station 6] Diagnostics parsing error:", error);
      return this.generateFallbackDiagnostics(previousStationsOutput);
    }
  }

  validateAndEnrichDiagnostics(data: unknown): DiagnosticsReport {
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

  generateFallbackDiagnostics(
    previousStationsOutput: PreviousStationsOutput
  ): DiagnosticsReport {
    const station4 = asJsonRecord(previousStationsOutput.station4);
    const efficiencyMetrics = asJsonRecord(station4.efficiencyMetrics);
    const efficiencyScore =
      typeof efficiencyMetrics.overallEfficiencyScore === "number" &&
      Number.isFinite(efficiencyMetrics.overallEfficiencyScore)
        ? efficiencyMetrics.overallEfficiencyScore
        : 50;

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
}
