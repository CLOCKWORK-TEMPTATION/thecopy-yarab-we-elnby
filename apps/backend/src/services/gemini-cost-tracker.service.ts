/**
 * Gemini Cost Tracker Service
 *
 * Tracks token usage and costs for Gemini API calls
 * Implements alerts for daily and monthly cost thresholds
 */

import { Counter, Gauge } from 'prom-client';
import { logger } from '@/utils/logger';
import { register } from '@/middleware/metrics.middleware';
import { cacheService } from './cache.service';

// ===== Gemini Pricing Constants (Gemini 2.0 Flash) =====
// Prices per 1M tokens
const PRICING = {
  INPUT_PER_MILLION: 0.075,   // $0.075 per 1M input tokens
  OUTPUT_PER_MILLION: 0.30,   // $0.30 per 1M output tokens
};

// ===== Cost Thresholds =====
const THRESHOLDS = {
  DAILY_COST_LIMIT: 10.0,              // $10/day
  MONTHLY_QUOTA_WARNING: 0.80,         // 80% of monthly quota
  DEFAULT_MONTHLY_BUDGET: 300.0,       // $300/month default
};

// ===== Prometheus Metrics =====

/**
 * Total tokens used (input + output)
 */
export const geminiTokensTotal = new Counter({
  name: 'the_copy_gemini_tokens_total',
  help: 'Total number of Gemini API tokens used',
  labelNames: ['type'], // 'input' or 'output'
  registers: [register],
});

/**
 * Total cost in USD
 */
export const geminiCostTotal = new Counter({
  name: 'the_copy_gemini_cost_usd_total',
  help: 'Total cost of Gemini API usage in USD',
  labelNames: ['period'], // 'daily' or 'monthly'
  registers: [register],
});

/**
 * Current daily cost
 */
export const geminiDailyCost = new Gauge({
  name: 'the_copy_gemini_daily_cost_usd',
  help: 'Current daily Gemini API cost in USD',
  registers: [register],
});

/**
 * Current monthly cost
 */
export const geminiMonthlyCost = new Gauge({
  name: 'the_copy_gemini_monthly_cost_usd',
  help: 'Current monthly Gemini API cost in USD',
  registers: [register],
});

/**
 * Cost alerts counter
 */
export const geminiCostAlerts = new Counter({
  name: 'the_copy_gemini_cost_alerts_total',
  help: 'Total number of cost alerts triggered',
  labelNames: ['type'], // 'daily_limit' or 'monthly_quota'
  registers: [register],
});

// ===== Interfaces =====

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  timestamp: number;
}

interface UsagePeriod {
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  cost: number;
  requestCount: number;
  lastUpdated: number;
}

// ===== Gemini Cost Tracker Service =====

export class GeminiCostTrackerService {
  private readonly DAILY_KEY_PREFIX = 'gemini:usage:daily:';
  private readonly MONTHLY_KEY_PREFIX = 'gemini:usage:monthly:';
  private readonly ALERT_KEY_PREFIX = 'gemini:alert:';

  // In-memory fallback for when Redis is unavailable
  private memoryStore: Map<string, UsagePeriod> = new Map();

  // Monthly budget (can be configured via environment)
  private monthlyBudget: number = THRESHOLDS.DEFAULT_MONTHLY_BUDGET;

  constructor() {
    // Could load monthly budget from env or config
    logger.info('Gemini Cost Tracker initialized', {
      dailyLimit: THRESHOLDS.DAILY_COST_LIMIT,
      monthlyBudget: this.monthlyBudget,
      warningThreshold: THRESHOLDS.MONTHLY_QUOTA_WARNING,
    });
  }

  /**
   * Calculate cost from token usage
   */
  private calculateCost(inputTokens: number, outputTokens: number): number {
    const inputCost = (inputTokens / 1_000_000) * PRICING.INPUT_PER_MILLION;
    const outputCost = (outputTokens / 1_000_000) * PRICING.OUTPUT_PER_MILLION;
    return inputCost + outputCost;
  }

  /**
   * Get current date key (YYYY-MM-DD)
   */
  private getDailyKey(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Get current month key (YYYY-MM)
   */
  private getMonthlyKey(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Get usage from cache or memory
   */
  private async getUsage(key: string): Promise<UsagePeriod | null> {
    try {
      const cached = await cacheService.get<UsagePeriod>(key);
      if (cached) {
        return cached;
      }
    } catch (error) {
      logger.debug('Cache unavailable, using memory store', { key });
    }

    // Fallback to memory store
    return this.memoryStore.get(key) || null;
  }

  /**
   * Save usage to cache and memory
   */
  private async saveUsage(key: string, usage: UsagePeriod, ttl: number): Promise<void> {
    try {
      await cacheService.set(key, usage, ttl);
    } catch (error) {
      logger.debug('Cache unavailable, saving to memory store only', { key });
    }

    // Always save to memory as backup
    this.memoryStore.set(key, usage);
  }

  /**
   * Track token usage and cost
   */
  async trackUsage(
    inputTokens: number,
    outputTokens: number,
    analysisType?: string
  ): Promise<TokenUsage> {
    const totalTokens = inputTokens + outputTokens;
    const cost = this.calculateCost(inputTokens, outputTokens);
    const timestamp = Date.now();

    // Update Prometheus metrics
    geminiTokensTotal.inc({ type: 'input' }, inputTokens);
    geminiTokensTotal.inc({ type: 'output' }, outputTokens);

    // Track daily usage
    await this.updateDailyUsage(inputTokens, outputTokens, cost);

    // Track monthly usage
    await this.updateMonthlyUsage(inputTokens, outputTokens, cost);

    logger.info('Gemini API usage tracked', {
      inputTokens,
      outputTokens,
      totalTokens,
      cost: cost.toFixed(4),
      analysisType,
    });

    return {
      inputTokens,
      outputTokens,
      totalTokens,
      cost,
      timestamp,
    };
  }

  /**
   * Update daily usage and check daily limit
   */
  private async updateDailyUsage(
    inputTokens: number,
    outputTokens: number,
    cost: number
  ): Promise<void> {
    const dailyKey = this.DAILY_KEY_PREFIX + this.getDailyKey();
    const existing = await this.getUsage(dailyKey);

    const updated: UsagePeriod = existing
      ? {
        tokens: {
          input: existing.tokens.input + inputTokens,
          output: existing.tokens.output + outputTokens,
          total: existing.tokens.total + inputTokens + outputTokens,
        },
        cost: existing.cost + cost,
        requestCount: existing.requestCount + 1,
        lastUpdated: Date.now(),
      }
      : {
        tokens: {
          input: inputTokens,
          output: outputTokens,
          total: inputTokens + outputTokens,
        },
        cost,
        requestCount: 1,
        lastUpdated: Date.now(),
      };

    // Save with 25 hour TTL (expires next day)
    await this.saveUsage(dailyKey, updated, 25 * 60 * 60);

    // Update gauge
    geminiDailyCost.set(updated.cost);

    // Check daily limit
    if (updated.cost >= THRESHOLDS.DAILY_COST_LIMIT) {
      await this.triggerDailyLimitAlert(updated.cost);
    }
  }

  /**
   * Update monthly usage and check monthly quota
   */
  private async updateMonthlyUsage(
    inputTokens: number,
    outputTokens: number,
    cost: number
  ): Promise<void> {
    const monthlyKey = this.MONTHLY_KEY_PREFIX + this.getMonthlyKey();
    const existing = await this.getUsage(monthlyKey);

    const updated: UsagePeriod = existing
      ? {
        tokens: {
          input: existing.tokens.input + inputTokens,
          output: existing.tokens.output + outputTokens,
          total: existing.tokens.total + inputTokens + outputTokens,
        },
        cost: existing.cost + cost,
        requestCount: existing.requestCount + 1,
        lastUpdated: Date.now(),
      }
      : {
        tokens: {
          input: inputTokens,
          output: outputTokens,
          total: inputTokens + outputTokens,
        },
        cost,
        requestCount: 1,
        lastUpdated: Date.now(),
      };

    // Save with 32 day TTL (expires next month)
    await this.saveUsage(monthlyKey, updated, 32 * 24 * 60 * 60);

    // Update gauge
    geminiMonthlyCost.set(updated.cost);

    // Check monthly quota (80% warning)
    const quotaPercent = (updated.cost / this.monthlyBudget) * 100;
    if (quotaPercent >= THRESHOLDS.MONTHLY_QUOTA_WARNING * 100) {
      await this.triggerMonthlyQuotaAlert(updated.cost, quotaPercent);
    }
  }

  /**
   * Trigger daily limit alert
   */
  private async triggerDailyLimitAlert(currentCost: number): Promise<void> {
    const alertKey = this.ALERT_KEY_PREFIX + 'daily:' + this.getDailyKey();

    // Check if alert already sent today
    const alreadySent = await this.getUsage(alertKey);
    if (alreadySent) {
      return;
    }

    // Mark alert as sent
    await this.saveUsage(alertKey, {
      tokens: { input: 0, output: 0, total: 0 },
      cost: currentCost,
      requestCount: 1,
      lastUpdated: Date.now(),
    }, 24 * 60 * 60);

    // Increment alert counter
    geminiCostAlerts.inc({ type: 'daily_limit' });

    // Log critical alert
    logger.error('🚨 GEMINI COST ALERT: Daily limit exceeded!', {
      type: 'daily_limit',
      currentCost: currentCost.toFixed(2),
      limit: THRESHOLDS.DAILY_COST_LIMIT.toFixed(2),
      date: this.getDailyKey(),
      severity: 'CRITICAL',
    });

    // Send notification via NotificationService
    const { notificationService } = await import('./notification.service');

    await notificationService.sendAlert(
      'CRITICAL',
      'Gemini Cost - Daily Limit Exceeded',
      `Use has exceeded the daily limit of $${THRESHOLDS.DAILY_COST_LIMIT}`,
      {
        currentCost: `$${currentCost.toFixed(2)}`,
        limit: `$${THRESHOLDS.DAILY_COST_LIMIT.toFixed(2)}`,
        date: this.getDailyKey()
      }
    );
  }

  /**
   * Trigger monthly quota alert
   */
  private async triggerMonthlyQuotaAlert(currentCost: number, quotaPercent: number): Promise<void> {
    const alertKey = this.ALERT_KEY_PREFIX + 'monthly:' + this.getMonthlyKey();

    // Check if alert already sent this month
    const alreadySent = await this.getUsage(alertKey);
    if (alreadySent) {
      return;
    }

    // Mark alert as sent
    await this.saveUsage(alertKey, {
      tokens: { input: 0, output: 0, total: 0 },
      cost: currentCost,
      requestCount: 1,
      lastUpdated: Date.now(),
    }, 32 * 24 * 60 * 60);

    // Increment alert counter
    geminiCostAlerts.inc({ type: 'monthly_quota' });

    // Log warning alert
    logger.warn('⚠️  GEMINI COST ALERT: Monthly quota warning!', {
      type: 'monthly_quota',
      currentCost: currentCost.toFixed(2),
      monthlyBudget: this.monthlyBudget.toFixed(2),
      quotaPercent: quotaPercent.toFixed(1),
      threshold: (THRESHOLDS.MONTHLY_QUOTA_WARNING * 100).toFixed(0),
      month: this.getMonthlyKey(),
      severity: 'WARNING',
    });

    // Send notification via NotificationService
    const { notificationService } = await import('./notification.service');

    await notificationService.sendAlert(
      'WARNING',
      'Gemini Cost - Monthly Quota Warning',
      `Monthly usage has reached ${quotaPercent.toFixed(1)}% of the budget.`,
      {
        currentCost: `$${currentCost.toFixed(2)}`,
        monthlyBudget: `$${this.monthlyBudget.toFixed(2)}`,
        quotaPercent: `${quotaPercent.toFixed(1)}%`
      }
    );
  }

  /**
   * Get current daily usage
   */
  async getDailyUsage(): Promise<UsagePeriod | null> {
    const dailyKey = this.DAILY_KEY_PREFIX + this.getDailyKey();
    return await this.getUsage(dailyKey);
  }

  /**
   * Get current monthly usage
   */
  async getMonthlyUsage(): Promise<UsagePeriod | null> {
    const monthlyKey = this.MONTHLY_KEY_PREFIX + this.getMonthlyKey();
    return await this.getUsage(monthlyKey);
  }

  /**
   * Get cost summary
   */
  async getCostSummary(): Promise<{
    daily: {
      cost: number;
      tokens: number;
      requests: number;
      limitReached: boolean;
      percentOfLimit: number;
    };
    monthly: {
      cost: number;
      tokens: number;
      requests: number;
      budget: number;
      percentOfBudget: number;
      quotaWarning: boolean;
    };
  }> {
    const dailyUsage = await this.getDailyUsage();
    const monthlyUsage = await this.getMonthlyUsage();

    const dailyCost = dailyUsage?.cost || 0;
    const monthlyCost = monthlyUsage?.cost || 0;

    return {
      daily: {
        cost: dailyCost,
        tokens: dailyUsage?.tokens.total || 0,
        requests: dailyUsage?.requestCount || 0,
        limitReached: dailyCost >= THRESHOLDS.DAILY_COST_LIMIT,
        percentOfLimit: (dailyCost / THRESHOLDS.DAILY_COST_LIMIT) * 100,
      },
      monthly: {
        cost: monthlyCost,
        tokens: monthlyUsage?.tokens.total || 0,
        requests: monthlyUsage?.requestCount || 0,
        budget: this.monthlyBudget,
        percentOfBudget: (monthlyCost / this.monthlyBudget) * 100,
        quotaWarning: monthlyCost >= this.monthlyBudget * THRESHOLDS.MONTHLY_QUOTA_WARNING,
      },
    };
  }

  /**
   * Reset usage (for testing purposes)
   */
  async resetUsage(period: 'daily' | 'monthly' | 'all' = 'all'): Promise<void> {
    if (period === 'daily' || period === 'all') {
      const dailyKey = this.DAILY_KEY_PREFIX + this.getDailyKey();
      this.memoryStore.delete(dailyKey);
      try {
        await cacheService.delete(dailyKey);
      } catch (error) {
        logger.debug('Failed to delete from cache', { dailyKey });
      }
    }

    if (period === 'monthly' || period === 'all') {
      const monthlyKey = this.MONTHLY_KEY_PREFIX + this.getMonthlyKey();
      this.memoryStore.delete(monthlyKey);
      try {
        await cacheService.delete(monthlyKey);
      } catch (error) {
        logger.debug('Failed to delete from cache', { monthlyKey });
      }
    }

    logger.info('Usage data reset', { period });
  }
}

export const geminiCostTracker = new GeminiCostTrackerService();
export default geminiCostTracker;
