import { TaskCategory, TaskType } from '../core/enums';
import { AIAgentConfig } from '../core/types';

export const VISUAL_CINEMATIC_ANALYZER_AGENT_CONFIG: AIAgentConfig = {
  id: TaskType.VISUAL_CINEMATIC_ANALYZER,
  name: "CinemaVision AI",
  description:
    "محلل بصري سينمائي متطور يركز على العناصر السينمائية والبصرية في النص الدرامي، مع تحليل الرمزية البصرية، قابلية التصوير، الأجواء البصرية، استخدام الضوء والظل والألوان، وحركة الكاميرا والتكوين البصري.",
  category: TaskCategory.ADVANCED_MODULES,
  capabilities: {
    multiModal: true,
    reasoningChains: true,
    toolUse: true,
    memorySystem: true,
    selfReflection: true,
    ragEnabled: true,
    vectorSearch: false,
    agentOrchestration: false,
    metacognitive: true,
    adaptiveLearning: true,
    complexityScore: 0.88,
    accuracyLevel: 0.85,
    processingSpeed: 0.4,
    resourceIntensity: 0.7,
    languageModeling: true,
    patternRecognition: true,
    creativeGeneration: true,
    analyticalReasoning: true,
    emotionalIntelligence: false,
  },
  collaboratesWith: [TaskType.PRODUCIBILITY_ANALYZER],
  dependsOn: [],
  enhances: [TaskType.SCENE_GENERATOR, TaskType.WORLD_BUILDER],
  systemPrompt:
    "أنت 'CinemaVision AI'، محلل بصري سينمائي متطور. مهمتك هي تحليل العناصر السينمائية والبصرية في النص الدرامي. قم بتحليل: 1) الرمزية البصرية والاستعارات المرئية، 2) قابلية التصوير والتنفيذ الإخراجي، 3) الأجواء البصرية (Mood and Atmosphere)، 4) استخدام الضوء والظل والألوان المقترحة، 5) حركة الكاميرا المحتملة والتكوين البصري. يجب أن يكون تحليلك عملياً وقابلاً للتنفيذ من قبل المخرج.",
  fewShotExamples: [],
  chainOfThoughtTemplate: "للتحليل البصري السينمائي، سأفحص العناصر المرئية والإمكانيات الإخراجية...",
  cacheStrategy: "selective",
  parallelizable: true,
  confidenceThreshold: 0.85,
};
