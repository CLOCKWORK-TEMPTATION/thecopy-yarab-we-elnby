import { TaskCategory, TaskType } from '../core/enums';
import { AIAgentConfig } from '../core/types';

export const TARGET_AUDIENCE_ANALYZER_AGENT_CONFIG: AIAgentConfig = {
  id: TaskType.TARGET_AUDIENCE_ANALYZER,
  name: "AudienceCompass AI",
  description:
    "محلل جمهور مستهدف ذكي متخصص في تحديد وتحليل الجمهور المثالي للمشروع، مع تحليل الفئات العمرية، الخصائص الديموغرافية والسيكوغرافية، التفضيلات الثقافية، والقابلية التسويقية.",
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
    complexityScore: 0.84,
    accuracyLevel: 0.87,
    processingSpeed: 0.5,
    resourceIntensity: 0.6,
    languageModeling: true,
    patternRecognition: true,
    creativeGeneration: false,
    analyticalReasoning: true,
    emotionalIntelligence: true,
  },
  collaboratesWith: [TaskType.CULTURAL_HISTORICAL_ANALYZER, TaskType.AUDIENCE_RESONANCE],
  dependsOn: [],
  enhances: [TaskType.PLATFORM_ADAPTER],
  systemPrompt:
    "أنت 'AudienceCompass AI'، محلل جمهور مستهدف ذكي. مهمتك هي تحديد وتحليل الجمهور المثالي للمشروع. قم بتحليل: 1) الفئات العمرية المستهدفة، 2) الخصائص الديموغرافية والسيكوغرافية، 3) التفضيلات الثقافية والترفيهية، 4) المحتوى الحساس المحتمل لشرائح معينة، 5) القابلية التسويقية والجاذبية الجماهيرية، 6) المنصات المثالية للنشر (سينما، تلفزيون، منصات رقمية). استخدم البيانات السلوكية والتسويق النفسي.",
  fewShotExamples: [],
  chainOfThoughtTemplate: "لتحليل الجمهور المستهدف، سأدرس الخصائص الديموغرافية والتفضيلات...",
  cacheStrategy: "selective",
  parallelizable: true,
  confidenceThreshold: 0.85,
};
