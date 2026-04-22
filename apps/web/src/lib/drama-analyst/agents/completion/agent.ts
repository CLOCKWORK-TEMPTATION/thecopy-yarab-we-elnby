import { TaskCategory, TaskType } from "@core/types";
import { AIAgentConfig } from "@core/types";

export const COMPLETION_AGENT_CONFIG: AIAgentConfig = {
  id: TaskType.COMPLETION,
  name: "NarrativeContinuum AI",
  description:
    "وكيل استمرارية السرد الذكي: نظام تنبؤي متطور يستخدم نماذج الانتباه متعددة الرؤوس (Multi-Head Attention) مع ذاكرة طويلة المدى لفهم السياق السردي وإنتاج استكمالات متسقة، مدعوم بتقنيات Monte Carlo Tree Search للاستطلاع الإبداعي وخوارزميات التعلم القليل (Few-Shot Learning) للتكيف السريع مع أنماط المؤلفين المختلفة.",
  category: TaskCategory.CORE,
  capabilities: {
    multiModal: false,
    reasoningChains: true,
    toolUse: true,
    memorySystem: true,
    selfReflection: true,
    ragEnabled: true,
    vectorSearch: true,
    agentOrchestration: false,
    metacognitive: true,
    adaptiveLearning: true,
    complexityScore: 0.85,
    accuracyLevel: 0.88,
    processingSpeed: 0.8,
    resourceIntensity: 0.5,
    languageModeling: true,
    patternRecognition: true,
    creativeGeneration: true,
    analyticalReasoning: true,
    emotionalIntelligence: false,
  },
  collaboratesWith: [TaskType.STYLE_FINGERPRINT, TaskType.CHARACTER_VOICE],
  dependsOn: [],
  enhances: [],
  systemPrompt: `You are NarrativeContinuum AI, a sophisticated narrative continuation expert. Your primary function is to analyze existing narrative structures, character arcs, and stylistic patterns to generate seamless and coherent continuations of a given text. You are equipped with a deep understanding of literary devices, plot development, and character psychology.

Your core directives are:
1.  **Analyze the Input**: Thoroughly examine the provided text to identify the established tone, style, voice, themes, and narrative trajectory.
2.  **Maintain Consistency**: Ensure that your generated continuation is perfectly consistent with the established narrative elements. This includes character voices, plot points, and the overall atmosphere of the story.
3.  **Generate Coherent Narrative**: Produce a continuation that is not only consistent but also logically and creatively expands upon the existing narrative. The generated text should feel like a natural extension of the original author's work.
4.  **Embrace Creativity**: While maintaining consistency, you are encouraged to be creative and innovative in your continuation, introducing new elements that enrich the story without contradicting the established canon.
5.  **Output**: Your output should be the generated text only, without any additional comments or explanations.`,
  fewShotExamples: [],
  chainOfThoughtTemplate: "لاستكمال السرد، سأحلل النمط السردي...",
  cacheStrategy: "aggressive",
  parallelizable: false,
  batchProcessing: false,
  validationRules: ["الاتساق مع النمط الأصلي", "التماسك السردي"],
  outputSchema: {},
  confidenceThreshold: 0.85,
};
