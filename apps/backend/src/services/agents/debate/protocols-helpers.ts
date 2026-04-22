/**
 * Debate Protocols Helper Functions
 * Extracted from protocols.ts to reduce file size
 */

import {
  DebateArgument,
  DebateRole,
  Vote,
} from './types';

/**
 * Build argument prompt based on role
 */
export function buildArgumentPrompt(
  topic: string,
  role: DebateRole,
  context?: string,
  previousArguments?: DebateArgument[]
): string {
  let prompt = `الموضوع: ${topic}\n\n`;

  if (context) {
    prompt += `السياق:\n${context}\n\n`;
  }

  if (previousArguments && previousArguments.length > 0) {
    prompt += `الحجج السابقة:\n`;
    previousArguments.forEach((arg, idx) => {
      prompt += `${idx + 1}. ${arg.agentName}: ${arg.position.substring(0, 200)}...\n`;
    });
    prompt += '\n';
  }

  switch (role) {
    case DebateRole.PROPOSER:
      prompt += 'قدم حجة قوية ومدعومة بالأدلة لدعم موقفك من هذا الموضوع.';
      break;
    case DebateRole.OPPONENT:
      prompt += 'قدم حجة مضادة مدعومة بالأدلة.';
      break;
    case DebateRole.SYNTHESIZER:
      prompt += 'حلل الحجج واستخلص رأياً موحداً.';
      break;
    default:
      prompt += 'قدم تحليلاً متوازناً للموضوع.';
  }

  return prompt;
}

/**
 * Build refutation prompt
 */
export function buildRefutationPrompt(
  args: DebateArgument[],
  context?: string
): string {
  let prompt = 'قم بتحليل ونقد الحجج التالية:\n\n';

  args.forEach((arg, idx) => {
    prompt += `**الحجة ${idx + 1}** (${arg.agentName}):\n`;
    prompt += `${arg.position}\n\n`;
  });

  if (context) {
    prompt += `\nالسياق:\n${context}\n\n`;
  }

  prompt += 'قدم رداً منطقياً يتضمن نقاط الضعف والحجج المضادة.';

  return prompt;
}

/**
 * Build voting prompt
 */
export function buildVotingPrompt(args: DebateArgument[], topic: string): string {
  let prompt = `الموضوع: ${topic}\n\nقيّم الحجج التالية (من 0 إلى 1):\n\n`;

  args.forEach((arg, idx) => {
    prompt += `${idx + 1}. ${arg.agentName}:\n${arg.position.substring(0, 300)}\n\n`;
  });

  prompt += 'أعطِ درجة لكل حجة بناءً على القوة المنطقية والأدلة.';

  return prompt;
}

/**
 * Extract reasoning from text
 */
export function extractReasoning(text: string): string {
  const patterns = [
    /لأن[^\.]+\./g,
    /بسبب[^\.]+\./g,
    /نظراً[^\.]+\./g,
  ];

  let reasoning = '';
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) {
      reasoning += matches.join(' ');
    }
  }

  return reasoning || text.substring(0, 200);
}

/**
 * Extract evidence from text
 */
export function extractEvidence(text: string): string[] {
  const evidence: string[] = [];
  const lines = text.split('\n');

  for (const line of lines) {
    if (line.match(/^[\-\*\•]\s/) || line.match(/^\d+[\.\)]\s/)) {
      evidence.push(line.trim());
    }
  }

  return evidence.slice(0, 5);
}

/**
 * Get synthesis from synthesizer agent
 */
export async function getSynthesizerAgentOutput(
  synthesizer: { executeTask: (input: { input: string; options?: Record<string, unknown> }) => Promise<{ text: string }> },
  args: DebateArgument[],
  topic: string
): Promise<string> {
  const prompt = `
الموضوع: ${topic}

قم بتوليف الحجج التالية في رأي موحد:

${args.map((arg, idx) => `
${idx + 1}. ${arg.agentName}:
${arg.position}
`).join('\n---\n')}

قدم توليفاً شاملاً يجمع أفضل ما في كل حجة.
`;

  const result = await synthesizer.executeTask({
    input: prompt,
    options: {
      temperature: 0.6,
      enableRAG: true,
    },
  });

  return result.text;
}

/**
 * Generate direct synthesis without synthesizer agent
 */
export function generateDirectSynthesis(
  args: DebateArgument[],
  topic: string
): string {
  let synthesis = `# توليف الآراء حول: ${topic}\n\n`;
  synthesis += `بناءً على ${args.length} حجة من المشاركين، نستنتج ما يلي:\n\n`;

  args.forEach((arg, idx) => {
    synthesis += `**${idx + 1}. ${arg.agentName}:**\n${arg.position.substring(0, 300)}...\n\n`;
  });

  return synthesis;
}

/**
 * Analyze consensus points from arguments
 */
export function analyzeConsensusPoints(
  _args: DebateArgument[],
  synthesisText: string
): { consensusPoints: string[]; disagreementPoints: string[] } {
  const consensusPoints: string[] = [];
  const disagreementPoints: string[] = [];

  const lines = synthesisText.split('\n');

  for (const line of lines) {
    if (line.includes('اتفاق') || line.includes('توافق')) {
      consensusPoints.push(line.trim());
    }
    if (line.includes('اختلاف') || line.includes('تعارض')) {
      disagreementPoints.push(line.trim());
    }
  }

  return { consensusPoints, disagreementPoints };
}

/**
 * Calculate agreement score
 */
export function calculateAgreementScore(
  args: DebateArgument[],
  consensusPoints: string[]
): number {
  if (args.length === 0) return 0;

  const avgConfidence =
    args.reduce((sum, arg) => sum + arg.confidence, 0) / args.length;

  const consensusRatio = Math.min(1, consensusPoints.length / args.length);

  return (avgConfidence * 0.6) + (consensusRatio * 0.4);
}

/**
 * Cache for compiled vote extraction regular expressions
 */
const voteRegexCache: RegExp[] = [];

/**
 * Parse votes from AI response
 */
export function parseVotesFromResponse(
  response: string,
  args: DebateArgument[],
  voterId: string
): Vote[] {
  const votes: Vote[] = [];

  args.forEach((arg, idx) => {
    let regex = voteRegexCache[idx];
    if (!regex) {
      regex = new RegExp(`${idx + 1}[\\s\\S]{0,50}(\\d+\\.?\\d*)`, 'i');
      voteRegexCache[idx] = regex;
    }

    const scoreMatch = response.match(regex);

    let score = 0.5;
    if (scoreMatch) {
      score = Math.min(1, Math.max(0, parseFloat(scoreMatch[1] ?? '0.5')));
    }

    votes.push({
      voterId,
      argumentId: arg.id,
      score,
      timestamp: new Date(),
    });
  });

  return votes;
}
