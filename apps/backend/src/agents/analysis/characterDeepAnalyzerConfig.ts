import { TaskCategory, TaskType } from '../../types/types';
import type { AIAgentConfig } from '../../types/types';

export const CHARACTER_DEEP_ANALYZER_AGENT_CONFIG: AIAgentConfig = {
    id: TaskType.CHARACTER_DEEP_ANALYZER,
    name: "PsycheScope AI",
    description: "الوحدة 3 - مجهر النفسية العميقة: محلل شخصيات متقدم يستخدم نماذج علم النفس الحاسوبي مع تقنيات التحليل النفسي الذكي لسبر أغوار الشخصيات وتحليل دوافعها اللاواعية، مزود بخوارزميات كشف الأنماط النفسية المعقدة ونماذج التطور الشخصي الديناميكي، مع قدرات تقييم العمق النفسي والتماسك الشخصي.",
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
      metacognitive: true,
      adaptiveLearning: true,
      complexityScore: 0.92,
      accuracyLevel: 0.88,
      processingSpeed: 'slow',
      resourceIntensity: 'high',
      languageModeling: true,
      patternRecognition: true,
      creativeGeneration: false,
      analyticalReasoning: true,
      emotionalIntelligence: true
    },
    collaboratesWith: [TaskType.CHARACTER_NETWORK, TaskType.CHARACTER_VOICE],
    dependsOn: [],
    enhances: [TaskType.CHARACTER_VOICE],
    systemPrompt: "أنت 'PsycheScope AI'، محلل نفسي متقدم متخصص في تحليل الشخصيات الأدبية والدرامية. مهمتك هي الغوص في أعماق الشخصية المقدمة لك، وتفكيك طبقاتها النفسية المعقدة، والكشف عن دوافعها الواعية واللاواعية. استخدم نماذج علم النفس الحاسوبي المتقدمة وتقنيات التحليل النفسي الذكي لتحليل سمات الشخصية، وصراعاتها الداخلية، ونقاط ضعفها، وقوتها، وتطورها المحتمل عبر السرد. يجب أن يشتمل تحليلك على نظريات نفسية راسخة مثل التحليل الفرويدي، علم النفس اليونغي (النماذج الأصلية)، ونظريات السمات الشخصية. قدم تحليلاً متماسكاً وعميقاً، مدعماً بأمثلة من النص (إذا توفر)، وركز على كشف الأنماط النفسية الخفية التي تحرك الشخصية.",
    fewShotExamples: [],
    chainOfThoughtTemplate: "للتحليل النفسي العميق، سأدرس الدوافع اللاواعية...",
    cacheStrategy: 'selective',
    parallelizable: true,
    batchProcessing: false,
    validationRules: ["عمق التحليل النفسي", "دقة الدوافع"],
    outputSchema: {},
    confidenceThreshold: 0.88
};
