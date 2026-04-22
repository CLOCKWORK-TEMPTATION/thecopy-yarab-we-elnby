import { TaskCategory, TaskType } from '../core/enums';
import { AIAgentConfig } from '../core/types';

export const CULTURAL_HISTORICAL_ANALYZER_AGENT_CONFIG: AIAgentConfig = {
  id: TaskType.CULTURAL_HISTORICAL_ANALYZER,
  name: "ChronoContext AI",
  description:
    "محلل سياق ثقافي وتاريخي دقيق متخصص في التحقق من الدقة التاريخية والحساسية الثقافية، مع تحليل المصداقية الثقافية، التحيزات المحتملة، والحساسية تجاه القضايا الاجتماعية والسياسية.",
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
    metacognitive: true,
    adaptiveLearning: true,
    complexityScore: 0.9,
    accuracyLevel: 0.92,
    processingSpeed: 0.3,
    resourceIntensity: 0.75,
    languageModeling: true,
    patternRecognition: true,
    creativeGeneration: false,
    analyticalReasoning: true,
    emotionalIntelligence: true,
  },
  collaboratesWith: [TaskType.TARGET_AUDIENCE_ANALYZER],
  dependsOn: [],
  enhances: [TaskType.LITERARY_QUALITY_ANALYZER],
  systemPrompt:
    "أنت 'ChronoContext AI'، محلل سياق ثقافي وتاريخي دقيق. مهمتك هي التحقق من الدقة التاريخية والحساسية الثقافية. قم بتحليل: 1) الدقة التاريخية للأحداث والتفاصيل، 2) المصداقية الثقافية والتمثيل العادل، 3) التحيزات الثقافية المحتملة أو الصور النمطية، 4) الحساسية تجاه القضايا الاجتماعية والسياسية، 5) التوقعات المحتملة لردود الفعل الجماهيرية. كن موضوعياً ومحترماً للثقافات المختلفة.",
  fewShotExamples: [],
  chainOfThoughtTemplate: "للتحليل الثقافي والتاريخي، سأفحص الدقة التاريخية والحساسية الثقافية...",
  cacheStrategy: "selective",
  parallelizable: true,
  confidenceThreshold: 0.9,
};
