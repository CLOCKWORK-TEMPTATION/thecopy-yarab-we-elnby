import { PluginManager } from "./src/app/(main)/art-director/core/PluginManager";
import {
  Plugin,
  PluginCategory,
} from "./src/app/(main)/art-director/types/index";

class MockPlugin implements Plugin {
  id: string;
  name: string;
  nameAr: string;
  version: string = "1.0.0";
  description: string = "Mock Plugin";
  descriptionAr: string = "إضافة وهمية";
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

  async execute(): Promise<any> {
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

  console.log(
    `--- Benchmarking with ${pluginCount} plugins, each having ${delay}ms delay ---`
  );

  // Measure initializeAll
  console.log("Measuring initializeAll...");
  const startInit = Date.now();
  await pm.initializeAll();
  const endInit = Date.now();
  const initDuration = endInit - startInit;
  console.log(`initializeAll took ${initDuration}ms`);

  // Measure shutdownAll
  console.log("Measuring shutdownAll...");
  const startShutdown = Date.now();
  await pm.shutdownAll();
  const endShutdown = Date.now();
  const shutdownDuration = endShutdown - startShutdown;
  console.log(`shutdownAll took ${shutdownDuration}ms`);

  console.log("--- Results ---");
  console.log(`Total time: ${initDuration + shutdownDuration}ms`);

  // Theoretical parallel time should be around delay (+ overhead)
  // Theoretical sequential time should be around delay * pluginCount
  const expectedSequential = delay * pluginCount;
  console.log(
    `Expected sequential time: ~${expectedSequential}ms per operation`
  );
}

runBenchmark().catch(console.error);
