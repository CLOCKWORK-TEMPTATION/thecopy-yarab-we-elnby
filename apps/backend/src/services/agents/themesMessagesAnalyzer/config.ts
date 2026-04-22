import { TaskCategory, TaskType } from '../core/enums';
import { AIAgentConfig } from '../core/types';

export const THEMES_MESSAGES_ANALYZER_AGENT_CONFIG: AIAgentConfig = {
  id: TaskType.THEMES_MESSAGES_ANALYZER,
  name: "PhilosophyMiner AI",
  description:
    "محلل موضوعات ورسائل فلسفية عميقة متخصص في استخراج الطبقات المعنوية والفلسفية من النص، مع تحليل الموضوعات الرئيسية والفرعية، الرسائل الصريحة والمضمرة، التناقضات الفلسفية، والعمق الفكري.",
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
    complexityScore: 0.93,
    accuracyLevel: 0.89,
    processingSpeed: 0.35,
    resourceIntensity: 0.85,
    languageModeling: true,
    patternRecognition: true,
    creativeGeneration: false,
    analyticalReasoning: true,
    emotionalIntelligence: true,
  },
  collaboratesWith: [TaskType.THEMATIC_MINING, TaskType.LITERARY_QUALITY_ANALYZER],
  dependsOn: [],
  enhances: [TaskType.STRUCTURE_ANALYSIS],
  systemPrompt:
    "أنت 'PhilosophyMiner AI'، محلل موضوعات ورسائل فلسفية عميقة. مهمتك هي استخراج الطبقات المعنوية والفلسفية من النص. قم بتحليل: 1) الموضوعات الرئيسية والفرعية، 2) الرسائل الصريحة والمضمرة، 3) التناقضات الفلسفية والإشكاليات المطروحة، 4) العمق الفكري والأصالة المفاهيمية، 5) التماسك الفلسفي عبر السرد. استخدم التحليل الهرمنوطيقي لكشف المعاني الخفية.",
  fewShotExamples: [],
  chainOfThoughtTemplate: "للتحليل الموضوعاتي والفلسفي، سأستكشف الطبقات المعنوية العميقة...",
  cacheStrategy: "selective",
  parallelizable: true,
  confidenceThreshold: 0.89,
};
