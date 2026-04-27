// frontend/src/lib/ai/constitutional/multi-agent-debate.ts

import { logger } from "@/lib/logger";
import { stripHtmlTags } from "@/lib/security/sanitize-html";

import { GeminiService } from "../../ai/stations/gemini-service";

import {
  DEFAULT_DEBATE_PARTICIPANTS,
  fallbackVerdict,
  parseDebateVerdict,
  type DebateArgument,
  type DebateResult,
  type DebateRound,
  type DebateVerdict,
} from "./multi-agent-debate-models";
import {
  buildDefenderPrompt,
  buildJudgePrompt,
  buildPreviousRoundsContext,
  buildProsecutorPrompt,
  buildVerdictPrompt,
} from "./multi-agent-debate-prompts";

export type {
  ConsensusArea,
  DebateArgument,
  DebateDynamics,
  DebateParticipant,
  DebateResult,
  DebateRound,
  DebateVerdict,
  DisputedArea,
  FinalVerdict,
} from "./multi-agent-debate-models";

/**
 * Context passed to a debate run. Carries the analysis classification and
 * any upstream results that may inform the prosecutor/defender/judge roles.
 * Upstream payloads are deliberately `unknown`-typed so consumers must
 * narrow before reading instead of trusting an open shape.
 */
export interface DebateContext {
  analysisType: string;
  previousResults?: unknown;
}

export class MultiAgentDebateSystem {
  constructor(private geminiService: GeminiService) {}

  /**
   * إجراء نقاش متعدد الوكلاء حول تحليل
   */
  async conductDebate(
    text: string,
    analysis: string,
    context: DebateContext,
    maxRounds = 3
  ): Promise<DebateResult> {
    logger.info(
      `[Multi-Agent Debate] Starting debate with max ${maxRounds} rounds`
    );

    const participants = [...DEFAULT_DEBATE_PARTICIPANTS];

    const rounds: DebateRound[] = [];

    // Conduct debate rounds
    for (let i = 0; i < maxRounds; i++) {
      logger.info(`[Multi-Agent Debate] Round ${i + 1}/${maxRounds}`);

      const round = await this.conductDebateRound(
        i + 1,
        text,
        analysis,
        context,
        rounds // Previous rounds for context
      );

      rounds.push(round);

      // Check for convergence
      const convergence = this.checkConvergence(rounds);
      if (convergence > 0.8 && i >= 1) {
        logger.info(`[Multi-Agent Debate] Converged after ${i + 1} rounds`);
        break;
      }
    }

    // Generate final verdict
    const verdict = await this.generateVerdict(text, analysis, rounds);

    // Calculate debate dynamics
    const debateDynamics = {
      rounds: rounds.length,
      convergenceScore: this.checkConvergence(rounds),
      controversialTopics: this.identifyControversialTopics(rounds),
    };

    logger.info(`[Multi-Agent Debate] Complete after ${rounds.length} rounds`);

    return {
      participants,
      rounds,
      verdict,
      debateDynamics,
    };
  }

  /**
   * إجراء جولة نقاش واحدة
   */
  private async conductDebateRound(
    roundNumber: number,
    text: string,
    analysis: string,
    _context: DebateContext,
    previousRounds: DebateRound[]
  ): Promise<DebateRound> {
    const debateContext = buildPreviousRoundsContext(previousRounds);

    // Prosecutor's argument
    const prosecutorArg = await this.generateProsecutorArgument(
      text,
      analysis,
      debateContext
    );

    // Defender's response
    const defenderArg = await this.generateDefenderArgument(
      text,
      analysis,
      prosecutorArg.argument,
      debateContext
    );

    // Judge's comments
    const judgeComments = await this.generateJudgeComments(
      prosecutorArg,
      defenderArg
    );

    return {
      round: roundNumber,
      prosecutorArgument: prosecutorArg,
      defenderArgument: defenderArg,
      judgeComments,
    };
  }

  /**
   * توليد حجة المدعي
   */
  private async generateProsecutorArgument(
    text: string,
    analysis: string,
    debateContext: string
  ): Promise<DebateArgument> {
    const prompt = buildProsecutorPrompt(text, analysis, debateContext);

    try {
      const result = await this.geminiService.generate<string>({
        prompt,
        temperature: 0.6,
        maxTokens: 2048,
        validator: (value): value is string => typeof value === "string",
      });

      return this.parseDebateArgument(result.content, "المدعي الناقد");
    } catch (error) {
      logger.error("Failed to generate prosecutor argument:", error);
      // Return a default argument in case of failure
      return {
        participant: "المدعي الناقد",
        argument: "تعذر إنشاء حجة بسبب خطأ في الخدمة.",
        evidence: [],
        strength: 0,
      };
    }
  }

  /**
   * توليد حجة المدافع
   */
  private async generateDefenderArgument(
    text: string,
    analysis: string,
    prosecutorArgument: string,
    debateContext: string
  ): Promise<DebateArgument> {
    const prompt = buildDefenderPrompt(
      text,
      analysis,
      prosecutorArgument,
      debateContext
    );

    try {
      const result = await this.geminiService.generate<string>({
        prompt,
        temperature: 0.6,
        maxTokens: 2048,
        validator: (value): value is string => typeof value === "string",
      });

      return this.parseDebateArgument(result.content, "المدافع البناء");
    } catch (error) {
      logger.error("Failed to generate defender argument:", error);
      // Return a default argument in case of failure
      return {
        participant: "المدافع البناء",
        argument: "تعذر إنشاء حجة بسبب خطأ في الخدمة.",
        evidence: [],
        strength: 0,
      };
    }
  }

  /**
   * توليد تعليقات القاضي
   */
  private async generateJudgeComments(
    prosecutorArg: DebateArgument,
    defenderArg: DebateArgument
  ): Promise<string> {
    const prompt = buildJudgePrompt(prosecutorArg, defenderArg);

    try {
      const result = await this.geminiService.generate<string>({
        prompt,
        temperature: 0.3,
        maxTokens: 512,
        validator: (value): value is string => typeof value === "string",
      });
      return result.content;
    } catch (error) {
      logger.error("Failed to generate judge comments:", error);
      return "تعذر إنشاء تعليقات القاضي بسبب خطأ في الخدمة.";
    }
  }

  /**
   * توليد الحكم النهائي
   */
  private async generateVerdict(
    _text: string,
    _analysis: string,
    rounds: DebateRound[]
  ): Promise<DebateVerdict> {
    const prompt = buildVerdictPrompt(rounds);

    try {
      const result = await this.geminiService.generate<string>({
        prompt,
        temperature: 0.2,
        maxTokens: 3072,
        validator: (value): value is string => typeof value === "string",
      });

      return parseDebateVerdict(result.content);
    } catch (error) {
      logger.error("Failed to generate verdict:", error);
      return fallbackVerdict;
    }
  }

  /**
   * فحص التقارب بين الآراء
   */
  private checkConvergence(rounds: DebateRound[]): number {
    if (rounds.length < 2) return 0;

    // Simple heuristic: compare strength scores
    const lastRound = rounds[rounds.length - 1];
    const prevRound = rounds[rounds.length - 2];

    if (!lastRound || !prevRound) {
      return 0.5; // Return default convergence if rounds are missing
    }

    const lastDiff = Math.abs(
      lastRound.prosecutorArgument.strength -
        lastRound.defenderArgument.strength
    );
    const prevDiff = Math.abs(
      prevRound.prosecutorArgument.strength -
        prevRound.defenderArgument.strength
    );

    // If difference is decreasing, we're converging
    if (lastDiff < prevDiff) {
      return 0.7 + (prevDiff - lastDiff) / 10;
    }

    return 0.3;
  }

  /**
   * تحديد المواضيع الخلافية
   */
  private identifyControversialTopics(rounds: DebateRound[]): string[] {
    const topics: string[] = [];

    for (const round of rounds) {
      // Find topics where prosecutor and defender strongly disagree
      const strengthDiff = Math.abs(
        round.prosecutorArgument.strength - round.defenderArgument.strength
      );

      if (strengthDiff > 5) {
        // Extract topic from arguments
        const prosecutorTopics = this.extractTopics(
          round.prosecutorArgument.argument
        );
        const defenderTopics = this.extractTopics(
          round.defenderArgument.argument
        );

        // Find common topics (they're arguing about the same thing)
        const commonTopics = prosecutorTopics.filter((t) =>
          defenderTopics.some((dt) => dt.includes(t) || t.includes(dt))
        );

        topics.push(...commonTopics);
      }
    }

    // Return unique topics
    return [...new Set(topics)].slice(0, 5);
  }

  /**
   * استخراج المواضيع من نص
   */
  private extractTopics(text: string): string[] {
    // Simple keyword extraction
    const keywords = [
      "شخصية",
      "حبكة",
      "حوار",
      "موضوع",
      "بنية",
      "أسلوب",
      "رسالة",
    ];
    return keywords.filter((keyword) => text.includes(keyword));
  }

  /**
   * تحليل حجة من نص
   */
  private parseDebateArgument(
    text: string,
    participant: string
  ): DebateArgument {
    const argumentMatch = /الحجة:\s*([^\n]+(?:\n(?!الأدلة|قوة)[^\n]+)*)/.exec(
      text
    );
    const evidenceMatch = /الأدلة:\s*((?:\n\s*-[^\n]+)+)/.exec(text);
    const strengthMatch = /قوة الحجة:\s*(\d+(?:\.\d+)?)/.exec(text);

    const argument = argumentMatch?.[1]?.trim() ?? text;
    const evidenceText = evidenceMatch?.[1] ?? "";
    const strength = strengthMatch?.[1] ? parseFloat(strengthMatch[1]) : 5;

    // Parse evidence list
    const evidence = evidenceText
      .split("\n")
      .map((line) => line.replace(/^\s*-\s*/, "").trim())
      .filter((line) => line.length > 0);

    return {
      participant,
      // Sanitize AI content to prevent XSS
      argument: stripHtmlTags(argument),
      evidence: evidence.map((e) => stripHtmlTags(e)),
      strength,
    };
  }
}

// Export singleton instance
let debateSystemInstance: MultiAgentDebateSystem | null = null;

export function getMultiAgentDebateSystem(
  geminiService: GeminiService
): MultiAgentDebateSystem {
  debateSystemInstance ??= new MultiAgentDebateSystem(geminiService);
  return debateSystemInstance;
}
