/**
 * منسق المناظرة - Debate Moderator
 *
 * @module debateModerator
 * @description
 * ينسق المناظرات بين الوكلاء المتعددين، ويبني التوافق، ويجمع النتائج.
 * جزء من المرحلة 3 - نظام المناظرة متعدد الوكلاء
 */

import { logger } from '@/lib/logger';
import {
  DebateSession,
  DebateConfig,
  DebateParticipant,
  ConsensusResult,
  Vote,
} from './types';
import { DebateSessionClass } from './debateSession';
import { StandardAgentOutput } from '../shared/standardAgentPattern';
import {
  analyzeDebateArguments,
  calculateArgumentAgreementScore,
  generateConsensusSynthesis,
  synthesizeWithoutConsensus,
} from './debateModerator-helpers';

/**
 * فئة منسق المناظرة
 */
export class DebateModerator {
  /** جلسة المناظرة */
  private session: DebateSessionClass;
  /** خريطة الأصوات */
  private votes: Map<string, Vote[]> = new Map();

  constructor(
    topic: string,
    participants: DebateParticipant[],
    config?: Partial<DebateConfig>
  ) {
    this.session = new DebateSessionClass(topic, participants, config);
  }

  /**
   * تشغيل عملية المناظرة الكاملة
   */
  async runDebate(context?: string): Promise<StandardAgentOutput> {
    logger.info("بدء المناظرة", { topic: this.session.topic });

    try {
      await this.session.start();
      await this.executeDebateRounds(context);

      const finalResult = await this.synthesizeFinalResult();
      this.session.setFinalResult(finalResult);
      this.session.complete();
      return finalResult;
    } catch (error) {
      return this.handleDebateError(error);
    }
  }

  /**
   * تنفيذ جولات المناظرة
   */
  private async executeDebateRounds(context?: string): Promise<void> {
    const maxRounds = this.session.config.maxRounds || 3;
    const consensusThreshold = this.session.config.consensusThreshold || 0.75;
    let currentRound = 1;

    while (currentRound <= maxRounds) {
      logger.debug("تنفيذ جولة المناظرة", { currentRound, maxRounds });
      await this.session.executeRound(currentRound, context);

      if (currentRound > 1 || maxRounds === 1) {
        const consensus = await this.buildConsensus();
        const round = this.session.getCurrentRound();
        if (round) {
          round.consensus = consensus;
        }

        if (consensus.achieved && consensus.agreementScore >= consensusThreshold) {
          logger.info("تم التوصل إلى توافق", {
            round: currentRound,
            agreementScore: consensus.agreementScore,
          });
          break;
        }
      }
      currentRound++;
    }
  }

  /**
   * معالجة خطأ المناظرة
   */
  private handleDebateError(error: unknown): StandardAgentOutput {
    logger.error("فشلت المناظرة", {
      topic: this.session.topic,
      error: error instanceof Error ? error.message : 'خطأ غير معروف',
    });
    this.session.fail(error instanceof Error ? error.message : 'Unknown error');

    return {
      text: `عذراً، حدث خطأ أثناء المناظرة: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`,
      confidence: 0.3,
      notes: ['فشل في إتمام المناظرة'],
      metadata: { debateRounds: this.session.rounds.length },
    };
  }

  /**
   * بناء التوافق من الحجج
   */
  async buildConsensus(): Promise<ConsensusResult> {
    logger.debug("بناء التوافق");
    const allArguments = this.session.getAllArguments();

    if (allArguments.length === 0) {
      return {
        achieved: false, agreementScore: 0, consensusPoints: [],
        disagreementPoints: ['لا توجد حجج كافية للتحليل'],
        finalSynthesis: '', participatingAgents: [], confidence: 0,
      };
    }

    try {
      const analysis = await analyzeDebateArguments(allArguments, this.session.topic);
      const agreementScore = await calculateArgumentAgreementScore(allArguments);
      const consensusThreshold = this.session.config.consensusThreshold || 0.75;
      const achieved = agreementScore >= consensusThreshold;
      const participatingAgents = Array.from(new Set(allArguments.map(arg => arg.agentName)));

      let finalSynthesis = '';
      if (achieved) {
        finalSynthesis = await generateConsensusSynthesis(
          allArguments, analysis.consensusPoints, this.session.topic
        );
      }

      return {
        achieved, agreementScore, consensusPoints: analysis.consensusPoints,
        disagreementPoints: analysis.disagreementPoints, finalSynthesis,
        participatingAgents, confidence: agreementScore,
      };
    } catch (error) {
      logger.error("فشل في بناء التوافق", {
        error: error instanceof Error ? error.message : 'خطأ غير معروف',
      });
      return {
        achieved: false, agreementScore: 0, consensusPoints: [],
        disagreementPoints: ['خطأ في تحليل التوافق'],
        finalSynthesis: '', participatingAgents: [], confidence: 0,
      };
    }
  }

  /**
   * توليف النتيجة النهائية من جميع جولات المناظرة
   */
  private async synthesizeFinalResult(): Promise<StandardAgentOutput> {
    logger.debug("توليف النتيجة النهائية");

    const metrics = this.session.getMetrics();
    const lastRound = this.session.getCurrentRound();
    const consensus = lastRound?.consensus;

    let finalText = '';
    let confidence = 0;
    const notes: string[] = [];

    if (consensus && consensus.achieved) {
      finalText = consensus.finalSynthesis;
      confidence = consensus.confidence;
      notes.push(`تم التوصل إلى توافق بنسبة ${(consensus.agreementScore * 100).toFixed(1)}%`);
    } else {
      const allArguments = this.session.getAllArguments();
      finalText = await synthesizeWithoutConsensus(allArguments, this.session.topic);
      confidence = metrics.averageConfidence * 0.8;
      notes.push('لم يتم التوصل إلى توافق كامل - هذا توليف للآراء المختلفة');
    }

    notes.push(`عدد الجولات: ${metrics.totalRounds}`);
    notes.push(`عدد الحجج: ${metrics.totalArguments}`);
    notes.push(`جودة المناظرة: ${(metrics.qualityScore * 100).toFixed(1)}%`);

    return {
      text: finalText, confidence, notes,
      metadata: {
        debateRounds: metrics.totalRounds,
        consensusAchieved: metrics.consensusAchieved,
        participantCount: metrics.participantCount,
        agreementScore: metrics.finalAgreementScore,
        qualityScore: metrics.qualityScore,
        processingTime: metrics.processingTime,
      },
    };
  }

  /** الحصول على جلسة المناظرة */
  getSession(): DebateSession {
    return this.session;
  }

  /** تسجيل صوت */
  recordVote(vote: Vote): void {
    const existingVotes = this.votes.get(vote.argumentId) || [];
    existingVotes.push(vote);
    this.votes.set(vote.argumentId, existingVotes);
  }

  /** الحصول على الأصوات لحجة محددة */
  getVotesForArgument(argumentId: string): Vote[] {
    return this.votes.get(argumentId) || [];
  }

  /** الحصول على جميع الأصوات */
  getAllVotes(): Map<string, Vote[]> {
    return new Map(this.votes);
  }
}
