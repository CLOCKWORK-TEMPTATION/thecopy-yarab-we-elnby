import { captureException as captureSentryException } from '@/config/sentry';

import { logger } from '../utils/logger';
import {
  detectPromptInjections,
  detectSuspiciousPatterns,
  detectHarmfulContent,
  detectHallucinationIndicators,
  detectFactualClaims,
  detectExternalReferences,
  createWarningViolation,
  determineRiskLevel,
  shouldBlock,
} from './llm-guardrails.detection';
import { detectPII, sanitizePII } from './llm-guardrails.pii';
import type {
  GuardrailViolation,
  GuardrailResult,
  GuardrailMetrics,
  RiskLevel,
  CheckContext,
} from './llm-guardrails.types';

export type {
  GuardrailViolation,
  PIIDetection,
  GuardrailResult,
  GuardrailMetrics,
} from './llm-guardrails.types';

// ============================================
// INTERNAL TYPES
// ============================================

interface OutputProcessingReport {
  content: string;
  sanitizedContent: string;
  violations: GuardrailViolation[];
  warnings: string[];
  riskLevel: RiskLevel;
  piiDetected: boolean;
  context?: CheckContext;
}

// ============================================
// MAIN SERVICE CLASS
// ============================================

export class LLMGuardrailsService {
  private static instance: LLMGuardrailsService | null = null;

  private metrics: GuardrailMetrics = {
    totalRequests: 0,
    blockedRequests: 0,
    violationsByType: {},
    violationsBySeverity: {},
    topPatterns: [],
    recentViolations: [],
  };

  private readonly MAX_RECENT_VIOLATIONS = 100;
  private readonly MAX_CONTENT_LENGTH = 100000;

  static getInstance(): LLMGuardrailsService {
    LLMGuardrailsService.instance ??= new LLMGuardrailsService();
    return LLMGuardrailsService.instance;
  }

  private reportBlockedInput(
    content: string,
    violations: GuardrailViolation[],
    riskLevel: RiskLevel,
    context?: CheckContext
  ): void {
    this.metrics.blockedRequests++;

    logger.warn('LLM Input blocked by guardrails', {
      userId: context?.userId,
      requestType: context?.requestType,
      violations: violations.length,
      riskLevel,
    });

    captureSentryException(new Error('Input validation failed'), {
      violations,
      input: content.substring(0, 500),
      riskLevel,
      context,
      extra: {
        violations,
        input: content.substring(0, 500),
        riskLevel,
        context,
      },
    });
  }

  private reportOutputProcessing(report: OutputProcessingReport): void {
    const { content, sanitizedContent, violations, warnings, riskLevel, piiDetected, context } = report;

    logger.info('LLM Output processed by guardrails', {
      userId: context?.userId,
      requestType: context?.requestType,
      violations: violations.length,
      warnings: warnings.length,
      riskLevel,
      piiDetected,
    });

    if (violations.length > 0) {
      captureSentryException(new Error('Output sanitization required'), {
        violations,
        warnings,
        originalLength: content.length,
        sanitizedLength: sanitizedContent.length,
        riskLevel,
        context,
        extra: {
          violations,
          warnings,
          originalLength: content.length,
          sanitizedLength: sanitizedContent.length,
          riskLevel,
          context,
        },
      });
    }
  }

  checkInput(content: string, context?: CheckContext): GuardrailResult {
    this.metrics.totalRequests++;

    const violations: GuardrailViolation[] = [];
    const warnings: string[] = [];

    if (content.length > this.MAX_CONTENT_LENGTH) {
      violations.push({
        type: 'other',
        severity: 'high',
        description: `Content too large (${content.length} characters, max ${this.MAX_CONTENT_LENGTH})`,
      });
    }

    violations.push(...detectPromptInjections(content));
    warnings.push(...detectSuspiciousPatterns(content));

    const riskLevel = determineRiskLevel(violations, warnings);
    const isAllowed = !shouldBlock(riskLevel);

    this.recordViolations(violations);

    if (!isAllowed) {
      this.reportBlockedInput(content, violations, riskLevel, context);
    }

    return { isAllowed, riskLevel, violations, warnings };
  }

  checkOutput(content: string, context?: CheckContext): GuardrailResult {
    const violations: GuardrailViolation[] = [];
    const warnings: string[] = [];
    let sanitizedContent = content;

    const piiDetections = detectPII(content);
    if (piiDetections.length > 0) {
      violations.push({
        type: 'pii',
        severity: 'high',
        description: `Detected ${piiDetections.length} pieces of personal information`,
        matches: piiDetections.map(p => p.value),
      });
      sanitizedContent = sanitizePII(content, piiDetections);
    }

    violations.push(...detectHarmfulContent(content));

    const hallucinationWarning = detectHallucinationIndicators(content);
    if (hallucinationWarning) {
      warnings.push(hallucinationWarning);
      violations.push(createWarningViolation(hallucinationWarning));
    }

    const factualClaimWarning = detectFactualClaims(content);
    if (factualClaimWarning) {
      warnings.push(factualClaimWarning);
      violations.push(createWarningViolation(factualClaimWarning));
    }

    const externalReferenceWarning = detectExternalReferences(content);
    if (externalReferenceWarning) {
      warnings.push(externalReferenceWarning);
      violations.push(createWarningViolation(externalReferenceWarning));
    }

    const riskLevel = determineRiskLevel(violations, warnings);
    const piiDetected = piiDetections.length > 0;

    this.recordViolations(violations);
    this.reportOutputProcessing({
      content,
      sanitizedContent,
      violations,
      warnings,
      riskLevel,
      piiDetected,
      ...(context ? { context } : {}),
    });

    return {
      isAllowed: true,
      riskLevel,
      violations,
      sanitizedContent: piiDetected ? sanitizedContent : content,
      warnings,
    };
  }

  private recordViolations(violations: GuardrailViolation[]): void {
    for (const violation of violations) {
      this.metrics.violationsByType[violation.type] =
        (this.metrics.violationsByType[violation.type] ?? 0) + 1;
      this.metrics.violationsBySeverity[violation.severity] =
        (this.metrics.violationsBySeverity[violation.severity] ?? 0) + 1;

      if (violation.pattern) {
        const existing = this.metrics.topPatterns.find(p => p.pattern === violation.pattern);
        if (existing) {
          existing.count++;
        } else {
          this.metrics.topPatterns.push({ pattern: violation.pattern, count: 1 });
        }
      }
    }

    this.metrics.recentViolations.push(...violations);
    if (this.metrics.recentViolations.length > this.MAX_RECENT_VIOLATIONS) {
      this.metrics.recentViolations = this.metrics.recentViolations.slice(-this.MAX_RECENT_VIOLATIONS);
    }

    this.metrics.topPatterns.sort((a, b) => b.count - a.count);
    if (this.metrics.topPatterns.length > 10) {
      this.metrics.topPatterns = this.metrics.topPatterns.slice(0, 10);
    }
  }

  getMetrics(): GuardrailMetrics {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      blockedRequests: 0,
      violationsByType: {},
      violationsBySeverity: {},
      topPatterns: [],
      recentViolations: [],
    };
  }

  comprehensiveCheck(
    input: string,
    output: string,
    context?: { userId?: string; requestType?: string }
  ): {
    input: GuardrailResult;
    output: GuardrailResult;
    overallRisk: 'low' | 'medium' | 'high' | 'critical';
  } {
    const inputResult = this.checkInput(input, context);
    const outputResult = this.checkOutput(output, context);

    const risks = [inputResult.riskLevel, outputResult.riskLevel];
    let overallRisk: 'low' | 'medium' | 'high' | 'critical' = 'low';

    if (risks.includes('critical')) overallRisk = 'critical';
    else if (risks.includes('high')) overallRisk = 'high';
    else if (risks.includes('medium')) overallRisk = 'medium';

    return { input: inputResult, output: outputResult, overallRisk };
  }
}

// ============================================
// EXPORT SINGLETON INSTANCE
// ============================================

export const llmGuardrails = LLMGuardrailsService.getInstance();
