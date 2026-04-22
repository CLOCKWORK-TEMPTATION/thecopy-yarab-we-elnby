/**
 * نظام حل المناظرة - Debate Resolution System
 *
 * @module resolution
 * @description
 * يوفر وظائف لحساب درجات التوافق وتحديد نقاط الاتفاق والاختلاف.
 * جزء من المرحلة 3 - نظام المناظرة متعدد الوكلاء
 */

import { geminiService } from '@/services/gemini.service';
import { logger } from '@/utils/logger';
import { DebateArgument, ConsensusResult, Vote } from './types';
import {
  calculateConfidenceAgreement,
  calculatePositionSimilarity,
  calculateEvidenceOverlap,
  extractBulletPoints,
} from './resolution-helpers';

/**
 * حساب درجة التوافق بين الحجج
 */
export async function calculateAgreementScore(
  args: DebateArgument[]
): Promise<number> {
  logger.debug("حساب درجة التوافق", { argumentCount: args.length });

  if (args.length === 0) return 0;
  if (args.length === 1) return args[0]?.confidence ?? 0;

  try {
    const confidenceScore = calculateConfidenceAgreement(args);
    const positionScore = await calculatePositionSimilarity(args);
    const evidenceScore = calculateEvidenceOverlap(args);

    const agreementScore =
      confidenceScore * 0.3 + positionScore * 0.5 + evidenceScore * 0.2;

    logger.info("تم حساب درجة التوافق", {
      agreementScore: agreementScore.toFixed(3),
      confidenceScore: confidenceScore.toFixed(3),
      positionScore: positionScore.toFixed(3),
      evidenceScore: evidenceScore.toFixed(3),
    });

    return Math.min(1, Math.max(0, agreementScore));
  } catch (error) {
    logger.error("فشل في حساب درجة التوافق", {
      error: error instanceof Error ? error.message : 'خطأ غير معروف',
    });

    const avgConfidence =
      args.reduce((sum, arg) => sum + arg.confidence, 0) / args.length;
    return avgConfidence;
  }
}

/**
 * تحديد نقاط التوافق من الحجج
 */
export async function identifyConsensusPoints(
  args: DebateArgument[],
  topic: string
): Promise<string[]> {
  logger.debug("تحديد نقاط التوافق");

  if (args.length === 0) return [];

  try {
    const prompt = `
قم بتحليل الحجج التالية في مناظرة حول: "${topic}"

${args
  .map(
    (arg, idx) => `
**الحجة ${idx + 1}** (${arg.agentName}):
${arg.position}
الثقة: ${(arg.confidence * 100).toFixed(0)}%
`
  )
  .join('\n---\n')}

حدد **نقاط التوافق** التي يتفق عليها معظم المشاركين أو تظهر في أكثر من حجة.

قدم قائمة منقطة بنقاط التوافق فقط (بدون شرح إضافي):
`;

    const response = await geminiService.generateText(prompt, {
      temperature: 0.4,
      maxTokens: 2048,
    });

    const points = extractBulletPoints(response);
    logger.info("تم تحديد نقاط التوافق", { count: points.length });
    return points;
  } catch (error) {
    logger.error("فشل في تحديد نقاط التوافق", {
      error: error instanceof Error ? error.message : 'خطأ غير معروف',
    });
    return [];
  }
}

/**
 * تحديد نقاط الاختلاف
 */
export async function identifyDisagreementPoints(
  args: DebateArgument[],
  topic: string
): Promise<string[]> {
  logger.debug("تحديد نقاط الاختلاف");

  if (args.length === 0) return [];

  try {
    const prompt = `
قم بتحليل الحجج التالية في مناظرة حول: "${topic}"

${args
  .map(
    (arg, idx) => `
**الحجة ${idx + 1}** (${arg.agentName}):
${arg.position}
`
  )
  .join('\n---\n')}

حدد **نقاط الاختلاف** التي يختلف عليها المشاركون أو تظهر بها آراء متعارضة.

قدم قائمة منقطة بنقاط الاختلاف فقط:
`;

    const response = await geminiService.generateText(prompt, {
      temperature: 0.4,
      maxTokens: 2048,
    });

    const points = extractBulletPoints(response);
    logger.info("تم تحديد نقاط الاختلاف", { count: points.length });
    return points;
  } catch (error) {
    logger.error("فشل في تحديد نقاط الاختلاف", {
      error: error instanceof Error ? error.message : 'خطأ غير معروف',
    });
    return [];
  }
}

/**
 * حل الخلافات وإيجاد أرضية مشتركة
 */
export async function resolveDisagreements(
  args: DebateArgument[],
  disagreementPoints: string[],
  topic: string
): Promise<string> {
  logger.debug("حل الخلافات", { disagreementCount: disagreementPoints.length });

  if (disagreementPoints.length === 0) {
    return 'لا توجد نقاط اختلاف كبيرة للحل';
  }

  try {
    const prompt = `
الموضوع: "${topic}"

تم تحديد نقاط الاختلاف التالية:
${disagreementPoints.map((point, idx) => `${idx + 1}. ${point}`).join('\n')}

بناءً على الحجج الأصلية:
${args
  .map(
    (arg, idx) => `
${idx + 1}. ${arg.agentName}:
${arg.position.substring(0, 400)}
`
  )
  .join('\n---\n')}

قم بتقديم **حل توفيقي** لكل نقطة اختلاف يجمع بين وجهات النظر المختلفة:
`;

    const response = await geminiService.generateText(prompt, {
      temperature: 0.6,
      maxTokens: 4096,
    });

    logger.info("تم توليد الحل التوفيقي للخلافات");
    return response;
  } catch (error) {
    logger.error("فشل في حل الخلافات", {
      error: error instanceof Error ? error.message : 'خطأ غير معروف',
    });
    return 'خطأ في توليد الحل التوفيقي';
  }
}

/**
 * توليف نهائي من جميع الحجج
 */
export async function generateFinalSynthesis(
  args: DebateArgument[],
  consensusPoints: string[],
  disagreementPoints: string[],
  topic: string
): Promise<string> {
  logger.debug("توليد التوليف النهائي");

  if (args.length === 0) return 'لا توجد حجج لتوليفها';

  try {
    const prompt = `
الموضوع: "${topic}"

**نقاط التوافق:**
${consensusPoints.length > 0 ? consensusPoints.map((p, i) => `${i + 1}. ${p}`).join('\n') : 'لا توجد'}

**نقاط الاختلاف:**
${disagreementPoints.length > 0 ? disagreementPoints.map((p, i) => `${i + 1}. ${p}`).join('\n') : 'لا توجد'}

**الحجج الأصلية:**
${args
  .map(
    (arg, idx) => `
${idx + 1}. **${arg.agentName}** (ثقة: ${(arg.confidence * 100).toFixed(0)}%):
${arg.position}
`
  )
  .join('\n---\n')}

قم بتوليف **موقف نهائي شامل** يتضمن:
1. تلخيص نقاط التوافق
2. معالجة نقاط الاختلاف بطريقة متوازنة
3. استخلاص رؤية موحدة ومتماسكة
4. توصيات عملية (إن أمكن)

قدم التوليف بشكل منظم وواضح:
`;

    const synthesis = await geminiService.generateText(prompt, {
      temperature: 0.6,
      maxTokens: 8192,
    });

    logger.info("تم توليد التوليف النهائي");
    return synthesis;
  } catch (error) {
    logger.error("فشل في توليد التوليف النهائي", {
      error: error instanceof Error ? error.message : 'خطأ غير معروف',
    });
    return 'خطأ في توليف النتيجة النهائية';
  }
}

/**
 * بناء نتيجة التوافق الكاملة
 */
export async function buildConsensusResult(
  args: DebateArgument[],
  topic: string
): Promise<ConsensusResult> {
  logger.info("بناء نتيجة التوافق الكاملة");

  try {
    const agreementScore = await calculateAgreementScore(args);

    const [consensusPoints, disagreementPoints] = await Promise.all([
      identifyConsensusPoints(args, topic),
      identifyDisagreementPoints(args, topic),
    ]);

    const finalSynthesis = await generateFinalSynthesis(
      args, consensusPoints, disagreementPoints, topic
    );

    const achieved = agreementScore >= 0.75;
    const participatingAgents = Array.from(new Set(args.map(arg => arg.agentName)));

    return {
      achieved, agreementScore, consensusPoints, disagreementPoints,
      finalSynthesis, participatingAgents, confidence: agreementScore,
    };
  } catch (error) {
    logger.error("فشل في بناء نتيجة التوافق", {
      error: error instanceof Error ? error.message : 'خطأ غير معروف',
    });

    return {
      achieved: false, agreementScore: 0, consensusPoints: [],
      disagreementPoints: ['خطأ في بناء نتيجة التوافق'],
      finalSynthesis: '', participatingAgents: [], confidence: 0,
    };
  }
}

/**
 * حساب الأصوات وتحديد الفائز
 */
export function calculateVoteResults(
  votes: Vote[]
): { argumentScores: Map<string, number>; winnerId: string | null } {
  logger.debug("حساب نتائج التصويت", { voteCount: votes.length });

  const argumentScores = new Map<string, number>();

  votes.forEach(vote => {
    const currentScore = argumentScores.get(vote.argumentId) || 0;
    argumentScores.set(vote.argumentId, currentScore + vote.score);
  });

  let maxScore = 0;
  let winnerId: string | null = null;

  argumentScores.forEach((score, argId) => {
    if (score > maxScore) {
      maxScore = score;
      winnerId = argId;
    }
  });

  logger.info("تم تحديد الفائز في التصويت", {
    winnerId,
    maxScore: maxScore.toFixed(2),
  });

  return { argumentScores, winnerId };
}
