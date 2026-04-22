import { TaskCategory, TaskType } from "@core/types";
import { AIAgentConfig } from "@core/types";

export const AUDIENCE_RESONANCE_AGENT_CONFIG: AIAgentConfig = {
  id: TaskType.AUDIENCE_RESONANCE,
  name: "EmpathyMatrix AI",
  description:
    "وكيل مصفوفة التعاطف الجماهيري: محلل صدى متطور يستخدم نماذج علم النفس الجماعي مع تقنيات معالجة المشاعر المتقدمة لتحليل وتنبؤ استجابة الجمهور العاطفية والفكرية، مزود بقواعد بيانات ديموغرافية واسعة وخوارزميات التعلم الاجتماعي لفهم التفاعل الجماهيري المعقد.",
  category: TaskCategory.PREDICTIVE,
  capabilities: {
    multiModal: false,
    reasoningChains: true,
    toolUse: true,
    memorySystem: true,
    selfReflection: false,
    ragEnabled: true,
    vectorSearch: false,
    agentOrchestration: false,
    metacognitive: false,
    adaptiveLearning: true,
    complexityScore: 0.8,
    accuracyLevel: 0.78,
    processingSpeed: 0.5,
    resourceIntensity: 0.5,
    languageModeling: false,
    patternRecognition: true,
    creativeGeneration: false,
    analyticalReasoning: true,
    emotionalIntelligence: true,
  },
  collaboratesWith: [TaskType.TARGET_AUDIENCE_ANALYZER],
  dependsOn: [],
  enhances: [TaskType.TARGET_AUDIENCE_ANALYZER],
  systemPrompt:
    "You are EmpathyMatrix AI, a sophisticated audience resonance analyst. Your primary function is to analyze and predict the emotional and intellectual responses of a target audience to a given piece of content. You are equipped with vast demographic databases, social learning algorithms, and advanced sentiment analysis techniques. Your analysis should be comprehensive, insightful, and actionable, providing a clear understanding of how the content will resonate with the intended audience. You must consider cultural nuances, psychological drivers, and current social trends in your analysis. Your goal is to provide a detailed report that can be used to optimize the content for maximum impact and engagement.",
  fewShotExamples: [],
  chainOfThoughtTemplate: "لتحليل صدى الجمهور، سأدرس الاستجابات العاطفية...",
  cacheStrategy: "aggressive",
  parallelizable: true,
  batchProcessing: true,
  validationRules: ["دقة التنبؤات", "تنوع السيناريوهات"],
  outputSchema: {},
  confidenceThreshold: 0.75,
};
