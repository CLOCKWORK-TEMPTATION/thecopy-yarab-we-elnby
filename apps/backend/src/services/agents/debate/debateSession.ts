/**
 * Debate Session Manager
 * إدارة جلسات المناظرة
 * المرحلة 3 - Multi-Agent Debate System
 */

import { v4 as uuidv4 } from "uuid";

import { logger } from "@/lib/logger";

import { StandardAgentOutput } from "../shared/standardAgentPattern";

import { AgentDebator } from "./agentDebator";
import {
  DebateSession,
  DebateRound,
  DebateConfig,
  DebateParticipant,
  DebateArgument,
  ConsensusResult,
  DebateMetrics,
  DebateRole,
} from "./types";

/**
 * Default debate configuration
 */
const DEFAULT_DEBATE_CONFIG: DebateConfig = {
  maxRounds: 3,
  minParticipants: 2,
  maxParticipants: 5,
  consensusThreshold: 0.75,
  confidenceThreshold: 0.6,
  allowUserInput: false,
  timeoutPerRound: 60000, // 60 seconds
  enableVoting: true,
};

/**
 * DebateRoundClass - manages a single debate round
 */
export class DebateRoundClass implements DebateRound {
  roundNumber: number;
  arguments: DebateArgument[] = [];
  consensus?: ConsensusResult;
  startTime: Date;
  endTime?: Date;
  status: "active" | "completed" | "aborted" = "active";

  constructor(roundNumber: number) {
    this.roundNumber = roundNumber;
    this.startTime = new Date();
  }

  /**
   * Add argument to round
   */
  addArgument(argument: DebateArgument): void {
    this.arguments.push(argument);
  }

  /**
   * Set consensus result
   */
  setConsensus(consensus: ConsensusResult): void {
    this.consensus = consensus;
  }

  /**
   * Complete the round
   */
  complete(): void {
    this.status = "completed";
    this.endTime = new Date();
  }

  /**
   * Abort the round
   */
  abort(): void {
    this.status = "aborted";
    this.endTime = new Date();
  }

  /**
   * Get round duration in ms
   */
  getDuration(): number {
    const end = this.endTime ?? new Date();
    return end.getTime() - this.startTime.getTime();
  }

  /**
   * Get arguments by agent name
   */
  getArgumentsByAgent(agentName: string): DebateArgument[] {
    return this.arguments.filter((arg) => arg.agentName === agentName);
  }

  /**
   * Get arguments by role
   */
  getArgumentsByRole(role: DebateRole): DebateArgument[] {
    return this.arguments.filter((arg) => arg.role === role);
  }
}

/**
 * DebateSessionClass - manages entire debate session
 */
export class DebateSessionClass implements DebateSession {
  id: string;
  topic: string;
  participants: DebateParticipant[];
  rounds: DebateRound[] = [];
  config: DebateConfig;
  status: "initializing" | "in_progress" | "completed" | "failed" =
    "initializing";
  startTime: Date;
  endTime?: Date;
  finalResult?: StandardAgentOutput;

  private debators = new Map<string, AgentDebator>();

  constructor(
    topic: string,
    participants: DebateParticipant[],
    config?: Partial<DebateConfig>,
  ) {
    this.id = uuidv4();
    this.topic = topic;
    this.participants = participants;
    this.config = { ...DEFAULT_DEBATE_CONFIG, ...config };
    this.startTime = new Date();

    // Create AgentDebators for each participant
    participants.forEach((participant) => {
      const agentName = participant.agent.getConfig().name;
      const debator = new AgentDebator(participant.agent, participant.role);
      this.debators.set(agentName, debator);
    });

    logger.info(
      `[DebateSession] Created session ${this.id} for topic: ${topic}`,
    );
  }

  /**
   * Start the debate session
   */
  start(): Promise<void> {
    logger.info(`[DebateSession] Starting debate on: ${this.topic}`);
    this.status = "in_progress";

    // Validate participants
    if (this.participants.length < (this.config.minParticipants ?? 2)) {
      throw new Error(
        `عدد المشاركين (${this.participants.length}) أقل من الحد الأدنى (${this.config.minParticipants})`,
      );
    }

    if (this.participants.length > (this.config.maxParticipants ?? 5)) {
      throw new Error(
        `عدد المشاركين (${this.participants.length}) أكبر من الحد الأقصى (${this.config.maxParticipants})`,
      );
    }

    return Promise.resolve();
  }

  /**
   * Execute a debate round
   */
  async executeRound(
    roundNumber: number,
    context?: string,
  ): Promise<DebateRound> {
    logger.info(`[DebateSession] Executing round ${roundNumber}`);

    const round = new DebateRoundClass(roundNumber);
    this.rounds.push(round);

    const timeout = this.config.timeoutPerRound ?? 60000;
    const roundPromise = this.runRound(round, context);

    try {
      // Execute round with timeout
      await Promise.race([
        roundPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Round timeout")), timeout),
        ),
      ]);

      round.complete();
    } catch (error) {
      logger.error(`[DebateSession] Round ${roundNumber} failed:`, error);
      round.abort();
    }

    return round;
  }

  /**
   * Run a single round - collect arguments from all participants
   */
  private async runRound(
    round: DebateRoundClass,
    context?: string,
  ): Promise<void> {
    const previousArguments = this.getAllPreviousArguments();

    // Collect arguments from all participants in parallel
    const argumentPromises = this.participants.map(async (participant) => {
      const agentName = participant.agent.getConfig().name;
      const debator = this.debators.get(agentName);

      if (!debator) {
        logger.error(`[DebateSession] No debator found for ${agentName}`);
        return null;
      }

      try {
        const argument = await debator.presentArgument(
          this.topic,
          context,
          previousArguments,
        );
        return argument;
      } catch (error) {
        logger.error(
          `[DebateSession] Error getting argument from ${agentName}:`,
          error,
        );
        return null;
      }
    });

    const debateArguments = await Promise.all(argumentPromises);

    // Add valid arguments to round
    debateArguments.forEach((arg) => {
      if (arg) {
        round.addArgument(arg);
      }
    });
  }

  /**
   * Get all arguments from previous rounds
   */
  private getAllPreviousArguments(): DebateArgument[] {
    const allArguments: DebateArgument[] = [];

    for (const round of this.rounds) {
      if (round.status === "completed") {
        allArguments.push(...round.arguments);
      }
    }

    return allArguments;
  }

  /**
   * Get current round
   */
  getCurrentRound(): DebateRound | undefined {
    return this.rounds[this.rounds.length - 1];
  }

  /**
   * Get all arguments from all rounds
   */
  getAllArguments(): DebateArgument[] {
    return this.getAllPreviousArguments();
  }

  /**
   * Set final result
   */
  setFinalResult(result: StandardAgentOutput): void {
    this.finalResult = result;
  }

  /**
   * Complete the debate session
   */
  complete(): void {
    this.status = "completed";
    this.endTime = new Date();
    logger.info(`[DebateSession] Debate completed: ${this.id}`);
  }

  /**
   * Fail the debate session
   */
  fail(reason?: string): void {
    this.status = "failed";
    this.endTime = new Date();
    logger.error(`[DebateSession] Debate failed: ${reason ?? "Unknown error"}`);
  }

  /**
   * Get debate metrics
   */
  getMetrics(): DebateMetrics {
    const allArguments = this.getAllArguments();
    const lastRound = this.rounds[this.rounds.length - 1];
    const consensusAchieved = lastRound?.consensus?.achieved ?? false;

    let totalConfidence = 0;
    allArguments.forEach((arg) => {
      totalConfidence += arg.confidence;
    });

    const averageConfidence =
      allArguments.length > 0 ? totalConfidence / allArguments.length : 0;

    const processingTime = this.endTime
      ? this.endTime.getTime() - this.startTime.getTime()
      : Date.now() - this.startTime.getTime();

    // Calculate quality score based on multiple factors
    const qualityScore = this.calculateQualityScore(
      consensusAchieved,
      averageConfidence,
      allArguments.length,
      this.rounds.length,
    );

    return {
      totalRounds: this.rounds.length,
      participantCount: this.participants.length,
      consensusAchieved,
      finalAgreementScore: lastRound?.consensus?.agreementScore ?? 0,
      averageConfidence,
      totalArguments: allArguments.length,
      processingTime,
      qualityScore,
    };
  }

  /**
   * Calculate overall quality score
   */
  private calculateQualityScore(
    consensusAchieved: boolean,
    averageConfidence: number,
    totalArguments: number,
    totalRounds: number,
  ): number {
    let score = 0;

    // Consensus achievement (40%)
    if (consensusAchieved) {
      score += 0.4;
    }

    // Average confidence (30%)
    score += averageConfidence * 0.3;

    // Argument diversity - more arguments = better (20%)
    const expectedArguments = this.participants.length * totalRounds;
    const argumentRatio = totalArguments / expectedArguments;
    score += Math.min(1, argumentRatio) * 0.2;

    // Efficiency - fewer rounds = better (10%)
    const maxRounds = this.config.maxRounds ?? 3;
    const efficiency = 1 - totalRounds / maxRounds;
    score += efficiency * 0.1;

    return Math.min(1, Math.max(0, score));
  }

  /**
   * Get debate summary
   */
  getSummary(): string {
    const metrics = this.getMetrics();
    const allArguments = this.getAllArguments();

    let summary = `# ملخص جلسة المناظرة\n\n`;
    summary += `**الموضوع:** ${this.topic}\n`;
    summary += `**عدد الجولات:** ${metrics.totalRounds}\n`;
    summary += `**عدد المشاركين:** ${metrics.participantCount}\n`;
    summary += `**إجمالي الحجج:** ${metrics.totalArguments}\n`;
    summary += `**التوافق:** ${metrics.consensusAchieved ? "تم التوصل إلى توافق" : "لم يتم التوصل إلى توافق"}\n`;
    summary += `**متوسط الثقة:** ${(metrics.averageConfidence * 100).toFixed(1)}%\n`;
    summary += `**درجة الجودة:** ${(metrics.qualityScore * 100).toFixed(1)}%\n\n`;

    summary += `## الحجج الرئيسية:\n\n`;
    allArguments.slice(0, 5).forEach((arg, idx) => {
      summary += `${idx + 1}. **${arg.agentName}** (${arg.role}):\n`;
      summary += `   ${arg.position.substring(0, 200)}...\n\n`;
    });

    return summary;
  }

  /**
   * Get debator by agent name
   */
  getDebator(agentName: string): AgentDebator | undefined {
    return this.debators.get(agentName);
  }
}
