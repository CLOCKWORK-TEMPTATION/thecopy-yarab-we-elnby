/**
 * بروتوكولات المناظرة - Debate Protocols
 *
 * @module protocols
 * @description
 * وظائف تنسيق المناظرة عالية المستوى.
 * جزء من المرحلة 3 - نظام المناظرة متعدد الوكلاء
 */

import { logger } from "@/lib/logger";

import { BaseAgent } from "../shared/BaseAgent";
import { StandardAgentOutput } from "../shared/standardAgentPattern";

import { DebateModerator } from "./debateModerator";
import {
  buildArgumentPrompt,
  buildRefutationPrompt,
  buildVotingPrompt,
  extractReasoning,
  extractEvidence,
  getSynthesizerAgentOutput,
  generateDirectSynthesis,
  analyzeConsensusPoints,
  calculateAgreementScore,
  parseVotesFromResponse,
} from "./protocols-helpers";
import { selectDebatingAgents } from "./selection";
import {
  DebateConfig,
  DebateParticipant,
  DebateArgument,
  DebateRole,
  ConsensusResult,
  Vote,
} from "./types";

/**
 * بدء جلسة مناظرة
 */
export async function startDebate(
  topic: string,
  availableAgents: BaseAgent[],
  context?: string,
  config?: Partial<DebateConfig>,
): Promise<StandardAgentOutput> {
  logger.info("بدء جلسة مناظرة", { topic, agentCount: availableAgents.length });

  const participants = selectDebatingAgents(availableAgents, config);

  if (participants.length < 2) {
    throw new Error("يجب أن يكون هناك على الأقل وكيلان للمناظرة");
  }

  const moderator = new DebateModerator(topic, participants, config);
  const result = await moderator.runDebate(context);

  return result;
}

/**
 * تقديم الحجج من جميع المشاركين
 */
export async function presentArguments(
  topic: string,
  participants: DebateParticipant[],
  context?: string,
  previousArguments?: DebateArgument[],
): Promise<DebateArgument[]> {
  logger.debug("جمع الحجج من المشاركين", {
    participantCount: participants.length,
  });

  const argumentPromises = participants.map(async (participant) => {
    try {
      const agentName = participant.agent.getConfig().name;
      logger.debug("الحصول على حجة من وكيل", { agentName });

      const prompt = buildArgumentPrompt(
        topic,
        participant.role,
        context,
        previousArguments,
      );

      const result = await participant.agent.executeTask({
        input: prompt,
        options: {
          temperature: 0.7,
          enableRAG: true,
          enableSelfCritique: true,
        },
        context: context ?? "",
      });

      const argument: DebateArgument = {
        id: `${agentName}-${Date.now()}`,
        agentName,
        role: participant.role,
        position: result.text,
        reasoning: extractReasoning(result.text),
        evidence: extractEvidence(result.text),
        confidence: result.confidence,
        referencesTo: previousArguments?.map((arg) => arg.id) ?? [],
        timestamp: new Date(),
      };

      return argument;
    } catch (error) {
      logger.error("فشل في الحصول على حجة من المشارك", {
        error: error instanceof Error ? error.message : "خطأ غير معروف",
      });
      return null;
    }
  });

  const debateArguments = await Promise.all(argumentPromises);
  return debateArguments.filter((arg): arg is DebateArgument => arg !== null);
}

/**
 * الرد على الحجج
 */
export async function refuteArguments(
  args: DebateArgument[],
  participants: DebateParticipant[],
  context?: string,
): Promise<DebateArgument[]> {
  logger.debug("جمع الردود على الحجج", { argumentCount: args.length });

  const refutations: DebateArgument[] = [];

  for (const participant of participants) {
    const agentName = participant.agent.getConfig().name;
    const otherArguments = args.filter((arg) => arg.agentName !== agentName);

    if (otherArguments.length === 0) continue;

    try {
      const prompt = buildRefutationPrompt(otherArguments, context);

      const result = await participant.agent.executeTask({
        input: prompt,
        options: {
          temperature: 0.7,
          enableRAG: true,
          enableSelfCritique: true,
        },
        context: context ?? "",
      });

      const refutation: DebateArgument = {
        id: `refutation-${agentName}-${Date.now()}`,
        agentName,
        role: DebateRole.OPPONENT,
        position: result.text,
        reasoning: extractReasoning(result.text),
        evidence: extractEvidence(result.text),
        confidence: result.confidence,
        referencesTo: otherArguments.map((arg) => arg.id),
        timestamp: new Date(),
      };

      refutations.push(refutation);
    } catch (error) {
      logger.error("فشل في الحصول على رد من وكيل", {
        agentName,
        error: error instanceof Error ? error.message : "خطأ غير معروف",
      });
    }
  }

  return refutations;
}

/**
 * توليف التوافق من الحجج
 */
export async function synthesizeConsensus(
  args: DebateArgument[],
  topic: string,
  synthesizer?: BaseAgent,
): Promise<ConsensusResult> {
  logger.debug("توليف التوافق من الحجج", { argumentCount: args.length });

  if (args.length === 0) {
    return {
      achieved: false,
      agreementScore: 0,
      consensusPoints: [],
      disagreementPoints: ["لا توجد حجج للتحليل"],
      finalSynthesis: "",
      participatingAgents: [],
      confidence: 0,
    };
  }

  try {
    const synthesisText = synthesizer
      ? await getSynthesizerAgentOutput(synthesizer, args, topic)
      : generateDirectSynthesis(args, topic);

    const { consensusPoints, disagreementPoints } = analyzeConsensusPoints(
      args,
      synthesisText,
    );
    const agreementScore = calculateAgreementScore(args, consensusPoints);
    const achieved = agreementScore >= 0.75;
    const participatingAgents = Array.from(
      new Set(args.map((arg) => arg.agentName)),
    );

    return {
      achieved,
      agreementScore,
      consensusPoints,
      disagreementPoints,
      finalSynthesis: synthesisText,
      participatingAgents,
      confidence: agreementScore,
    };
  } catch (error) {
    logger.error("فشل في توليف التوافق", {
      error: error instanceof Error ? error.message : "خطأ غير معروف",
    });

    return {
      achieved: false,
      agreementScore: 0,
      consensusPoints: [],
      disagreementPoints: ["خطأ في توليف التوافق"],
      finalSynthesis: "",
      participatingAgents: [],
      confidence: 0,
    };
  }
}

/**
 * التصويت على أفضل رد
 */
export async function voteOnBestResponse(
  args: DebateArgument[],
  participants: DebateParticipant[],
  topic: string,
): Promise<{ argumentId: string; votes: Vote[]; winner: DebateArgument }> {
  logger.debug("التصويت على الحجج", { argumentCount: args.length });

  const firstArgument = args[0];
  if (!firstArgument) {
    throw new Error("لا توجد حجج متاحة للتصويت");
  }

  const allVotes: Vote[] = [];

  for (const participant of participants) {
    const agentName = participant.agent.getConfig().name;

    try {
      const prompt = buildVotingPrompt(args, topic);

      const result = await participant.agent.executeTask({
        input: prompt,
        options: { temperature: 0.5, enableRAG: false },
      });

      const votes = parseVotesFromResponse(result.text, args, agentName);
      allVotes.push(...votes);
    } catch (error) {
      logger.error("فشل في الحصول على أصوات من وكيل", {
        agentName,
        error: error instanceof Error ? error.message : "خطأ غير معروف",
      });
    }
  }

  const scoreMap = new Map<string, number>();
  args.forEach((arg) => scoreMap.set(arg.id, 0));

  allVotes.forEach((vote) => {
    const currentScore = scoreMap.get(vote.argumentId) ?? 0;
    scoreMap.set(vote.argumentId, currentScore + vote.score);
  });

  let maxScore = 0;
  let winnerId = firstArgument.id;

  scoreMap.forEach((score, argId) => {
    if (score > maxScore) {
      maxScore = score;
      winnerId = argId;
    }
  });

  const winner = args.find((arg) => arg.id === winnerId) ?? firstArgument;

  return { argumentId: winnerId, votes: allVotes, winner };
}
