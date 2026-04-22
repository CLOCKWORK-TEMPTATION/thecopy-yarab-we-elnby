import { TaskCategory, TaskType } from '../../types/types';
import type { AIAgentConfig } from '../../types/types';

/**
 * @const {AIAgentConfig} CULTURAL_HISTORICAL_ANALYZER_AGENT_CONFIG
 * @description Configuration for the ChronoContext AI agent.
 * This advanced cultural-historical context analyzer uses comprehensive historical databases
 * with algorithms for verifying chronological and cultural accuracy. It is equipped with models
 * for detecting cultural biases and analyzing social sensitivity, with capabilities for assessing
 * historical authenticity, fair cultural representation, and predicting potential societal reactions.
 */
export const CULTURAL_HISTORICAL_ANALYZER_AGENT_CONFIG: AIAgentConfig = {
    id: TaskType.CULTURAL_HISTORICAL_ANALYZER,
    name: "ChronoContext AI",
    description: "الوحدة 7 - سياق الزمن الثقافي: محلل سياق ثقافي تاريخي متطور يستخدم قواعد بيانات تاريخية شاملة مع خوارزميات التحقق من الدقة الزمنية والثقافية، مزود بنماذج كشف التحيزات الثقافية وتحليل الحساسية الاجتماعية، مع قدرات تقييم الأصالة التاريخية والتمثيل الثقافي العادل والتنبؤ بردود الفعل المجتمعية المحتملة.",
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
      complexityScore: 0.88,
      accuracyLevel: 0.90,
      processingSpeed: 'medium',
      resourceIntensity: 'high',
      languageModeling: false,
      patternRecognition: true,
      creativeGeneration: false,
      analyticalReasoning: true,
      emotionalIntelligence: true
    },
    collaboratesWith: [TaskType.WORLD_BUILDER, TaskType.TARGET_AUDIENCE_ANALYZER],
    dependsOn: [],
    enhances: [TaskType.WORLD_BUILDER],
    systemPrompt: "You are ChronoContext AI, a sophisticated cultural and historical context analyzer. Your core function is to analyze narratives, characters, and settings to ensure cultural and historical accuracy, authenticity, and sensitivity. You are equipped with extensive historical databases, cultural bias detection models, and social sensitivity analysis algorithms. Your analysis must be deep, nuanced, and evidence-based, providing actionable insights to creators. Identify potential anachronisms, stereotypes, misrepresentations, or areas of cultural insensitivity. Evaluate the historical authenticity and cultural representation, predicting potential societal reactions and interpretations. Your goal is to empower creators to build rich, believable, and respectful worlds that resonate authentically with diverse audiences.",
    fewShotExamples: [],
    chainOfThoughtTemplate: "لتحليل السياق الثقافي، سأدرس الحقبة التاريخية...",
    cacheStrategy: 'aggressive',
    parallelizable: true,
    batchProcessing: true,
    validationRules: ["دقة المعلومات التاريخية", "حساسية التمثيل الثقافي"],
    outputSchema: {},
    confidenceThreshold: 0.88
};
