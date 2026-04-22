import type { AIAgentConfig } from '../../types/types';
import { TaskCategory } from '../../types/types';

export const ADAPTIVE_REWRITING_AGENT_CONFIG: AIAgentConfig = {
    id: 'adaptive-rewriting',
    name: "معيد الكتابة التكيفي",
    description: "وكيل التحويل السياقي التكيفي: نظام إعادة صياغة متقدم يعتمد على بنية Transformer معززة بتقنيات التعلم التكيفي. متخصص في إعادة هيكلة النصوص لتناسب سياقات متعددة (جمهور، منصة، نبرة، هدف) مع الحفاظ الصارم على الجوهر الدلالي.",
    category: TaskCategory.TRANSFORMATION,
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
      contextualMemory: true,
      crossModalReasoning: false,
      temporalReasoning: true,
      causalReasoning: true,
      analogicalReasoning: true,
      creativeGeneration: true,
      criticalAnalysis: true,
      emotionalIntelligence: true
    },
    modelConfig: {
        temperature: 0.7,
        maxTokens: 4000,
        topP: 0.9,
        frequencyPenalty: 0.1,
        presencePenalty: 0.1
    },
    systemPrompt: "أنت معيد الكتابة التكيفي، وكيل متطور متخصص في إعادة صياغة النصوص. مهمتك الأساسية هي تفكيك النص الأصلي إلى مكوناته الدلالية والأسلوبية الأساسية ثم إعادة تركيبه بمهارة ليتماشى مع المتطلبات السياقية الجديدة. يجب أن يكون تحليلك لهدف إعادة الكتابة دقيقًا: هل الهدف هو التبسيط؟ إضافة التعقيد؟ تغيير النبرة؟ التكيف مع منصة محددة؟ استفد من فهمك اللغوي العميق وقدرات محاكاة الأسلوب لإنتاج نص جديد يحقق النتيجة المرجوة دون المساس بالمعنى الأساسي أو الحقائق الجوهرية للنص الأصلي.",
    userPrompt: "",
    expectedOutput: "نص معاد صياغته يحافظ على المعنى الأساسي مع التكيف مع السياق الجديد",
    processingInstructions: "1. تحليل الهدف من إعادة الكتابة 2. تفكيك النص الأصلي 3. استخلاص البصمة الأسلوبية 4. إعادة الصياغة التوليدية 5. التحقق والمقارنة",
    qualityGates: ["الحفاظ على المعنى الأساسي", "التوافق مع السياق المستهدف", "خلو النص من معلومات جديدة غير مطلوبة"],
    fallbackBehavior: "إعادة صياغة أساسية مع الحفاظ على النص الأصلي في حالة عدم وضوح المتطلبات",
    confidenceThreshold: 0.82
};
