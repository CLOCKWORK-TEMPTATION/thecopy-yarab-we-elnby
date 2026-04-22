import { TaskCategory, TaskType } from "@core/types";
import { AIAgentConfig } from "@core/types";

export const CONFLICT_DYNAMICS_AGENT_CONFIG: AIAgentConfig = {
  id: TaskType.CONFLICT_DYNAMICS,
  name: "TensionField AI",
  description:
    "وكيل حقول التوتر الدرامي: محلل ديناميكي متطور يطبق نظريات ميكانيكا الموائع على ديناميكيات الصراع، مستخدماً نماذج رياضية معقدة لمحاكاة تطور التوترات والصراعات، مزود بخوارزميات المحاكاة المونت كارلو وتقنيات التحليل التنبؤي لاستشراف نقاط الانفجار والتصعيد في البنية الدرامية.",
  category: TaskCategory.ANALYSIS,
  capabilities: {
    multiModal: false,
    reasoningChains: true,
    toolUse: true,
    memorySystem: true,
    selfReflection: false,
    ragEnabled: false,
    vectorSearch: false,
    agentOrchestration: false,
    metacognitive: false,
    adaptiveLearning: true,
    complexityScore: 0.85,
    accuracyLevel: 0.83,
    processingSpeed: 0.5,
    resourceIntensity: 0.8,
    languageModeling: false,
    patternRecognition: true,
    creativeGeneration: false,
    analyticalReasoning: true,
    emotionalIntelligence: true,
  },
  collaboratesWith: [TaskType.TENSION_OPTIMIZER],
  dependsOn: [],
  enhances: [TaskType.TENSION_OPTIMIZER],
  systemPrompt:
    "You are TensionField AI, a sophisticated conflict dynamics analyst. Your primary function is to apply fluid dynamics principles and complex mathematical models to analyze and predict the evolution of tension and conflict within a narrative structure. You are equipped with Monte Carlo simulation algorithms and predictive analysis techniques to forecast points of narrative explosion and escalation. Your analysis should be deep, insightful, and framed within the language of physics and mathematics, treating plot points as particles and narrative arcs as trajectories in a dynamic field. Identify the forces at play (character motivations, external pressures, internal conflicts), calculate their vectors, and predict their points of collision and convergence. Your output must be a detailed report on the conflict architecture, highlighting critical junctures, potential escalations, and the underlying mathematical patterns governing the narrative's tension flow.",
  fewShotExamples: [],
  chainOfThoughtTemplate: "لتحليل ديناميكيات الصراع، سأطبق النماذج الرياضية...",
  cacheStrategy: "selective",
  parallelizable: true,
  batchProcessing: false,
  validationRules: ["دقة النمذجة الرياضية", "صحة التنبؤات"],
  outputSchema: {},
  confidenceThreshold: 0.83,
};
