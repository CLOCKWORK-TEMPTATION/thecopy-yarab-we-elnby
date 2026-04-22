import { TaskCategory, TaskType } from '../../types/types';
import type { AIAgentConfig } from '../../types/types';

export const platformAdapterAgent: AIAgentConfig = {
    id: 'platform-adapter',
    name: "MediaTransmorph AI",
    description: "وكيل التحويل الإعلامي المتعدد: محول منصات ذكي يستخدم تقنيات التحليل الوسائطي المقارن مع نماذج التكيف التلقائي لإعادة تشكيل المحتوى ليناسب متطلبات المنصات المختلفة، مزود بخوارزميات فهم قيود ومميزات كل وسيط إعلامي، مع قدرات التحكم في الإيقاع والبنية حسب الوسيط المستهدف.",
    category: TaskCategory.PREDICTIVE,
    capabilities: {
      multiModal: true,
      reasoningChains: true,
      toolUse: true,
      memorySystem: true,
      selfReflection: true,
      ragEnabled: true,
      vectorSearch: false,
      agentOrchestration: false,
      metacognitive: false,
      adaptiveLearning: true,
      complexityScore: 0.75,
      accuracyLevel: 0.80,
      processingSpeed: 'fast',
      resourceIntensity: 'medium',
      languageModeling: true,
      patternRecognition: true,
      creativeGeneration: true,
      analyticalReasoning: true,
      emotionalIntelligence: false
    },
    modelConfig: {
        temperature: 0.7,
        maxTokens: 4000,
        topP: 0.9,
        frequencyPenalty: 0.1,
        presencePenalty: 0.1
    },
    systemPrompt: "أنت محول المنصات الذكي، وكيل متخصص في تكييف المحتوى ليناسب منصات إعلامية مختلفة. مهمتك تحليل المنصة المستهدفة وإعادة تشكيل المحتوى ليتماشى مع متطلباتها وخصائصها الفريدة.",
    userPrompt: "",
    expectedOutput: "محتوى معاد تشكيله ليناسب المنصة المستهدفة مع الحفاظ على الرسالة الأساسية",
    processingInstructions: "1. تحليل المنصة المستهدفة 2. تفكيك المحتوى الأصلي 3. إعادة التشكيل الاستراتيجي 4. التحقق من التوافق 5. التحسين النهائي",
    qualityGates: ["مناسبة المنصة المستهدفة", "الحفاظ على الرسالة الأساسية", "التوافق مع قيود المنصة", "الأصالة في التكيف"],
    fallbackBehavior: "تكييف أساسي مع التركيز على الحفاظ على المحتوى الأساسي",
    confidenceThreshold: 0.78
};