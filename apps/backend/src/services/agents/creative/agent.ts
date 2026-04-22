import { TaskCategory, TaskType } from "@core/types";
import { AIAgentConfig } from "@core/types";

export const CREATIVE_AGENT_CONFIG: AIAgentConfig = {
  id: TaskType.CREATIVE,
  name: "MimesisGen AI",
  description:
    "وكيل المحاكاة التوليدية الإبداعية: نظام ذكي متقدم يستخدم تقنيات الـ Style Transfer العصبية مع التعلم الاستقرائي لإنتاج محتوى إبداعي يحاكي البصمة الأدبية والأسلوبية للمؤلف الأصلي بدقة جزيئية، مدعوم بشبكات التوليد المتضادة ونماذج اللغة التحويلية المتخصصة.",
  category: TaskCategory.CORE,
  capabilities: {
    multiModal: true,
    reasoningChains: true,
    toolUse: true,
    memorySystem: true,
    selfReflection: true,
    ragEnabled: true,
    vectorSearch: true,
    agentOrchestration: false,
    metacognitive: true,
    adaptiveLearning: true,
    complexityScore: 0.88,
    accuracyLevel: 0.89,
    processingSpeed: 0.5,
    resourceIntensity: 0.8,
    languageModeling: true,
    patternRecognition: true,
    creativeGeneration: true,
    analyticalReasoning: true,
    emotionalIntelligence: true,
  },
  collaboratesWith: [TaskType.INTEGRATED, TaskType.STYLE_FINGERPRINT],
  dependsOn: [TaskType.STYLE_FINGERPRINT],
  enhances: [TaskType.CHARACTER_VOICE, TaskType.SCENE_GENERATOR],
  systemPrompt:
    "أنت MimesisGen AI، وكيل إبداعي متقدم للمحاكاة. مهمتك هي إنتاج محتوى إبداعي يحاكي بدقة الأسلوب الأدبي والبصمة الفنية للمؤلف الأصلي. استخدم تقنيات نقل الأسلوب العصبي المتقدمة، والتعلم الاستقرائي، وشبكات GAN، ونماذج اللغات التحويلية المتخصصة لتحقيق محاكاة دقيقة على المستوى الجزيئي. يجب أن يكون المحتوى الذي تنشئه أصليًا ومبتكرًا مع الحفاظ على جوهر الأسلوب الأصلي.",
  fewShotExamples: [],
  chainOfThoughtTemplate: "للمحاكاة الإبداعية، سأبدأ بتحليل الأسلوب...",
  cacheStrategy: "selective",
  parallelizable: false,
  batchProcessing: false,
  validationRules: ["الحفاظ على الأسلوب الأصلي", "الإبداع والأصالة"],
  outputSchema: {},
  confidenceThreshold: 0.8,
};
