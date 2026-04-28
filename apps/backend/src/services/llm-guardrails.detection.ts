// Pure detection functions for LLM Guardrails Service

import type { GuardrailViolation, RiskLevel } from './llm-guardrails.types';
import {
  BANNED_PATTERNS,
  HARMFUL_CONTENT_PATTERNS,
  HALLUCINATION_INDICATORS,
  FACTUAL_CLAIM_PATTERNS,
  EXTERNAL_REFERENCE_PATTERN,
  SUSPICIOUS_PATTERNS,
  REPEATED_SUSPICIOUS_TOKENS,
  MAX_PATTERN_CHECK_LENGTH,
  PROMPT_INJECTION_METRIC_PATTERN,
} from './llm-guardrails.patterns';

export function detectPromptInjections(content: string): GuardrailViolation[] {
  const contentToCheck = content.substring(0, MAX_PATTERN_CHECK_LENGTH);
  const violations: GuardrailViolation[] = [];

  for (const pattern of BANNED_PATTERNS) {
    try {
      pattern.lastIndex = 0;
      const matches = contentToCheck.match(pattern);
      if (matches) {
        violations.push({
          type: 'prompt_injection',
          severity: 'critical',
          description: `Prompt injection detected: ${pattern.source}`,
          pattern: PROMPT_INJECTION_METRIC_PATTERN,
          matches,
        });
      }
    } catch {
      // Skip invalid patterns
    }
  }

  return violations;
}

export function detectSuspiciousPatterns(content: string): string[] {
  const warnings: string[] = [];

  for (const pattern of SUSPICIOUS_PATTERNS) {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      warnings.push(`Suspicious patterns detected: ${matches.length} matches for ${pattern.source}`);
    }
  }

  const repeatedTokens = content
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .reduce<Record<string, number>>((acc, token) => {
      acc[token] = (acc[token] ?? 0) + 1;
      return acc;
    }, {});

  const noisyToken = Object.entries(repeatedTokens).find(
    ([token, count]) => count >= 20 && REPEATED_SUSPICIOUS_TOKENS.has(token)
  );
  if (noisyToken) {
    warnings.push(`Repeated pattern detected for token: ${noisyToken[0]}`);
  }

  return warnings;
}

export function detectHarmfulContent(content: string): GuardrailViolation[] {
  const violations: GuardrailViolation[] = [];

  for (const pattern of HARMFUL_CONTENT_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      violations.push({
        type: 'harmful_content',
        severity: 'medium',
        description: 'Potentially harmful content detected',
        pattern: pattern.source,
        matches,
      });
    }
  }

  return violations;
}

export function detectHallucinationIndicators(content: string): string | null {
  const hallucinationPattern = new RegExp(HALLUCINATION_INDICATORS.join('|'), 'gi');
  const matches = content.match(hallucinationPattern);
  return matches
    ? `Potential hallucination indicators detected: ${matches.length}`
    : null;
}

export function detectFactualClaims(content: string): string | null {
  for (const pattern of FACTUAL_CLAIM_PATTERNS) {
    if (pattern.test(content)) {
      return 'Potential factual claims require verification';
    }
  }
  return null;
}

export function detectExternalReferences(content: string): string | null {
  return EXTERNAL_REFERENCE_PATTERN.test(content)
    ? 'External references detected and should be verified'
    : null;
}

export function createWarningViolation(description: string): GuardrailViolation {
  return { type: 'other', severity: 'medium', description };
}

export function determineRiskLevel(
  violations: GuardrailViolation[],
  warnings: string[]
): RiskLevel {
  const severities = violations.map(v => v.severity);
  if (severities.includes('critical')) return 'critical';
  if (severities.includes('high')) return 'high';
  if (severities.includes('medium') || warnings.length > 0) return 'medium';
  return 'low';
}

export function shouldBlock(riskLevel: RiskLevel): boolean {
  return riskLevel === 'critical' || riskLevel === 'high';
}
