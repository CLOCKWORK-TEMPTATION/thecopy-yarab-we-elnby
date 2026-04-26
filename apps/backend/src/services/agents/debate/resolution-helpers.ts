/**
 * Resolution Helper Functions
 * Extracted from resolution.ts to reduce file size
 */

import { logger } from '@/lib/logger';
import { geminiService } from '@/services/gemini.service';

import { DebateArgument } from './types';

/**
 * حساب التوافق بناءً على تباين الثقة
 */
export function calculateConfidenceAgreement(args: DebateArgument[]): number {
  const confidences = args.map(arg => arg.confidence);
  const avgConfidence =
    confidences.reduce((a, b) => a + b, 0) / confidences.length;

  const variance =
    confidences.reduce((sum, c) => sum + Math.pow(c - avgConfidence, 2), 0) /
    confidences.length;

  return 1 - Math.min(1, variance * 2);
}

/**
 * حساب تشابه المواقف باستخدام الذكاء الاصطناعي
 */
export async function calculatePositionSimilarity(
  args: DebateArgument[]
): Promise<number> {
  try {
    const prompt = `
على مقياس من 0 إلى 1، ما مدى تشابه المواقف التالية؟

${args
  .map(
    (arg, idx) => `
${idx + 1}. ${arg.agentName}:
${arg.position.substring(0, 300)}
`
  )
  .join('\n')}

أعطِ فقط رقماً واحداً بين 0 و 1:
- 1 = تطابق تام
- 0.75 = تشابه كبير
- 0.5 = تشابه معتدل
- 0.25 = اختلاف كبير
- 0 = تعارض تام

الرقم:
`;

    const response = await geminiService.generateText(prompt, {
      temperature: 0.3,
      maxTokens: 50,
    });

    const match = /(\d+\.?\d*)/.exec(response);
    if (match?.[1]) {
      return Math.min(1, Math.max(0, parseFloat(match[1])));
    }

    return 0.5;
  } catch (error) {
    logger.error("فشل في حساب تشابه المواقف", {
      error: error instanceof Error ? error.message : 'خطأ غير معروف',
    });
    return 0.5;
  }
}

/**
 * Calculate evidence overlap between arguments
 */
export function calculateEvidenceOverlap(args: DebateArgument[]): number {
  if (args.length < 2) {
    return 1;
  }

  const allEvidence = args.flatMap(arg => arg.evidence);

  if (allEvidence.length === 0) {
    return 0.5;
  }

  let overlapCount = 0;
  let totalComparisons = 0;

  for (let i = 0; i < args.length; i++) {
    for (let j = i + 1; j < args.length; j++) {
      const leftArgument = args[i];
      const rightArgument = args[j];
      if (!leftArgument || !rightArgument) {
        continue;
      }

      const evidence1 = leftArgument.evidence;
      const evidence2 = rightArgument.evidence;

      evidence1.forEach(e1 => {
        evidence2.forEach(e2 => {
          totalComparisons++;
          if (areSimilar(e1, e2)) {
            overlapCount++;
          }
        });
      });
    }
  }

  if (totalComparisons === 0) {
    return 0.5;
  }

  return overlapCount / totalComparisons;
}

/**
 * Check if two strings are similar (simple version)
 */
function areSimilar(str1: string, str2: string): boolean {
  const normalized1 = str1.toLowerCase().trim();
  const normalized2 = str2.toLowerCase().trim();

  if (
    normalized1.includes(normalized2) ||
    normalized2.includes(normalized1)
  ) {
    return true;
  }

  const words1 = normalized1.split(/\s+/);
  const words2 = normalized2.split(/\s+/);

  const commonWords = words1.filter(w => words2.includes(w));

  return commonWords.length / Math.max(words1.length, words2.length) > 0.5;
}

/**
 * Extract bullet points from text
 */
export function extractBulletPoints(text: string): string[] {
  const points: string[] = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    if ((/^[\-\*\•]\s/.exec(trimmed)) || (/^\d+[\.\)]\s/.exec(trimmed))) {
      const point = trimmed
        .replace(/^[\-\*\•]\s/, '')
        .replace(/^\d+[\.\)]\s/, '')
        .trim();

      if (point.length > 0) {
        points.push(point);
      }
    }
  }

  return points;
}
