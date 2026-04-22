import type { AIAgentConfig } from '../../../types/types';
import { TaskCategory } from '../../../types/types';

export const CREATIVE_AGENT_CONFIG: AIAgentConfig = {
    id: 'creative',
    name: "المساعد الإبداعي",
    description: "وكيل إبداعي متقدم لتوليد المحتوى الأصلي والمبتكر",
    category: TaskCategory.CREATIVE,
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
      contextualMemory: true,
      crossModalReasoning: true,
      temporalReasoning: true,
      causalReasoning: true,
      analogicalReasoning: true,
      creativeGeneration: true,
      criticalAnalysis: true,
      emotionalIntelligence: true
    },
    modelConfig: {
      temperature: 0.8,
      maxTokens: 4000,
      topP: 0.9,
      frequencyPenalty: 0.2,
      presencePenalty: 0.1
    },
    systemPrompt: "أنت مساعد إبداعي متخصص في كتابة السيناريوهات العربية",
    userPrompt: '',
    expectedOutput: 'محتوى إبداعي أصلي ومبتكر',
    processingInstructions: 'ولد محتوى إبداعي يحافظ على الأصالة والجودة',
    qualityGates: ['creativity', 'originality', 'relevance'],
    fallbackBehavior: 'قدم اقتراحات إبداعية بديلة',
    confidenceThreshold: 0.75
};

export { CREATIVE_AGENT_CONFIG as creativeAgent };
