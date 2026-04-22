import { describe, it, expect } from "vitest";
import { PluginManager } from "../core/PluginManager";
import { Plugin, PluginCategory } from "../types";

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

describe("PluginManager Performance", () => {
  it("should measure parallel shutdown (optimized)", async () => {
    const pm = new PluginManager();
    const pluginCount = 5;
    const delay = 100;

    for (let i = 0; i < pluginCount; i++) {
      await pm.registerPlugin(new MockPlugin(`p${i}`, `Plugin ${i}`, delay));
    }

    const start = Date.now();
    await pm.shutdownAll();
    const duration = Date.now() - start;

    console.log(`Parallel shutdown with 5 plugins took ${duration}ms`);
    // Parallel should be faster than sequential (pluginCount * delay)
    // It should be around delay + overhead
    expect(duration).toBeLessThan(pluginCount * delay);
    expect(duration).toBeGreaterThanOrEqual(delay);
  });

  it("should measure parallel initialization (optimized)", async () => {
    const pm = new PluginManager();
    const pluginCount = 5;
    const delay = 100;

    for (let i = 0; i < pluginCount; i++) {
      await pm.registerPlugin(new MockPlugin(`p${i}`, `Plugin ${i}`, delay));
    }

    const start = Date.now();
    await pm.initializeAll();
    const duration = Date.now() - start;

    console.log(`Parallel initialization with 5 plugins took ${duration}ms`);
    // Parallel should be faster than sequential (pluginCount * delay)
    expect(duration).toBeLessThan(pluginCount * delay);
    expect(duration).toBeGreaterThanOrEqual(delay);
  });
});
