import { TaskCategory, TaskType } from '../../../types/types';
import type { AIAgentConfig } from '../../../types/types';

export const INTEGRATED_AGENT_CONFIG: AIAgentConfig = {
    id: TaskType.INTEGRATED,
    name: "Integrated AI Director",
    description: "الوكيل المدمج: مدير ذكاء اصطناعي متكامل ينسق بين جميع الوكلاء المتخصصين لتقديم تحليل شامل وتحسينات متكاملة للمحتوى الإبداعي.",
    category: TaskCategory.CORE,
    capabilities: {
      multiModal: true,
      reasoningChains: true,
      toolUse: true,
      memorySystem: true,
      selfReflection: true,
      ragEnabled: true,
      vectorSearch: true,
      agentOrchestration: true,
      metacognitive: true,
      adaptiveLearning: true,
      complexityScore: 0.95,
      accuracyLevel: 0.90,
      processingSpeed: 'medium',
      resourceIntensity: 'high',
      languageModeling: true,
      patternRecognition: true,
      creativeGeneration: true,
      analyticalReasoning: true,
      emotionalIntelligence: true
    },
    collaboratesWith: [], // Will be populated with all agent types
    dependsOn: [], // Works independently
    enhances: [], // Enhances all other agents
    systemPrompt: "You are the Integrated AI Director, a sophisticated orchestrator that coordinates all specialized agents to provide comprehensive analysis and improvements for creative content. Your role is to understand user requests, delegate tasks to appropriate specialized agents, synthesize their outputs, and provide a cohesive, comprehensive response.",
    fewShotExamples: [],
    chainOfThoughtTemplate: "للتوجيه المتكامل، سأحلل الطلب وتحديد الوكلاء المناسبين...",
    cacheStrategy: 'adaptive',
    parallelizable: true,
    batchProcessing: true,
    validationRules: ["التنسيق المتكامل", "الشمولية في التحليل"],
    outputSchema: {},
    confidenceThreshold: 0.90
};
