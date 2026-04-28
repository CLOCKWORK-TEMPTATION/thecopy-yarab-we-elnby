/**
 * Enhanced Self-Critique Module
 * وحدة النقد الذاتي المحسّن بمعايير متخصصة
 */

import { logger } from "@/lib/logger";
import { geminiService } from "@/services/gemini.service";

import {
  CritiqueConfiguration,
  CritiqueRequest,
  EnhancedCritiqueResult,
  DimensionScore,
  CritiqueContext,
  getCritiqueConfiguration,
} from "./critiqueConfigurations";
import {
  calculateOverallScore,
  determineLevel,
  parseDimensionResponse,
  generateCritiqueNotes,
  generateImprovementPlan,
  buildDimensionEvaluationPrompt,
} from "./enhancedCritiqueHelpers";

import type { CritiqueDimension } from "./critiqueTypes";

interface ImprovementContext {
  originalOutput: string;
  task: string;
  context: CritiqueContext;
  dimensionScores: DimensionScore[];
  critiqueNotes: string[];
  config: CritiqueConfiguration;
}

export class EnhancedSelfCritiqueModule {
  /** تطبيق النقد الذاتي المحسّن */
  async applyEnhancedCritique(
    request: CritiqueRequest,
  ): Promise<EnhancedCritiqueResult> {
    const { output: originalOutput, task, context } = request;
    const config = this.resolveConfig(request);

    logger.info(
      `[Enhanced Critique] Starting critique for ${config.agentName}`,
      {
        dimensions: config.dimensions?.length || 0,
        maxIterations: config.maxIterations || 3,
      },
    );

    const dimensionScores = await this.evaluateAllDimensions(
      originalOutput,
      task,
      context,
      config,
    );
    const overallScore = calculateOverallScore(
      dimensionScores,
      config.dimensions || [],
    );
    const overallLevel = determineLevel(
      overallScore,
      config.thresholds || {
        excellent: 0.85,
        good: 0.7,
        satisfactory: 0.55,
        needsImprovement: 0.4,
      },
    );
    const critiqueNotes = generateCritiqueNotes(
      dimensionScores,
      overallScore,
      config,
    );

    const improvementContext: ImprovementContext = {
      originalOutput,
      task,
      context,
      dimensionScores,
      critiqueNotes,
      config,
    };
    const state = await this.applyImprovementIfNeeded(
      improvementContext,
      overallScore,
    );

    const improvementPlanResult = generateImprovementPlan(
      dimensionScores,
      config,
    );

    logger.info(`[Enhanced Critique] Complete for ${config.agentName}`, {
      overallScore,
      overallLevel,
      improved: state.improved,
      iterations: state.iterations,
    });

    return {
      originalOutput,
      refinedOutput: state.refinedOutput,
      improved: state.improved,
      iterations: state.iterations,
      dimensionScores,
      overallScore,
      overallLevel,
      improvementScore: state.improvementScore,
      critiqueNotes,
      improvementPlan: improvementPlanResult,
    };
  }

  private resolveConfig(request: CritiqueRequest): CritiqueConfiguration {
    const { customConfig, context } = request;
    if (
      customConfig?.agentType &&
      customConfig.dimensions &&
      customConfig.thresholds
    ) {
      return customConfig as CritiqueConfiguration;
    }
    const retrieved = getCritiqueConfiguration(context.taskType);
    if (!retrieved)
      throw new Error(
        `No critique configuration found for ${context.taskType}`,
      );
    return retrieved;
  }

  private async applyImprovementIfNeeded(
    improvementContext: ImprovementContext,
    overallScore: number,
  ): Promise<{
    refinedOutput: string;
    improved: boolean;
    iterations: number;
    improvementScore: number;
  }> {
    const { originalOutput, task, context, dimensionScores, config } =
      improvementContext;
    if (
      overallScore >= config.thresholds.good ||
      !config.enableAutoCorrection
    ) {
      return {
        refinedOutput: originalOutput,
        improved: false,
        iterations: 0,
        improvementScore: 0,
      };
    }

    const result = await this.performImprovementCycles(improvementContext);

    if (result.improved) {
      const newScores = await this.evaluateAllDimensions(
        result.refinedOutput,
        task,
        context,
        config,
      );
      dimensionScores.splice(0, dimensionScores.length, ...newScores);
    }

    const improvementScore = result.improved
      ? await this.calculateImprovementScore(
          originalOutput,
          result.refinedOutput,
        )
      : 0;

    return { ...result, improvementScore };
  }

  private async evaluateAllDimensions(
    output: string,
    task: string,
    context: CritiqueContext,
    config: CritiqueConfiguration,
  ): Promise<DimensionScore[]> {
    const scores: DimensionScore[] = [];
    for (const dimension of config.dimensions) {
      logger.debug(
        `[Enhanced Critique] Evaluating dimension: ${dimension.name}`,
      );
      scores.push(
        await this.evaluateDimension(output, task, context, dimension),
      );
    }
    return scores;
  }

  private async evaluateDimension(
    output: string,
    task: string,
    context: CritiqueContext,
    dimension: CritiqueDimension,
  ): Promise<DimensionScore> {
    const prompt = buildDimensionEvaluationPrompt(
      output,
      task,
      context.originalText,
      dimension,
    );
    try {
      const response = await geminiService.generateText(prompt, {
        temperature: 0.2,
        maxTokens: 2048,
      });
      return parseDimensionResponse(response, dimension);
    } catch {
      logger.error(`[Enhanced Critique] Error evaluating ${dimension.name}`);
      return {
        dimension: dimension.name,
        score: 0.5,
        level: "satisfactory",
        strengths: [],
        weaknesses: [],
        suggestions: [],
      };
    }
  }

  private async performImprovementCycles(
    improvementContext: ImprovementContext,
  ): Promise<{ refinedOutput: string; improved: boolean; iterations: number }> {
    const { originalOutput, config } = improvementContext;
    let currentOutput = originalOutput;
    let improved = false;

    for (let i = 0; i < config.maxIterations; i++) {
      const iteration = i + 1;
      logger.debug(
        `[Enhanced Critique] Improvement cycle ${iteration}/${config.maxIterations}`,
      );

      const result = await this.runSingleCycle(
        currentOutput,
        improvementContext,
        iteration,
      );

      if (result === null) break;
      currentOutput = result;
      improved = true;
    }

    return {
      refinedOutput: currentOutput,
      improved,
      iterations: improved ? config.maxIterations : 0,
    };
  }

  private async runSingleCycle(
    currentOutput: string,
    improvementContext: ImprovementContext,
    iteration: number,
  ): Promise<string | null> {
    const prompt = this.buildImprovementPrompt(
      currentOutput,
      improvementContext,
    );
    try {
      const improved = await geminiService.generateText(prompt, {
        temperature: 0.7,
        maxTokens: 4096,
      });
      const hasImproved = await this.verifyImprovement(currentOutput, improved);
      if (hasImproved) {
        logger.debug(
          `[Enhanced Critique] Improvement cycle ${iteration} successful`,
        );
        return improved;
      }
      logger.debug(
        `[Enhanced Critique] No improvement after cycle ${iteration}`,
      );
      return null;
    } catch {
      logger.error(
        `[Enhanced Critique] Error in improvement cycle ${iteration}`,
      );
      return null;
    }
  }

  private buildImprovementPrompt(
    currentOutput: string,
    improvementContext: ImprovementContext,
  ): string {
    const { task, context, dimensionScores, critiqueNotes } =
      improvementContext;
    const weaknesses = dimensionScores.flatMap((d) => d.weaknesses);
    const suggestions = dimensionScores.flatMap((d) => d.suggestions);

    return `أنت محرر ومحسن محتوى محترف متخصص في المحتوى الدرامي.

**المهمة الأصلية:** ${task}
**النص الأصلي:** ${context.originalText.substring(0, 2000)}
**التحليل الحالي:** ${currentOutput}
**ملاحظات النقد:** ${critiqueNotes.join("\n")}
**نقاط الضعف:** ${weaknesses.map((w) => `• ${w}`).join("\n")}
**التحسينات المقترحة:** ${suggestions.map((s) => `• ${s}`).join("\n")}

قدم التحليل المحسّن فقط بدون شروحات إضافية:`;
  }

  private async verifyImprovement(
    original: string,
    improved: string,
  ): Promise<boolean> {
    if (original === improved) return false;
    const originalWords = original.split(/\s+/).length;
    const improvedWords = improved.split(/\s+/).length;
    const wordDiff = Math.abs(originalWords - improvedWords) / originalWords;
    if (wordDiff < 0.1) {
      const similarity = await this.calculateSimilarity(original, improved);
      return similarity < 0.9;
    }
    return true;
  }

  private async calculateSimilarity(
    text1: string,
    text2: string,
  ): Promise<number> {
    const prompt = `قيّم التشابه بين النصين على مقياس من 0 إلى 1:\n\n${text1.substring(0, 1000)}\n\n---\n\n${text2.substring(0, 1000)}\n\nأعطِ رقماً فقط:`;
    try {
      const response = await geminiService.generateText(prompt, {
        temperature: 0.1,
        maxTokens: 50,
      });
      const score = parseFloat(response.trim());
      return isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score));
    } catch {
      return 0.5;
    }
  }

  private async calculateImprovementScore(
    original: string,
    refined: string,
  ): Promise<number> {
    if (original === refined) return 0;
    const prompt = `قيّم مستوى التحسين (0-1):\n\n${original.substring(0, 1500)}\n\n---\n\n${refined.substring(0, 1500)}\n\nأعطِ رقماً فقط:`;
    try {
      const response = await geminiService.generateText(prompt, {
        temperature: 0.1,
        maxTokens: 50,
      });
      const score = parseFloat(response.trim());
      return isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score));
    } catch {
      return 0.5;
    }
  }
}

export const enhancedSelfCritiqueModule = new EnhancedSelfCritiqueModule();
