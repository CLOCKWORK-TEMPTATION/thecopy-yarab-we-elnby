/**
 * Rule Applicator
 * Applies constitutional rules with context, priority handling, and exceptions
 */

import { logger } from '@/lib/logger';
import { geminiService } from '@/services/gemini.service';

import {
  ConstitutionalRulesEngine,
  Rule,
  RuleViolation,
  RuleSeverity,
} from './constitutionalRules';

export interface RuleApplicationResult {
  violations: RuleViolation[];
  correctedText?: string;
  applied: boolean;
  summary: string;
}

export interface RuleApplicationOptions {
  autoCorrect?: boolean;
  severityFilter?: RuleSeverity[];
  maxCorrections?: number;
  includeWarnings?: boolean;
}

/**
 * Apply rules with context and generate corrections
 */
export async function applyRulesWithContext(
  text: string,
  engine: ConstitutionalRulesEngine,
  context?: unknown,
  options: RuleApplicationOptions = {}
): Promise<RuleApplicationResult> {
  const {
    autoCorrect = false,
    severityFilter = ['critical', 'major', 'minor'],
    maxCorrections = 3,
    includeWarnings = true,
  } = options;

  // Check rules
  const allViolations = await engine.checkRules(text, context);

  // Filter by severity
  const violations = allViolations.filter(v =>
    includeWarnings || v.severity !== 'warning'
  ).filter(v =>
    severityFilter.includes(v.severity)
  );

  if (violations.length === 0) {
    return {
      violations: [],
      applied: true,
      summary: 'النص يلتزم بجميع القواعد الدستورية',
    };
  }

  let correctedText: string | undefined;

  // Auto-correct if enabled and violations exist
  if (autoCorrect && violations.length > 0) {
    correctedText = await correctViolations(
      text,
      violations.slice(0, maxCorrections),
      context
    );
  }

  // Generate summary
  const summary = generateViolationSummary(violations);

  return {
    violations,
    correctedText: correctedText || undefined,
    applied: violations.length === 0,
    summary,
  };
}

/**
 * Correct text based on violations
 */
async function correctViolations(
  text: string,
  violations: RuleViolation[],
  _context?: unknown
): Promise<string> {
  if (violations.length === 0) {
    return text;
  }

  const violationDescriptions = violations
    .map(v => `- ${v.ruleName}: ${v.message}${v.suggestion ? ` (${v.suggestion})` : ''}`)
    .join('\n');

  const correctionPrompt = `
النص التالي يحتوي على انتهاكات للقواعد الدستورية:

${violationDescriptions}

النص:
${text.substring(0, 2000)}

قم بتصحيح النص مع الحفاظ على المعنى الأساسي ولكن معالجة الانتهاكات المذكورة.
قدم النص المصحح فقط بدون تعليقات إضافية.
  `.trim();

  try {
    const correctedText = await geminiService.analyzeText(
      correctionPrompt,
      'general'
    );
    return correctedText;
  } catch (error) {
    logger.error('Failed to correct violations:', { error });
    return text;
  }
}

/**
 * Generate summary of violations
 */
function generateViolationSummary(violations: RuleViolation[]): string {
  if (violations.length === 0) {
    return 'لا توجد انتهاكات';
  }

  const bySeverity = violations.reduce((acc, v) => {
    acc[v.severity] = (acc[v.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const parts: string[] = [];

  if (bySeverity.critical) {
    parts.push(`${bySeverity.critical} حرج`);
  }
  if (bySeverity.major) {
    parts.push(`${bySeverity.major} رئيسي`);
  }
  if (bySeverity.minor) {
    parts.push(`${bySeverity.minor} ثانوي`);
  }
  if (bySeverity.warning) {
    parts.push(`${bySeverity.warning} تحذير`);
  }

  return `تم اكتشاف ${violations.length} انتهاك: ${parts.join(', ')}`;
}

/**
 * Rule Priority Handler
 * Determines which rules should be applied first based on priority
 */
export class RulePriorityHandler {
  /**
   * Sort rules by priority (high > medium > low) and severity
   */
  static sortByPriority(rules: Rule[]): Rule[] {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const severityOrder = { critical: 4, major: 3, minor: 2, warning: 1 };

    return [...rules].sort((a, b) => {
      // First sort by priority
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by severity
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      return severityDiff;
    });
  }

  /**
   * Get critical rules only
   */
  static getCriticalRules(rules: Rule[]): Rule[] {
    return rules.filter(r => r.severity === 'critical');
  }

  /**
   * Get high priority rules
   */
  static getHighPriorityRules(rules: Rule[]): Rule[] {
    return rules.filter(r => r.priority === 'high');
  }
}

/**
 * Rule Exception Handler
 * Manages exceptions to rules based on context
 */
export class RuleExceptionHandler {
  /**
   * Check if a specific context should exempt from a rule
   */
  static shouldExempt(
    ruleId: string,
    context: unknown,
    exemptionRules: {
      ruleId: string;
      condition: (ctx: unknown) => boolean;
    }[]
  ): boolean {
    return exemptionRules.some(
      exemption =>
        exemption.ruleId === ruleId && exemption.condition(context)
    );
  }

  /**
   * Create common exemptions
   */
  static createCommonExemptions() {
    return [
      {
        ruleId: 'char-no-anachronistic-psychology',
        condition: (ctx: unknown) => {
          const c = ctx as Record<string, unknown> | null;
          return c?.genre === 'fantasy' || c?.genre === 'sci-fi';
        },
      },
      {
        ruleId: 'dialogue-dialect-awareness',
        condition: (ctx: unknown) => {
          const c = ctx as Record<string, unknown> | null;
          return c?.setting === 'contemporary' && c?.language === 'formal';
        },
      },
    ];
  }
}
