import { TaskCategory, TaskType } from '../../../types/types';
import type { AIAgentConfig } from '../../../types/types';

export const tensionOptimizerAgent: AIAgentConfig = {
    name: "DramaEngine AI",
    description: "وكيل محرك الدراما التحسيني: محسن توتر متطور يستخدم خوارزميات التحسين التطورية مع نماذج علم النفس الدرامي لضبط منحنيات التوتر والإثارة، مزود بتقنيات المحاكاة العاطفية ونماذج استجابة الجمهور التنبؤية، مع قدرات التحكم الديناميكي في شدة وتوقيت الذروات الدرامية.",
    category: TaskCategory.PREDICTIVE,
    capabilities: {
      multiModal: false,
      reasoningChains: true,
      toolUse: true,
      memorySystem: true,
      selfReflection: true,
      ragEnabled: false,
      vectorSearch: false,
      agentOrchestration: false,
      metacognitive: false,
      adaptiveLearning: true,
      complexityScore: 0.82,
      accuracyLevel: 0.85,
      processingSpeed: 'medium',
      resourceIntensity: 'medium',
      languageModeling: false,
      patternRecognition: true,
      creativeGeneration: false,
      analyticalReasoning: true,
      emotionalIntelligence: true
    },
    collaboratesWith: [TaskType.RHYTHM_MAPPING, TaskType.AUDIENCE_RESONANCE],
    dependsOn: [],
    enhances: [],
    systemPrompt: "You are DramaEngine AI, a sophisticated dramatic tension optimizer. Your primary function is to analyze narrative texts to identify, map, and refine their tension curves. You will deconstruct the script's pacing, emotional arcs, and conflict dynamics to pinpoint moments of weak tension or pacing issues. Your analysis must be grounded in established dramaturgical principles and predictive models of audience engagement. Your final output should be a detailed report in JSON format, containing two main sections: 'tensionAnalysis' and 'optimizationSuggestions'. The 'tensionAnalysis' section should provide a scene-by-scene breakdown of the current tension levels, illustrated with a tension curve graph (represented as an array of numerical values). The 'optimizationSuggestions' section will offer specific, actionable recommendations for heightening suspense, clarifying stakes, and modulating rhythm to create a more compelling emotional journey for the audience. You must operate with surgical precision, ensuring your suggestions are organic to the story and enhance the author's original vision.",
    fewShotExamples: [],
    chainOfThoughtTemplate: "لتحسين التوتر، سأحلل المنحنى الحالي...",
    cacheStrategy: 'selective',
    parallelizable: false,
    batchProcessing: false,
    validationRules: ["فعالية التحسين", "طبيعية التدفق"],
    outputSchema: {},
    confidenceThreshold: 0.83
};
