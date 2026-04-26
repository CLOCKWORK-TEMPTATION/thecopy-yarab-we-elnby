import { captureException as captureSentryException } from '@/config/sentry';

import { logger } from '../utils/logger';

// ============================================
// INTERFACES AND TYPES
// ============================================

export interface GuardrailViolation {
  type: 'prompt_injection' | 'pii' | 'harmful_content' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  pattern?: string;
  matches?: string[];
}

export interface PIIDetection {
  type: 'email' | 'phone' | 'ssn' | 'credit_card' | 'address' | 'name' | 'other';
  value: string;
  startIndex: number;
  endIndex: number;
  confidence: number;
}

export interface GuardrailResult {
  isAllowed: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  violations: GuardrailViolation[];
  warnings?: string[];
  sanitizedContent?: string;
}

export interface GuardrailMetrics {
  totalRequests: number;
  blockedRequests: number;
  violationsByType: Record<string, number>;
  violationsBySeverity: Record<string, number>;
  topPatterns: { pattern: string; count: number }[];
  recentViolations: GuardrailViolation[];
}

// ============================================
// DETECTION PATTERNS
// ============================================

// Prompt Injection Detection Patterns
// SECURITY: Using simple word-boundary patterns instead of .{0,100} to prevent ReDoS
const PROMPT_INJECTION_METRIC_PATTERN = 'ignore.*previous.*instructions';
const BANNED_PATTERNS = [
  /ignore\b.*?\bprevious\b.*?\binstructions/i,
  /you are now/i,
  /forget\b.*?\babove/i,
  /disregard\b.*?\binstructions/i,
  /system\b.*?\bprompt/i,
  /system\b.*?\boverride/i,
  /roleplay\b.*?\bas\b/i,
  /act\b.*?\bas\b.*?\bif/i,
  /override\b.*?\brestrictions/i,
  /reveal\b.*?\b(secrets?|training\s+data|system\s+prompt)\b/i,
  /debug\b.*?\bmode/i,
  /exploit\b.*?\bvulnerability/i,
  /hack\b.*?\bsystem/i,
  /malicious\b.*?\bcode/i,
];

// Maximum length of content to check against patterns to prevent ReDoS
const MAX_PATTERN_CHECK_LENGTH = 10000;

const SUSPICIOUS_PATTERNS = [
  /system|admin|root|bypass|override|debug|exploit|hack|malicious|vulnerabilit(?:y|ies)|injection|attack/gi,
];

// PII Detection Patterns
const PII_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  credit_card: /\b(?:\d[ -]*?){13,19}\b/g,
  address: /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct)\b/gi,
  name: /\b(?:Mr|Mrs|Ms|Dr)\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g,
  other: /(?!)/g,
};

// Harmful Content Patterns
const HARMFUL_CONTENT_PATTERNS = [
  /\b(fuck(?:ing)?|shit(?:ty)?|damn|bitch|asshole|cunt|motherfucker)\b/i,
  /\b(hate|kill|murder|violence|attack|destroy)\b/i,
  /\b(racist|discrimination|supremacy|genocide)\b/i,
  /\b(terrorist|bomb|explosive|weapon)\b/i,
  /\b(drugs|narcotics|cocaine|heroin|meth)\b/i,
  /\b(porn|sexual|nude|explicit|adult)\b/i,
];

// Hallucination Indicators
const HALLUCINATION_INDICATORS = [
  'i believe',
  'i think',
  'i feel',
  'i guess',
  'i suppose',
  'i assume',
  'it might',
  'it could',
  'it may',
  'it seems',
  'it appears',
  'probably',
  'possibly',
  'likely',
  'perhaps',
  'in my opinion',
  'in my experience',
  'in my view',
  'i don\'t know',
  'i do not know',
  'i don\'t remember',
  'i\'m not sure',
  'i\'m uncertain',
  'i\'m unsure',
  'it depends',
  'it varies',
  'it differs',
  'could be wrong',
  'might be incorrect',
  'might be mistaken',
  'might be wrong',
];

const FACTUAL_CLAIM_PATTERNS = [
  /\b100%\b/i,
  /\ball\s+critics\s+agree\b/i,
  /\balways\s+\w+/i,
  /\bdefinitely\b/i,
  /\bbest\s+\w+\s+ever\b/i,
];

const EXTERNAL_REFERENCE_PATTERN = /\b(?:https?:\/\/\S+|www\.\S+)\b/i;
const REPEATED_SUSPICIOUS_TOKENS = new Set([
  'admin',
  'attack',
  'bypass',
  'debug',
  'exploit',
  'hack',
  'injection',
  'malicious',
  'override',
  'root',
  'security',
  'system',
  'vulnerability',
  'vulnerabilities',
]);

// ============================================
// TYPE DEFINITIONS FOR INTERNAL USE
// ============================================

type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
interface CheckContext { userId?: string; requestType?: string }

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
  private readonly MAX_CONTENT_LENGTH = 100000; // 100KB max

  static getInstance(): LLMGuardrailsService {
    if (!LLMGuardrailsService.instance) {
      LLMGuardrailsService.instance = new LLMGuardrailsService();
    }

    return LLMGuardrailsService.instance;
  }

  // ============================================
  // PATTERN MATCHING HELPERS
  // ============================================

  /**
   * Matches content against banned prompt injection patterns
   */
  private detectPromptInjections(content: string): GuardrailViolation[] {
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

  /**
   * Detects suspicious patterns and returns warnings
   */
  private detectSuspiciousPatterns(content: string): string[] {
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
        acc[token] = (acc[token] || 0) + 1;
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

  /**
   * Detects harmful content patterns
   */
  private detectHarmfulContent(content: string): GuardrailViolation[] {
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

  /**
   * Detects hallucination indicator phrases
   */
  private detectHallucinationIndicators(content: string): string | null {
    const hallucinationPattern = new RegExp(HALLUCINATION_INDICATORS.join('|'), 'gi');
    const matches = content.match(hallucinationPattern);

    return matches
      ? `Potential hallucination indicators detected: ${matches.length}`
      : null;
  }

  private detectFactualClaims(content: string): string | null {
    for (const pattern of FACTUAL_CLAIM_PATTERNS) {
      if (pattern.test(content)) {
        return 'Potential factual claims require verification';
      }
    }

    return null;
  }

  private detectExternalReferences(content: string): string | null {
    return EXTERNAL_REFERENCE_PATTERN.test(content)
      ? 'External references detected and should be verified'
      : null;
  }

  private createWarningViolation(description: string): GuardrailViolation {
    return {
      type: 'other',
      severity: 'medium',
      description,
    };
  }

  // ============================================
  // RISK LEVEL DETERMINATION
  // ============================================

  /**
   * Determines the overall risk level from violations and warnings
   */
  private determineRiskLevel(violations: GuardrailViolation[], warnings: string[]): RiskLevel {
    const severities = violations.map(v => v.severity);

    if (severities.includes('critical')) return 'critical';
    if (severities.includes('high')) return 'high';
    if (severities.includes('medium') || warnings.length > 0) return 'medium';
    return 'low';
  }

  /**
   * Checks if the given risk level should block the request
   */
  private shouldBlock(riskLevel: RiskLevel): boolean {
    return riskLevel === 'critical' || riskLevel === 'high';
  }

  // ============================================
  // LOGGING AND REPORTING HELPERS
  // ============================================

  /**
   * Reports a blocked input to logs and Sentry
   */
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

  /**
   * Reports output processing results to logs and Sentry
   */
  private reportOutputProcessing(
    content: string,
    sanitizedContent: string,
    violations: GuardrailViolation[],
    warnings: string[],
    riskLevel: RiskLevel,
    piiDetected: boolean,
    context?: CheckContext
  ): void {
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

  // ============================================
  // PUBLIC API METHODS
  // ============================================

  /**
   * Validates input text for prompt injection attacks and other security issues
   */
  checkInput(content: string, context?: CheckContext): GuardrailResult {
    this.metrics.totalRequests++;

    const violations: GuardrailViolation[] = [];
    const warnings: string[] = [];

    // Check content length
    if (content.length > this.MAX_CONTENT_LENGTH) {
      violations.push({
        type: 'other',
        severity: 'high',
        description: `Content too large (${content.length} characters, max ${this.MAX_CONTENT_LENGTH})`,
      });
    }

    // Detect prompt injections
    violations.push(...this.detectPromptInjections(content));

    // Detect suspicious patterns
    warnings.push(...this.detectSuspiciousPatterns(content));

    // Determine risk and whether to block
    const riskLevel = this.determineRiskLevel(violations, warnings);
    const isAllowed = !this.shouldBlock(riskLevel);

    // Record metrics and report if blocked
    this.recordViolations(violations);

    if (!isAllowed) {
      this.reportBlockedInput(content, violations, riskLevel, context);
    }

    return { isAllowed, riskLevel, violations, warnings };
  }

  /**
   * Sanitizes output text to remove PII, harmful content, and hallucinations
   */
  checkOutput(content: string, context?: CheckContext): GuardrailResult {
    const violations: GuardrailViolation[] = [];
    const warnings: string[] = [];
    let sanitizedContent = content;

    // Detect and sanitize PII
    const piiDetections = this.detectPII(content);
    if (piiDetections.length > 0) {
      violations.push({
        type: 'pii',
        severity: 'high',
        description: `Detected ${piiDetections.length} pieces of personal information`,
        matches: piiDetections.map(p => p.value),
      });
      sanitizedContent = this.sanitizePII(content, piiDetections);
    }

    // Detect harmful content
    violations.push(...this.detectHarmfulContent(content));

    // Detect hallucination indicators
    const hallucinationWarning = this.detectHallucinationIndicators(content);
    if (hallucinationWarning) {
      warnings.push(hallucinationWarning);
      violations.push(this.createWarningViolation(hallucinationWarning));
    }

    const factualClaimWarning = this.detectFactualClaims(content);
    if (factualClaimWarning) {
      warnings.push(factualClaimWarning);
      violations.push(this.createWarningViolation(factualClaimWarning));
    }

    const externalReferenceWarning = this.detectExternalReferences(content);
    if (externalReferenceWarning) {
      warnings.push(externalReferenceWarning);
      violations.push(this.createWarningViolation(externalReferenceWarning));
    }

    // Determine risk level (output sanitization doesn't block, just sanitizes)
    const riskLevel = this.determineRiskLevel(violations, warnings);
    const isAllowed = true;
    const piiDetected = piiDetections.length > 0;

    // Record metrics and report
    this.recordViolations(violations);
    this.reportOutputProcessing(
      content, sanitizedContent, violations, warnings, riskLevel, piiDetected, context
    );

    return {
      isAllowed,
      riskLevel,
      violations,
      sanitizedContent: piiDetected ? sanitizedContent : content,
      warnings,
    };
  }

  /**
   * Detects PII in content
   */
  private detectPII(content: string): PIIDetection[] {
    const detections: PIIDetection[] = [];

    for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (match[0].length === 0) {
          pattern.lastIndex += 1;
          continue;
        }

        if (type === 'credit_card' && match[0].replace(/\D/g, '').length < 13) {
          continue;
        }

        detections.push({
          type: type as PIIDetection['type'],
          value: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          confidence: this.calculatePIIConfidence(type as PIIDetection['type'], match[0]),
        });
      }
    }

    return detections.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Calculates confidence score for PII detection
   */
  private calculatePIIConfidence(type: PIIDetection['type'], value: string): number {
    const baseConfidence = {
      email: 0.95,
      phone: 0.8,
      ssn: 0.9,
      credit_card: 0.85,
      address: 0.7,
      name: 0.6,
      other: 0.5,
    };

    let confidence = baseConfidence[type] || 0.5;

    // Increase confidence based on context
    if (type === 'email' && value.includes('.')) confidence += 0.05;
    if (type === 'phone' && value.replace(/\D/g, '').length >= 10) confidence += 0.1;
    if (type === 'credit_card' && this.isValidCreditCard(value)) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  /**
   * Validates credit card number using Luhn algorithm
   */
  private isValidCreditCard(value: string): boolean {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length < 13 || numbers.length > 19) return false;

    // Luhn algorithm
    let sum = 0;
    let isEven = false;
    for (let i = numbers.length - 1; i >= 0; i--) {
      const char = numbers[i];
      if (char) {
        let digit = parseInt(char, 10);
        if (isEven) {
          digit *= 2;
          if (digit > 9) digit -= 9;
        }
        sum += digit;
        isEven = !isEven;
      }
    }
    return sum % 10 === 0;
  }

  /**
   * Sanitizes PII from content
   */
  private sanitizePII(content: string, detections: PIIDetection[]): string {
    let sanitized = content;

    for (const detection of detections) {
      const replacement = this.getPIIReplacement(detection.type);
      sanitized = sanitized.replaceAll(detection.value, replacement);
    }

    return sanitized;
  }

  /**
   * Gets appropriate replacement for PII type
   */
  private getPIIReplacement(type: PIIDetection['type']): string {
    const replacements = {
      email: '[EMAIL_REDACTED]',
      phone: '[PHONE_REDACTED]',
      ssn: '[SSN_REDACTED]',
      credit_card: '[CREDIT_CARD_REDACTED]',
      address: '[ADDRESS_REDACTED]',
      name: '[NAME_REDACTED]',
      other: '[PII_REDACTED]',
    };

    return replacements[type] || '[REDACTED]';
  }

  /**
   * Records violations in metrics
   */
  private recordViolations(violations: GuardrailViolation[]): void {
    for (const violation of violations) {
      // Count by type
      this.metrics.violationsByType[violation.type] = 
        (this.metrics.violationsByType[violation.type] || 0) + 1;

      // Count by severity
      this.metrics.violationsBySeverity[violation.severity] = 
        (this.metrics.violationsBySeverity[violation.severity] || 0) + 1;

      // Track top patterns
      if (violation.pattern) {
        const existing = this.metrics.topPatterns.find(p => p.pattern === violation.pattern);
        if (existing) {
          existing.count++;
        } else {
          this.metrics.topPatterns.push({ pattern: violation.pattern, count: 1 });
        }
      }
    }

    // Add to recent violations
    this.metrics.recentViolations.push(...violations);
    
    // Keep only recent violations
    if (this.metrics.recentViolations.length > this.MAX_RECENT_VIOLATIONS) {
      this.metrics.recentViolations = this.metrics.recentViolations.slice(-this.MAX_RECENT_VIOLATIONS);
    }

    // Sort top patterns by count
    this.metrics.topPatterns.sort((a, b) => b.count - a.count);
    if (this.metrics.topPatterns.length > 10) {
      this.metrics.topPatterns = this.metrics.topPatterns.slice(0, 10);
    }
  }

  /**
   * Gets guardrail metrics
   */
  getMetrics(): GuardrailMetrics {
    return { ...this.metrics };
  }

  /**
   * Resets metrics
   */
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

  /**
   * Comprehensive content analysis (input and output)
   */
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

    // Determine overall risk
    const risks = [inputResult.riskLevel, outputResult.riskLevel];
    let overallRisk: 'low' | 'medium' | 'high' | 'critical' = 'low';

    if (risks.includes('critical')) {
      overallRisk = 'critical';
    } else if (risks.includes('high')) {
      overallRisk = 'high';
    } else if (risks.includes('medium')) {
      overallRisk = 'medium';
    }

    return {
      input: inputResult,
      output: outputResult,
      overallRisk,
    };
  }
}

// ============================================
// EXPORT SINGLETON INSTANCE
// ============================================

export const llmGuardrails = LLMGuardrailsService.getInstance();

// Backward compatibility - also export as default
export default llmGuardrails;
