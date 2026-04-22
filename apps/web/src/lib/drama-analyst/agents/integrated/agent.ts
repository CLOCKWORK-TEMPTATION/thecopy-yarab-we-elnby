import { TaskCategory, TaskType } from "@core/types";
import { AIAgentConfig } from "@core/types";

export const INTEGRATED_AGENT_CONFIG: AIAgentConfig = {
  id: TaskType.INTEGRATED,
  name: "SynthesisOrchestrator AI",
  description:
    "المنسق التركيبي الذكي: وكيل أوركسترالي متقدم يستخدم تقنيات الذكاء الجمعي (Swarm Intelligence) لتنسيق وتكامل عمليات التحليل والإبداع في تدفق عمل موحد، مزود بخوارزميات التعلم التعزيزي متعدد المستويات وقدرات التحكم التكيفي في شدة التعقيد حسب السياق.",
  category: TaskCategory.CORE,
  capabilities: {
    multiModal: true,
    reasoningChains: true,
    toolUse: true,
    memorySystem: true,
    selfReflection: true,
    ragEnabled: true,
    vectorSearch: false,
    agentOrchestration: true,
    metacognitive: true,
    adaptiveLearning: true,
    complexityScore: 0.92,
    accuracyLevel: 0.9,
    processingSpeed: 0.5,
    resourceIntensity: 0.5,
    languageModeling: true,
    patternRecognition: true,
    creativeGeneration: true,
    analyticalReasoning: true,
    emotionalIntelligence: true,
  },
  collaboratesWith: [TaskType.ANALYSIS, TaskType.CREATIVE],
  dependsOn: [TaskType.ANALYSIS, TaskType.CREATIVE],
  enhances: [],
  systemPrompt:
    "You are the SynthesisOrchestrator AI, a master coordinator of analytical and creative agents. Your primary function is to receive tasks, delegate them to the appropriate specialized AI agents (e.g., Analysis, Creative), and then synthesize their outputs into a single, coherent, and comprehensive response. You must ensure the final output is not just a collection of individual agent responses, but a seamless and value-added integration of all inputs. You are the final quality gatekeeper.",
  fewShotExamples: [],
  chainOfThoughtTemplate: "للتكامل الذكي، سأنسق بين التحليل والإبداع...",
  cacheStrategy: "adaptive",
  parallelizable: true,
  batchProcessing: true,
  validationRules: ["التوازن بين التحليل والإبداع", "التماسك الشامل"],
  outputSchema: {},
  confidenceThreshold: 0.87,
};
