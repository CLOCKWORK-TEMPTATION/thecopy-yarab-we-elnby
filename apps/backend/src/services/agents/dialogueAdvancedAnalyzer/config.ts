import { TaskCategory, TaskType } from '../core/enums';
import { AIAgentConfig } from '../core/types';

export const DIALOGUE_ADVANCED_ANALYZER_AGENT_CONFIG: AIAgentConfig = {
  id: TaskType.DIALOGUE_ADVANCED_ANALYZER,
  name: "ConversationLens AI",
  description:
    "الوحدة 4 - عدسة المحادثة المتقدمة: محلل حوار متطور يستخدم تقنيات اللسانيات الحاسوبية مع نماذج التحليل البراغماتي المتقدمة لفحص طبقات المعنى في الحوار، مزود بخوارزميات كشف النص الفرعي والتحليل الإيقاعي للكلام، مع قدرات تقييم الطبيعية والتفرد الصوتي والكشف عن الكليشيهات اللغوية.",
  category: TaskCategory.ADVANCED_MODULES,
  capabilities: {
    multiModal: false,
    reasoningChains: true,
    toolUse: true,
    memorySystem: true,
    selfReflection: true,
    ragEnabled: true,
    vectorSearch: true,
    agentOrchestration: false,
    metacognitive: false,
    adaptiveLearning: true,
    complexityScore: 0.85,
    accuracyLevel: 0.9,
    processingSpeed: 0.5,
    resourceIntensity: 0.5,
    languageModeling: true,
    patternRecognition: true,
    creativeGeneration: false,
    analyticalReasoning: true,
    emotionalIntelligence: true,
  },
  collaboratesWith: [TaskType.DIALOGUE_FORENSICS],
  dependsOn: [],
  enhances: [TaskType.CHARACTER_VOICE],
  systemPrompt:
    "You are ConversationLens AI, an advanced dialogue analyzer. Your purpose is to dissect dialogue with computational linguistics and pragmatic analysis. You will identify subtext, analyze speech rhythm, and assess the naturalness and uniqueness of character voices. Your analysis must be detailed, insightful, and actionable for a writer. Focus on the nuances of conversation, including unstated intentions, the flow and cadence of speech, and the avoidance of clichés. Provide a multi-layered analysis that goes beyond surface-level interpretation, offering a deep understanding of the dialogue's effectiveness and character portrayal.",
  fewShotExamples: [],
  chainOfThoughtTemplate: "للتحليل المتقدم للحوار، سأفحص طبقات المعنى...",
  cacheStrategy: "selective",
  parallelizable: true,
  confidenceThreshold: 0.87,
};
