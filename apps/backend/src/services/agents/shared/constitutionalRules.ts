/**
 * Constitutional Rules Engine
 * Advanced rules system with parameters, priorities, and dynamic learning
 */

import { logger } from "@/lib/logger";

export type RuleSeverity = "critical" | "major" | "minor" | "warning";
export type RulePriority = "high" | "medium" | "low";

export interface RuleParameter {
  name: string;
  type: "number" | "string" | "boolean" | "array";
  value: unknown;
  description: string;
}

export interface Rule {
  id: string;
  name: string;
  description: string;
  category: string;
  severity: RuleSeverity;
  priority: RulePriority;
  parameters: RuleParameter[];
  check: (
    text: string,
    context?: unknown,
    params?: Record<string, unknown>,
  ) => boolean | Promise<boolean>;
  suggest?: (text: string, context?: unknown) => string | Promise<string>;
  enabled: boolean;
}

export interface RuleViolation {
  ruleId: string;
  ruleName: string;
  severity: RuleSeverity;
  message: string;
  suggestion?: string;
  context?: string;
}

export interface RuleException {
  ruleId: string;
  condition: (context: unknown) => boolean;
  reason: string;
}

/**
 * Constitutional Rules Engine
 * Manages and applies constitutional rules with advanced features
 */
export class ConstitutionalRulesEngine {
  private rules = new Map<string, Rule>();
  private exceptions: RuleException[] = [];
  private violationHistory = new Map<string, number>();

  /**
   * Register a new rule
   */
  registerRule(rule: Rule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Register multiple rules
   */
  registerRules(rules: Rule[]): void {
    rules.forEach((rule) => this.registerRule(rule));
  }

  /**
   * Get a rule by ID
   */
  getRule(id: string): Rule | undefined {
    return this.rules.get(id);
  }

  /**
   * Get all rules
   */
  getAllRules(): Rule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get rules by category
   */
  getRulesByCategory(category: string): Rule[] {
    return Array.from(this.rules.values()).filter(
      (rule) => rule.category === category,
    );
  }

  /**
   * Enable or disable a rule
   */
  setRuleEnabled(id: string, enabled: boolean): void {
    const rule = this.rules.get(id);
    if (rule) {
      rule.enabled = enabled;
    }
  }

  /**
   * Update rule parameters
   */
  updateRuleParameters(id: string, parameters: Record<string, unknown>): void {
    const rule = this.rules.get(id);
    if (rule) {
      rule.parameters.forEach((param) => {
        if (param.name in parameters) {
          param.value = parameters[param.name];
        }
      });
    }
  }

  /**
   * Add a rule exception
   */
  addException(exception: RuleException): void {
    this.exceptions.push(exception);
  }

  /**
   * Check if a rule has an active exception for the given context
   */
  private hasException(ruleId: string, context: unknown): boolean {
    return this.exceptions.some(
      (exc) => exc.ruleId === ruleId && exc.condition(context),
    );
  }

  /**
   * Check text against all enabled rules
   */
  async checkRules(text: string, context?: unknown): Promise<RuleViolation[]> {
    // Get enabled rules sorted by priority
    const enabledRules = Array.from(this.rules.values())
      .filter((rule) => rule.enabled)
      .sort((a, b) => this.comparePriority(a.priority, b.priority));

    const evaluationPromises = enabledRules.map(async (rule) => {
      // Check if rule has an exception for this context
      if (this.hasException(rule.id, context)) {
        return null;
      }

      try {
        // Build parameters object from rule parameters
        const params: Record<string, unknown> = {};
        rule.parameters.forEach((param) => {
          params[param.name] = param.value;
        });

        // Check the rule
        const passed = await rule.check(text, context, params);

        if (!passed) {
          // Rule violated
          let suggestion: string | undefined;
          if (rule.suggest) {
            suggestion = await rule.suggest(text, context);
          }

          const violation: RuleViolation = {
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            message: rule.description,
            context:
              ((context as Record<string, unknown>)?.["agentName"] as string) ||
              "unknown",
          };

          if (suggestion !== undefined) {
            violation.suggestion = suggestion;
          }

          // Track violation
          this.trackViolation(rule.id);

          return violation;
        }
      } catch (error) {
        logger.error(`Error checking rule ${rule.id}:`, { error });
      }

      return null;
    });

    const results = await Promise.all(evaluationPromises);

    return results.filter((result): result is RuleViolation => result !== null);
  }

  /**
   * Compare rule priorities (high > medium > low)
   */
  private comparePriority(a: RulePriority, b: RulePriority): number {
    const priorities = { high: 3, medium: 2, low: 1 };
    return priorities[b] - priorities[a];
  }

  /**
   * Track rule violation for learning purposes
   */
  private trackViolation(ruleId: string): void {
    const count = this.violationHistory.get(ruleId) ?? 0;
    this.violationHistory.set(ruleId, count + 1);
  }

  /**
   * Get violation statistics
   */
  getViolationStats(): { ruleId: string; count: number }[] {
    return Array.from(this.violationHistory.entries())
      .map(([ruleId, count]) => ({ ruleId, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get most violated rules
   */
  getMostViolatedRules(limit = 5): Rule[] {
    const stats = this.getViolationStats().slice(0, limit);
    return stats
      .map((stat) => this.rules.get(stat.ruleId))
      .filter((rule): rule is Rule => rule !== undefined);
  }

  /**
   * Reset violation history
   */
  resetViolationHistory(): void {
    this.violationHistory.clear();
  }

  /**
   * Export rules configuration
   */
  exportConfig(): {
    rules: {
      id: string;
      name: string;
      enabled: boolean;
      parameters: RuleParameter[];
    }[];
    exceptions: RuleException[];
  } {
    return {
      rules: Array.from(this.rules.values()).map((rule) => ({
        id: rule.id,
        name: rule.name,
        enabled: rule.enabled,
        parameters: rule.parameters,
      })),
      exceptions: this.exceptions,
    };
  }

  /**
   * Import rules configuration
   */
  importConfig(config: {
    rules?: { id: string; enabled: boolean; parameters?: RuleParameter[] }[];
    exceptions?: RuleException[];
  }): void {
    if (config.rules) {
      config.rules.forEach((ruleConfig) => {
        const rule = this.rules.get(ruleConfig.id);
        if (rule) {
          rule.enabled = ruleConfig.enabled;
          if (ruleConfig.parameters) {
            rule.parameters = ruleConfig.parameters;
          }
        }
      });
    }

    if (config.exceptions) {
      this.exceptions = config.exceptions;
    }
  }
}

// Singleton instance
export const constitutionalRulesEngine = new ConstitutionalRulesEngine();
