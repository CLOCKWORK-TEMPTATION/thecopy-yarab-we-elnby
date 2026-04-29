import { describe, it, expect } from "vitest";

import { TaskType, TaskCategory } from "./enums";

describe("Enums — TaskType", () => {
  it("should have ANALYSIS task type", () => {
    expect(TaskType.ANALYSIS).toBe("analysis");
  });

  it("should have CREATIVE task type", () => {
    expect(TaskType.CREATIVE).toBe("creative");
  });

  it("should have INTEGRATED task type", () => {
    expect(TaskType.INTEGRATED).toBe("integrated");
  });

  it("should have COMPLETION task type", () => {
    expect(TaskType.COMPLETION).toBe("completion");
  });

  it("should have RHYTHM_MAPPING task type", () => {
    expect(TaskType.RHYTHM_MAPPING).toBe("rhythm-mapping");
  });

  it("should have CHARACTER_NETWORK task type", () => {
    expect(TaskType.CHARACTER_NETWORK).toBe("character-network");
  });

  it("should have DIALOGUE_FORENSICS task type", () => {
    expect(TaskType.DIALOGUE_FORENSICS).toBe("dialogue-forensics");
  });

  it("should have THEMATIC_MINING task type", () => {
    expect(TaskType.THEMATIC_MINING).toBe("thematic-mining");
  });

  it("should have STYLE_FINGERPRINT task type", () => {
    expect(TaskType.STYLE_FINGERPRINT).toBe("style-fingerprint");
  });

  it("should have CONFLICT_DYNAMICS task type", () => {
    expect(TaskType.CONFLICT_DYNAMICS).toBe("conflict-dynamics");
  });

  it("should have ADAPTIVE_REWRITING task type", () => {
    expect(TaskType.ADAPTIVE_REWRITING).toBe("adaptive-rewriting");
  });

  it("should have SCENE_GENERATOR task type", () => {
    expect(TaskType.SCENE_GENERATOR).toBe("scene-generator");
  });

  it("should have CHARACTER_VOICE task type", () => {
    expect(TaskType.CHARACTER_VOICE).toBe("character-voice");
  });

  it("should have WORLD_BUILDER task type", () => {
    expect(TaskType.WORLD_BUILDER).toBe("world-builder");
  });

  it("should have PLOT_PREDICTOR task type", () => {
    expect(TaskType.PLOT_PREDICTOR).toBe("plot-predictor");
  });

  it("should have TENSION_OPTIMIZER task type", () => {
    expect(TaskType.TENSION_OPTIMIZER).toBe("tension-optimizer");
  });

  it("should have AUDIENCE_RESONANCE task type", () => {
    expect(TaskType.AUDIENCE_RESONANCE).toBe("audience-resonance");
  });

  it("should have PLATFORM_ADAPTER task type", () => {
    expect(TaskType.PLATFORM_ADAPTER).toBe("platform-adapter");
  });

  it("should have all advanced module task types", () => {
    const advancedTypes = [
      TaskType.RHYTHM_MAPPING,
      TaskType.CHARACTER_NETWORK,
      TaskType.DIALOGUE_FORENSICS,
      TaskType.THEMATIC_MINING,
      TaskType.STYLE_FINGERPRINT,
      TaskType.CONFLICT_DYNAMICS,
      TaskType.ADAPTIVE_REWRITING,
      TaskType.SCENE_GENERATOR,
      TaskType.CHARACTER_VOICE,
      TaskType.WORLD_BUILDER,
      TaskType.PLOT_PREDICTOR,
      TaskType.TENSION_OPTIMIZER,
      TaskType.AUDIENCE_RESONANCE,
      TaskType.PLATFORM_ADAPTER,
    ];

    advancedTypes.forEach((type) => {
      expect(typeof type).toBe("string");
      expect(type.length).toBeGreaterThan(0);
    });
  });
});

describe("Enums — TaskCategory", () => {
  it("should have CORE category", () => {
    expect(TaskCategory.CORE).toBe("core");
  });

  it("should have ANALYSIS category", () => {
    expect(TaskCategory.ANALYSIS).toBe("analysis");
  });

  it("should have CREATIVE category", () => {
    expect(TaskCategory.CREATIVE).toBe("creative");
  });

  it("should have PREDICTIVE category", () => {
    expect(TaskCategory.PREDICTIVE).toBe("predictive");
  });

  it("should have ADVANCED_MODULES category", () => {
    expect(TaskCategory.ADVANCED_MODULES).toBe("advanced_modules");
  });

  it("should have all categories as strings", () => {
    const categories = Object.values(TaskCategory);

    categories.forEach((category) => {
      expect(typeof category).toBe("string");
      expect(category.length).toBeGreaterThan(0);
    });
  });
});

describe("Enums — Type Safety", () => {
  it("should allow valid TaskType values", () => {
    const task: TaskType = TaskType.ANALYSIS;
    expect(task).toBe("analysis");
  });

  it("should allow valid TaskCategory values", () => {
    const category: TaskCategory = TaskCategory.CORE;
    expect(category).toBe("core");
  });

  it("should have unique task type values", () => {
    const taskTypes = Object.values(TaskType);
    const uniqueTypes = new Set(taskTypes);

    expect(uniqueTypes.size).toBe(taskTypes.length);
  });

  it("should have unique category values", () => {
    const categories = Object.values(TaskCategory);
    const uniqueCategories = new Set(categories);

    expect(uniqueCategories.size).toBe(categories.length);
  });
});
