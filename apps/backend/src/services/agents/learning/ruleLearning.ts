/**
 * Rule Learning System
 * Dynamic learning and adaptation of constitutional rules
 */

import { Rule, RuleViolation, RuleSeverity } from '../shared/constitutionalRules';

export interface RulePerformanceMetrics {
  ruleId: string;
  violationCount: number;
  falsePositiveCount: number;
  lastViolation?: Date;
  avgConfidence: number;
  contexts: string[];
}

export interface RuleAdjustmentSuggestion {
  ruleId: string;
  adjustment: 'tighten' | 'loosen' | 'disable' | 'modify_params';
  reason: string;
  confidence: number;
  suggestedParams?: Record<string, unknown>;
}

/**
 * Rule Learning System
 * Tracks violations and suggests rule adjustments
 */
export class RuleLearningSystem {
  private performanceMetrics = new Map<string, RulePerformanceMetrics>();
  private violationPatterns = new Map<string, ViolationPattern[]>();

  /**
   * Track a rule violation
   */
  trackRuleViolation(
    ruleId: string,
    violation: RuleViolation,
    context?: unknown
  ): void {
    // Update performance metrics
    let metrics = this.performanceMetrics.get(ruleId);

    if (!metrics) {
      metrics = {
        ruleId,
        violationCount: 0,
        falsePositiveCount: 0,
        avgConfidence: 0,
        contexts: [],
      };
      this.performanceMetrics.set(ruleId, metrics);
    }

    metrics.violationCount++;
    metrics.lastViolation = new Date();

    const ctx = context as Record<string, string> | undefined;
    if (ctx?.agentName && !metrics.contexts.includes(ctx.agentName)) {
      metrics.contexts.push(ctx.agentName);
    }

    // Track pattern
    this.trackPattern(ruleId, violation, context);
  }

  /**
   * Track a false positive (user-reported)
   */
  trackFalsePositive(ruleId: string): void {
    const metrics = this.performanceMetrics.get(ruleId);
    if (metrics) {
      metrics.falsePositiveCount++;
    }
  }

  /**
   * Track violation pattern
   */
  private trackPattern(
    ruleId: string,
    violation: RuleViolation,
    context?: unknown
  ): void {
    let patterns = this.violationPatterns.get(ruleId);

    if (!patterns) {
      patterns = [];
      this.violationPatterns.set(ruleId, patterns);
    }

    patterns.push({
      timestamp: new Date(),
      severity: violation.severity,
      context: (context as Record<string, string> | undefined)?.agentName ?? 'unknown',
      message: violation.message,
    });

    // Keep only last 100 patterns
    if (patterns.length > 100) {
      patterns.shift();
    }
  }

  /**
   * Suggest rule adjustments based on performance
   */
  suggestRuleAdjustments(
    rules: Rule[]
  ): RuleAdjustmentSuggestion[] {
    const suggestions: RuleAdjustmentSuggestion[] = [];

    for (const rule of rules) {
      const metrics = this.performanceMetrics.get(rule.id);
      if (!metrics) {
        continue;
      }
      this.collectSuggestionsForRule(rule, metrics, suggestions);
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Collect adjustment suggestions for a single rule
   */
  private collectSuggestionsForRule(
    rule: Rule,
    metrics: RulePerformanceMetrics,
    suggestions: RuleAdjustmentSuggestion[]
  ): void {
    this.checkHighFalsePositiveRate(rule, metrics, suggestions);
    this.checkFrequentViolations(rule, metrics, suggestions);
    this.checkNeverViolated(rule, metrics, suggestions);
    this.checkRareContextViolations(rule, metrics, suggestions);
  }

  /** Too many false positives -> loosen or disable */
  private checkHighFalsePositiveRate(
    rule: Rule, metrics: RulePerformanceMetrics, suggestions: RuleAdjustmentSuggestion[]
  ): void {
    if (metrics.falsePositiveCount > 5 &&
        metrics.falsePositiveCount / metrics.violationCount > 0.3) {
      suggestions.push({
        ruleId: rule.id, adjustment: 'loosen',
        reason: 'معدل إيجابيات خاطئة مرتفع', confidence: 0.8,
      });
    }
  }

  /** Very frequent violations -> may need stricter params */
  private checkFrequentViolations(
    rule: Rule, metrics: RulePerformanceMetrics, suggestions: RuleAdjustmentSuggestion[]
  ): void {
    if (metrics.violationCount > 50) {
      const patterns = this.violationPatterns.get(rule.id) ?? [];
      const recentPatterns = patterns.slice(-20);
      if (this.analyzePatternConsistency(recentPatterns)) {
        suggestions.push({
          ruleId: rule.id, adjustment: 'modify_params',
          reason: 'أنماط انتهاك متسقة في سياقات محددة', confidence: 0.7,
          suggestedParams: this.suggestParameterAdjustments(rule, recentPatterns),
        });
      }
    }
  }

  /** Never violated -> maybe too strict */
  private checkNeverViolated(
    rule: Rule, metrics: RulePerformanceMetrics, suggestions: RuleAdjustmentSuggestion[]
  ): void {
    if (metrics.violationCount === 0 && metrics.contexts.length > 10) {
      suggestions.push({
        ruleId: rule.id, adjustment: 'loosen',
        reason: 'لم يتم تفعيل القاعدة مطلقاً رغم الاستخدام المتكرر', confidence: 0.6,
      });
    }
  }

  /** Rarely violated in specific contexts -> consider exception */
  private checkRareContextViolations(
    rule: Rule, metrics: RulePerformanceMetrics, suggestions: RuleAdjustmentSuggestion[]
  ): void {
    if (metrics.violationCount < 5 && metrics.violationCount > 0 && metrics.contexts.length === 1) {
      suggestions.push({
        ruleId: rule.id, adjustment: 'modify_params',
        reason: `انتهاكات نادرة في سياق محدد: ${metrics.contexts[0]}`, confidence: 0.5,
      });
    }
  }

  /**
   * Analyze pattern consistency
   */
  private analyzePatternConsistency(patterns: ViolationPattern[]): boolean {
    if (patterns.length < 5) {
      return false;
    }

    // Check if patterns occur in same context
    const contexts = patterns.map(p => p.context);
    const uniqueContexts = new Set(contexts);

    return uniqueContexts.size <= 2; // Consistent if in 1-2 contexts
  }

  /**
   * Suggest parameter adjustments based on patterns
   */
  private suggestParameterAdjustments(
    rule: Rule,
    patterns: ViolationPattern[]
  ): Record<string, unknown> {
    const adjustments: Record<string, unknown> = {};

    // Analyze patterns to determine adjustments
    // This is a simplified heuristic

    for (const param of rule.parameters) {
      if (param.type === 'number') {
        // Suggest increasing/decreasing numeric thresholds
        if (patterns.length > 10) {
          adjustments[param.name] = param.value * 1.2; // Loosen by 20%
        }
      }
    }

    return adjustments;
  }

  /**
   * Get performance metrics for a rule
   */
  getMetrics(ruleId: string): RulePerformanceMetrics | undefined {
    return this.performanceMetrics.get(ruleId);
  }

  /**
   * Get all performance metrics
   */
  getAllMetrics(): RulePerformanceMetrics[] {
    return Array.from(this.performanceMetrics.values());
  }

  /**
   * Get most violated rules
   */
  getMostViolatedRules(limit = 10): RulePerformanceMetrics[] {
    return Array.from(this.performanceMetrics.values())
      .sort((a, b) => b.violationCount - a.violationCount)
      .slice(0, limit);
  }

  /**
   * Get rules with high false positive rate
   */
  getProblematicRules(threshold = 0.3): RulePerformanceMetrics[] {
    return Array.from(this.performanceMetrics.values())
      .filter(m => {
        const rate = m.violationCount > 0
          ? m.falsePositiveCount / m.violationCount
          : 0;
        return rate > threshold;
      });
  }

  /**
   * Reset learning data
   */
  reset(): void {
    this.performanceMetrics.clear();
    this.violationPatterns.clear();
  }

  /**
   * Export learning data
   */
  export(): unknown {
    return {
      metrics: Array.from(this.performanceMetrics.entries()),
      patterns: Array.from(this.violationPatterns.entries()),
    };
  }

  /**
   * Import learning data
   */
  import(data: Record<string, unknown>): void {
    if (data.metrics) {
      this.performanceMetrics = new Map(data.metrics as [string, RulePerformanceMetrics][]);
    }
    if (data.patterns) {
      this.violationPatterns = new Map(data.patterns as [string, ViolationPattern[]][]);
    }
  }
}

interface ViolationPattern {
  timestamp: Date;
  severity: RuleSeverity;
  context: string;
  message: string;
}

// Singleton instance
export const ruleLearningSystem = new RuleLearningSystem();
