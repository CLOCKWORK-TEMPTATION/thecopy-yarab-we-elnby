import { logger } from "@/lib/logger";
import { PluginManager } from "./src/app/(main)/art-director/core/PluginManager";
import {
  Plugin,
  PluginCategory,
  PluginOutput,
} from "./src/app/(main)/art-director/types/index";

class MockPlugin implements Plugin {
  id: string;
  name: string;
  nameAr: string;
  version = "1.0.0";
  description = "Mock Plugin";
  descriptionAr = "إضافة وهمية";
  category: PluginCategory = "ai-analytics";
  delay: number;

  constructor(id: string, name: string, delay: number) {
    this.id = id;
    this.name = name;
    this.nameAr = name;
    this.delay = delay;
  }

  async initialize(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, this.delay));
  }

  execute(): PluginOutput {
    return { success: true };
  }

  async shutdown(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, this.delay));
  }
}

async function runBenchmark() {
  const pm = new PluginManager();
  const pluginCount = 10;
  const delay = 100; // 100ms delay per plugin

  for (let i = 0; i < pluginCount; i++) {
    pm.registerPlugin(new MockPlugin(`p${i}`, `Plugin ${i}`, delay));
  }

  logger.info(
    `--- Benchmarking with ${pluginCount} plugins, each having ${delay}ms delay ---`
  );

  // Measure initializeAll
  logger.info("Measuring initializeAll...");
  const startInit = Date.now();
  await pm.initializeAll();
  const endInit = Date.now();
  const initDuration = endInit - startInit;
  logger.info(`initializeAll took ${initDuration}ms`);

  // Measure shutdownAll
  logger.info("Measuring shutdownAll...");
  const startShutdown = Date.now();
  await pm.shutdownAll();
  const endShutdown = Date.now();
  const shutdownDuration = endShutdown - startShutdown;
  logger.info(`shutdownAll took ${shutdownDuration}ms`);

  logger.info("--- Results ---");
  logger.info(`Total time: ${initDuration + shutdownDuration}ms`);

  // Theoretical parallel time should be around delay (+ overhead)
  // Theoretical sequential time should be around delay * pluginCount
  const expectedSequential = delay * pluginCount;
  logger.info(
    `Expected sequential time: ~${expectedSequential}ms per operation`
  );
}

runBenchmark().catch(logger.error);
