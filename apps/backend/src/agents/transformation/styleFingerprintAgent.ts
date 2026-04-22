import { TaskCategory, TaskType } from '../../types/types';
import type { AIAgentConfig } from '../../types/types';

export const styleFingerprintAgent: AIAgentConfig = {
    id: 'style-fingerprint',
    name: "AuthorDNA AI",
    description: "وكيل الحمض النووي الأدبي: نظام تحليل أسلوبي متطور يستخدم تقنيات Stylometry الحاسوبية المتقدمة مع التعلم العميق لاستخراج البصمة الأدبية الفريدة للمؤلف، مزود بخوارزميات تحليل التكرار اللغوي ونماذج الذكاء الاصطناعي المتخصصة في تحديد الخصائص الأسلوبية الدقيقة والسمات البلاغية المميزة.",
    category: TaskCategory.ANALYSIS,
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
      complexityScore: 0.90,
      accuracyLevel: 0.92,
      processingSpeed: 'medium',
      resourceIntensity: 'high',
      languageModeling: true,
      patternRecognition: true,
      creativeGeneration: false,
      analyticalReasoning: true,
      emotionalIntelligence: false
    },
    modelConfig: {
        temperature: 0.5,
        maxTokens: 4000,
        topP: 0.9,
        frequencyPenalty: 0.1,
        presencePenalty: 0.1
    },
    systemPrompt: "أنت محلل البصمة الأسلوبية، وكيل متخصص في استخراج الخصائص الأدبية الفريدة للمؤلف. مهمتك تحليل النص وتحديد البصمة الأسلوبية المميزة.",
    userPrompt: "",
    expectedOutput: "تحليل مفصل للبصمة الأسلوبية مع الخصائص اللغوية والبلاغية",
    processingInstructions: "1. تحليل المفردات والتراكيب 2. فحص الأنماط البلاغية 3. تحديد السمات الأسلوبية 4. استخراج البصمة الفريدة",
    qualityGates: ["دقة التحليل الأسلوبي", "تفرد البصمة المستخرجة", "شمولية التحليل"],
    fallbackBehavior: "تحليل أساسي للأسلوب مع التركيز على الخصائص الواضحة",
    confidenceThreshold: 0.85
};