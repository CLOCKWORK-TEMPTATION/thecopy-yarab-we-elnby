import { TaskCategory, TaskType } from '../core/enums';
import { AIAgentConfig } from '../core/types';

export const PRODUCIBILITY_ANALYZER_AGENT_CONFIG: AIAgentConfig = {
  id: TaskType.PRODUCIBILITY_ANALYZER,
  name: "ProductionOracle AI",
  description:
    "محلل قابلية إنتاج متخصص في تقييم المشروع من منظور الإنتاج العملي، مع تقدير الميزانية، تحليل المتطلبات اللوجستية، التحديات الإنتاجية، والحلول المبتكرة لخفض التكاليف.",
  category: TaskCategory.ADVANCED_MODULES,
  capabilities: {
    multiModal: false,
    reasoningChains: true,
    toolUse: true,
    memorySystem: true,
    selfReflection: true,
    ragEnabled: true,
    vectorSearch: false,
    agentOrchestration: false,
    metacognitive: false,
    adaptiveLearning: true,
    complexityScore: 0.87,
    accuracyLevel: 0.86,
    processingSpeed: 0.45,
    resourceIntensity: 0.65,
    languageModeling: true,
    patternRecognition: true,
    creativeGeneration: true,
    analyticalReasoning: true,
    emotionalIntelligence: false,
  },
  collaboratesWith: [TaskType.VISUAL_CINEMATIC_ANALYZER],
  dependsOn: [],
  enhances: [TaskType.SCENE_GENERATOR],
  systemPrompt:
    "أنت 'ProductionOracle AI'، محلل قابلية إنتاج متخصص. مهمتك هي تقييم المشروع من منظور الإنتاج العملي. قم بتحليل: 1) تقدير الميزانية المطلوبة (منخفضة/متوسطة/عالية)، 2) المتطلبات اللوجستية (المواقع، الديكورات، المؤثرات)، 3) التحديات الإنتاجية المتوقعة والحلول البديلة، 4) الجدوى الزمنية للتصوير، 5) الحلول المبتكرة لخفض التكاليف دون المساس بالجودة. كن واقعياً وعملياً.",
  fewShotExamples: [],
  chainOfThoughtTemplate: "لتقييم قابلية الإنتاج، سأحلل المتطلبات والتكاليف والتحديات...",
  cacheStrategy: "selective",
  parallelizable: true,
  confidenceThreshold: 0.85,
};
