/**
 * Debate Moderator Helper Functions
 * Extracted from debateModerator.ts to reduce file size and function complexity
 */

import { logger } from '@/lib/logger';
import { geminiService } from '@/services/gemini.service';

import { DebateArgument } from './types';

/**
 * Analyze arguments to find consensus and disagreement points
 */
export async function analyzeDebateArguments(
  debateArguments: DebateArgument[],
  topic: string
): Promise<{ consensusPoints: string[]; disagreementPoints: string[] }> {
  const prompt = `
قم بتحليل الحجج التالية في مناظرة حول: "${topic}"

${debateArguments.map((arg, idx) => `
**الحجة ${idx + 1}** (${arg.agentName}):
${arg.position}
الثقة: ${arg.confidence}
`).join('\n---\n')}

حدد:
1. **نقاط التوافق**: النقاط التي يتفق عليها معظم المشاركين
2. **نقاط الاختلاف**: النقاط المثيرة للجدل أو التي يختلف عليها المشاركون

قدم النتائج بشكل واضح ومنظم.
`;

  try {
    const response = await geminiService.generateText(prompt, {
      temperature: 0.5,
      maxTokens: 4096,
    });

    return parseAnalysisResponse(response);
  } catch (error) {
    logger.error("فشل في تحليل الحجج", {
      error: error instanceof Error ? error.message : 'خطأ غير معروف',
    });
    return {
      consensusPoints: [],
      disagreementPoints: ['خطأ في التحليل'],
    };
  }
}

/**
 * Parse analysis response into consensus and disagreement points
 */
function parseAnalysisResponse(
  response: string
): { consensusPoints: string[]; disagreementPoints: string[] } {
  const lines = response.split('\n');
  const consensusPoints: string[] = [];
  const disagreementPoints: string[] = [];

  let currentSection: 'consensus' | 'disagreement' | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.includes('توافق') || trimmed.includes('اتفاق')) {
      currentSection = 'consensus';
      continue;
    }

    if (trimmed.includes('اختلاف') || trimmed.includes('جدل')) {
      currentSection = 'disagreement';
      continue;
    }

    if ((/^[\-\*\•]\s/.exec(trimmed)) || (/^\d+[\.\)]\s/.exec(trimmed))) {
      const point = trimmed.replace(/^[\-\*\•]\s/, '').replace(/^\d+[\.\)]\s/, '');

      if (currentSection === 'consensus') {
        consensusPoints.push(point);
      } else if (currentSection === 'disagreement') {
        disagreementPoints.push(point);
      }
    }
  }

  return { consensusPoints, disagreementPoints };
}

/**
 * Calculate agreement score between arguments
 */
export async function calculateArgumentAgreementScore(
  debateArguments: DebateArgument[]
): Promise<number> {
  if (debateArguments.length === 0) return 0;

  const confidenceAgreement = calculateConfidenceAgreement(debateArguments);
  const positionAgreement = await calculatePositionAgreement(debateArguments);

  return (confidenceAgreement * 0.3) + (positionAgreement * 0.7);
}

/**
 * Calculate confidence-based agreement
 */
function calculateConfidenceAgreement(debateArguments: DebateArgument[]): number {
  const confidences = debateArguments.map(arg => arg.confidence);
  const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
  const variance = confidences.reduce((sum, c) => sum + Math.pow(c - avgConfidence, 2), 0) / confidences.length;
  return 1 - Math.min(1, variance);
}

/**
 * Calculate position-based agreement using AI
 */
async function calculatePositionAgreement(
  debateArguments: DebateArgument[]
): Promise<number> {
  let positionAgreement = 0.5;

  try {
    const prompt = `
على مقياس من 0 إلى 1، ما مدى تشابه المواقف التالية؟

${debateArguments.map((arg, idx) => `
${idx + 1}. ${arg.agentName}: ${arg.position.substring(0, 200)}
`).join('\n')}

أعطِ فقط رقماً بين 0 و 1 (حيث 1 = تطابق تام، 0 = تعارض تام):
`;

    const response = await geminiService.generateText(prompt, {
      temperature: 0.3,
      maxTokens: 100,
    });

    const match = /(\d+\.?\d*)/.exec(response);
    if (match?.[1]) {
      positionAgreement = Math.min(1, Math.max(0, parseFloat(match[1])));
    }
  } catch (error) {
    logger.error("فشل في حساب تشابه المواقف", {
      error: error instanceof Error ? error.message : 'خطأ غير معروف',
    });
  }

  return positionAgreement;
}

/**
 * Generate synthesis from consensus points
 */
export async function generateConsensusSynthesis(
  debateArguments: DebateArgument[],
  consensusPoints: string[],
  topic: string
): Promise<string> {
  const prompt = `
بناءً على المناظرة حول: "${topic}"

**نقاط التوافق:**
${consensusPoints.map((point, idx) => `${idx + 1}. ${point}`).join('\n')}

**الحجج الأصلية:**

${debateArguments.slice(0, 3).map((arg, idx) => `

${idx + 1}. ${arg.agentName}: ${arg.position.substring(0, 300)}

`).join('\n')}

قم بتوليف موقف نهائي موحد يجمع نقاط التوافق ويقدم رأياً متماسكاً وشاملاً.
`;

  try {
    return await geminiService.generateText(prompt, {
      temperature: 0.6,
      maxTokens: 8192,
    });
  } catch (error) {
    logger.error("فشل في توليد التوليف", {
      error: error instanceof Error ? error.message : 'خطأ غير معروف',
    });
    return 'خطأ في توليد التوليف النهائي';
  }
}

/**
 * Synthesize result when no consensus is reached
 */
export async function synthesizeWithoutConsensus(
  debateArguments: DebateArgument[],
  topic: string
): Promise<string> {
  const prompt = `
لم يتم التوصل إلى توافق كامل في المناظرة حول: "${topic}"

قم بتوليف الآراء المختلفة التالية في رؤية شاملة تعرض جميع وجهات النظر:

${debateArguments.map((arg, idx) => `

**${idx + 1}. ${arg.agentName}:**

${arg.position}

(الثقة: ${arg.confidence})

`).join('\n---\n')}

قدم توليفاً يشمل:
1. عرض موضوعي لجميع وجهات النظر
2. تحديد نقاط القوة في كل حجة
3. استخلاص رؤية متوازنة تجمع أفضل ما في كل موقف
`;

  try {
    return await geminiService.generateText(prompt, {
      temperature: 0.6,
      maxTokens: 8192,
    });
  } catch (error) {
    logger.error("فشل في توليف النتيجة بدون توافق", {
      error: error instanceof Error ? error.message : 'خطأ غير معروف',
    });
    return 'خطأ في توليف النتيجة النهائية';
  }
}
