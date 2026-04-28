import { beforeEach, describe, expect, it, vi } from "vitest";

import { TaskType } from "@core/enums";

const { mockExecuteStandardAgentPattern } = vi.hoisted(() => ({
  mockExecuteStandardAgentPattern: vi.fn(),
}));

vi.mock("./shared/standardAgentPattern", () => ({
  executeStandardAgentPattern: mockExecuteStandardAgentPattern,
}));

vi.mock("@/utils/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import {
  batchExecuteAgentTasks,
  characterVoiceAgent,
  completionAgent,
  creativeAgent,
  executeAgentTask,
  getAgentConfig,
  getAgentStatistics,
  getUpgradedAgents,
  isAgentUpgraded,
} from "./upgradedAgents";

import type { StandardAgentInput } from "./shared/standardAgentPattern";

const basePatternOutput = {
  text: `تحليل أولي:
يمكن تطوير الفكرة مع إضافة مثال تطبيقي واضح.
"أشعر أن القرار صعب، لكنني مستعد للمواجهة!"`,
  confidence: 0.85,
  notes: [],
  metadata: {
    processingTime: 1000,
    tokensUsed: 500,
    modelUsed: "gemini-2.5-flash",
    timestamp: new Date().toISOString(),
  },
};

const testInput: StandardAgentInput = {
  input: "نص تجريبي للمعالجة",
  options: {
    enableRAG: true,
    enableSelfCritique: true,
    enableConstitutional: true,
    enableUncertainty: true,
    enableHallucination: true,
    enableDebate: true,
  },
  context: {
    originalText: "النص الأصلي",
    analysisReport: { summary: "تقرير التحليل" },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockExecuteStandardAgentPattern.mockResolvedValue(basePatternOutput);
});

describe("Agent Registration", () => {
  it("يسجل الوكلاء المرقّاة الحالية", () => {
    expect(isAgentUpgraded(TaskType.COMPLETION)).toBe(true);
    expect(isAgentUpgraded(TaskType.CREATIVE)).toBe(true);
    expect(isAgentUpgraded(TaskType.CHARACTER_VOICE)).toBe(true);
    expect(isAgentUpgraded(TaskType.ANALYSIS)).toBe(true);
  });

  it("يرفض نوع مهمة غير معروف", () => {
    expect(isAgentUpgraded("unknown-task" as TaskType)).toBe(false);
  });

  it("يعيد القائمة الكاملة للوكلاء المرقّاة", () => {
    const upgraded = getUpgradedAgents();
    const stats = getAgentStatistics();

    expect(upgraded).toContain(TaskType.COMPLETION);
    expect(upgraded).toContain(TaskType.CREATIVE);
    expect(upgraded).toContain(TaskType.CHARACTER_VOICE);
    expect(upgraded).toContain(TaskType.ANALYSIS);
    expect(upgraded).toHaveLength(stats.upgraded);
  });
});

describe("Agent Configuration", () => {
  it("يعيد إعدادات completion و creative و analysis", () => {
    expect(getAgentConfig(TaskType.COMPLETION)?.name).toBe(
      "NarrativeContinuum AI",
    );
    expect(getAgentConfig(TaskType.CREATIVE)?.name).toBe("CreativeVision AI");
    expect(getAgentConfig(TaskType.ANALYSIS)?.name).toBe(
      "CritiqueArchitect AI",
    );
  });

  it("يعيد null عند طلب وكيل غير مسجل", () => {
    expect(getAgentConfig("unknown-task" as TaskType)).toBeNull();
  });
});

describe("Agent Execution", () => {
  it("ينفذ completion بنجاح", async () => {
    const result = await executeAgentTask(TaskType.COMPLETION, testInput);

    expect(result.text).toBeTruthy();
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.metadata?.processingTime).toBeGreaterThan(0);
  });

  it("ينفذ creative ويضيف درجات الإبداع والقابلية للتطبيق", async () => {
    const result = await executeAgentTask(TaskType.CREATIVE, testInput);

    expect(result.text).toContain("تحليل إبداعي");
    expect(result.metadata?.creativityScore).toBeGreaterThan(0);
    expect(result.metadata?.practicalityScore).toBeGreaterThan(0);
  });

  it("ينفذ character voice ويضيف مؤشرات اتساق الصوت", async () => {
    const result = await executeAgentTask(TaskType.CHARACTER_VOICE, {
      ...testInput,
      context: {
        characterProfile: {
          name: "فاطمة",
          personality: "قوية وحازمة",
          speechPattern: "رسمي ومباشر",
        },
        sceneContext: "اجتماع عمل مهم",
        emotionalState: "confident",
      },
    });

    expect(result.text).toBeTruthy();
    expect(result.metadata?.voiceConsistency).toBeGreaterThan(0);
    expect(result.metadata?.naturality).toBeGreaterThan(0);
    expect(result.metadata?.dialogueType).toBeDefined();
  });

  it("يعيد مسار fallback عند تمرير مهمة غير مسجلة", async () => {
    const result = await executeAgentTask(
      "unknown-task" as TaskType,
      testInput,
    );

    expect(result.confidence).toBe(0);
    expect(result.text).toContain("لم يتم ترقيته بعد");
    expect(result.metadata?.processingTime).toBe(0);
  });

  it("يعالج أخطاء التنفيذ دون كسر التدفق", async () => {
    vi.spyOn(completionAgent, "executeTask").mockRejectedValueOnce(
      new Error("Test error"),
    );

    const result = await executeAgentTask(TaskType.COMPLETION, testInput);

    expect(result.confidence).toBe(0);
    expect(result.text).toContain("حدث خطأ أثناء تنفيذ المهمة");
    expect(result.metadata?.error).toBe(true);
    expect(result.notes).toContain("Test error");
  });
});

describe("Batch Execution", () => {
  it("ينفذ عدة مهام في دفعة واحدة", async () => {
    const results = await batchExecuteAgentTasks([
      {
        taskType: TaskType.COMPLETION,
        input: { input: "مهمة 1", options: {}, context: {} },
      },
      {
        taskType: TaskType.CREATIVE,
        input: { input: "مهمة 2", options: {}, context: {} },
      },
    ]);

    expect(results).toHaveLength(2);
    expect(results[0].text).toBeTruthy();
    expect(results[1].text).toBeTruthy();
  });

  it("يعيد نتيجة خطأ مستقرة عند الفشل الجزئي", async () => {
    vi.spyOn(completionAgent, "executeTask")
      .mockResolvedValueOnce({
        text: "نجح",
        confidence: 0.8,
        notes: [],
        metadata: basePatternOutput.metadata,
      })
      .mockRejectedValueOnce(new Error("فشل"));

    const results = await batchExecuteAgentTasks([
      {
        taskType: TaskType.COMPLETION,
        input: { input: "test1", options: {}, context: {} },
      },
      {
        taskType: TaskType.COMPLETION,
        input: { input: "test2", options: {}, context: {} },
      },
    ]);

    expect(results).toHaveLength(2);
    expect(results[0].text).toBe("نجح");
    expect(results[1].text).toContain("حدث خطأ أثناء تنفيذ المهمة");
    expect(results[1].confidence).toBe(0);
  });
});

describe("Agent Statistics", () => {
  it("يعيد إحصاءات الترقية الحالية بالكامل", () => {
    const stats = getAgentStatistics();

    expect(stats.total).toBe(27);
    expect(stats.upgraded).toBe(27);
    expect(stats.remaining).toBe(0);
    expect(stats.percentage).toBe(100);
    expect(stats.upgradedAgents).toHaveLength(27);
    expect(stats.remainingAgents).toHaveLength(0);
  });
});

describe("Direct Agents", () => {
  it("ينفذ completionAgent مباشرة", async () => {
    const result = await completionAgent.executeTask({
      input: "أكمل هذه القصة",
      options: {},
      context: {
        originalText: "كان يا ما كان...",
        completionScope: "paragraph",
      },
    });

    expect(result.text).toBeTruthy();
    expect(result.metadata).toBeDefined();
  });

  it("ينفذ creativeAgent مباشرة مع تطوير الحبكة", async () => {
    const result = await creativeAgent.executeTask({
      input: "طور هذا النص",
      options: {},
      context: {
        originalText: "النص الأصلي",
        developmentFocus: "plot",
        goals: ["تعزيز الحبكة", "إضافة تشويق"],
      },
    });

    expect(result.text).toContain("تحليل إبداعي");
    expect(result.metadata?.creativityScore).toBeGreaterThan(0);
    expect(result.metadata?.practicalityScore).toBeGreaterThan(0);
  });

  it("ينفذ characterVoiceAgent مباشرة بحوار مناسب للشخصية", async () => {
    const result = await characterVoiceAgent.executeTask({
      input: "اكتب حواراً للشخصية",
      options: {},
      context: {
        characterProfile: {
          name: "فاطمة",
          age: "35",
          personality: "قوية وحازمة",
          speechPattern: "رسمي ومباشر",
        },
        sceneContext: "اجتماع عمل مهم",
        emotionalState: "confident",
      },
    });

    expect(result.text).toBeTruthy();
    expect(result.metadata?.voiceConsistency).toBeGreaterThan(0);
    expect(result.metadata?.naturality).toBeGreaterThan(0);
    expect(result.metadata?.dialogueType).toBeDefined();
  });
});
