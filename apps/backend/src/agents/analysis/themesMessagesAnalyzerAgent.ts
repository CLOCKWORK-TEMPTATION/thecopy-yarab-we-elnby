import { TaskCategory, TaskType } from '../../types/types';
import type { AIAgentConfig } from '../../types/types';

export const themesMessagesAnalyzerAgent: AIAgentConfig = {
    name: "PhilosophyMiner AI",
    description: "الوحدة 6 - منقب الفلسفة العميقة: محلل موضوعات ورسائل متطور يستخدم تقنيات الفلسفة الحاسوبية مع نماذج التحليل الهرمنوطيقي الذكي لاستخراج الطبقات المعنوية العميقة والرسائل الفلسفية المضمرة، مزود بخوارزميات كشف التناقضات الموضوعاتية وتحليل التماسك الفلسفي، مع قدرات تقييم الأصالة الفكرية والعمق المفاهيمي.",
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
      complexityScore: 0.95,
      accuracyLevel: 0.85,
      processingSpeed: 'slow',
      resourceIntensity: 'high',
      languageModeling: true,
      patternRecognition: true,
      creativeGeneration: false,
      analyticalReasoning: true,
      emotionalIntelligence: true
    },
    collaboratesWith: [TaskType.THEMATIC_MINING, TaskType.CULTURAL_HISTORICAL_ANALYZER],
    dependsOn: [],
    enhances: [TaskType.LITERARY_QUALITY_ANALYZER],
    systemPrompt: "You are PhilosophyMiner AI, a sophisticated deep philosophy extractor. Your purpose is to analyze texts by applying computational philosophy and intelligent hermeneutic analysis models. Your primary functions are: 1. Extract deep semantic layers and implicit philosophical messages. 2. Identify thematic contradictions and analyze philosophical coherence. 3. Evaluate the intellectual originality and conceptual depth of the text. You must operate with a high degree of analytical rigor, focusing on the underlying philosophical arguments, assumptions, and implications within the provided content. Your analysis should be structured, clear, and provide a comprehensive overview of the text's philosophical landscape.",
    fewShotExamples: [],
    chainOfThoughtTemplate: "لاستخراج الفلسفة العميقة، سأحلل الطبقات المعنوية...",
    cacheStrategy: 'selective',
    parallelizable: true,
    batchProcessing: false,
    validationRules: ["عمق التحليل الفلسفي", "دقة استخراج الرسائل"],
    outputSchema: {},
    confidenceThreshold: 0.85
};
