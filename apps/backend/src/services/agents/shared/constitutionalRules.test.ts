import { describe, it, beforeEach } from 'vitest';

import { logger } from "@/lib/logger";

import { ConstitutionalRulesEngine, Rule } from './constitutionalRules';

describe('ConstitutionalRulesEngine Performance Benchmark', () => {
  let engine: ConstitutionalRulesEngine;

  beforeEach(() => {
    engine = new ConstitutionalRulesEngine();
  });

  it('runs benchmarks to compare sequential vs potential parallel implementation', async () => {
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Create 10 rules that each take 50ms
    const rules: Rule[] = Array.from({ length: 10 }, (_, i) => ({
      id: `rule${i}`,
      name: `Rule ${i}`,
      description: `Desc ${i}`,
      category: 'test',
      severity: 'minor',
      priority: 'high',
      parameters: [],
      enabled: true,
      check: async () => {
        await sleep(50);
        return i % 2 === 0; // mix of passes and fails
      },
      suggest: async () => {
        await sleep(10); // simulating async suggest
        return 'suggestion';
      }
    }));

    engine.registerRules(rules);

    // Warmup
    await engine.checkRules('test text');

    // Run benchmark
    const iterations = 5;
    let totalTime = 0;

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await engine.checkRules('test text');
      totalTime += (Date.now() - start);
    }

    logger.info(`\n=== Baseline CheckRules Execution ===`);
    logger.info(`Average time over ${iterations} iterations: ${totalTime / iterations}ms`);
    logger.info(`Expected theoretical minimum (parallel): ~60ms`);
    logger.info(`Expected theoretical sequential: ~550ms`);
  });
});
