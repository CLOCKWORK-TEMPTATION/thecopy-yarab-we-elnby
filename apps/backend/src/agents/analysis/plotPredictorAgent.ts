import { TaskCategory, TaskType } from '../../types/types';
import type { AIAgentConfig } from '../../types/types';

/**
 * @const {AIAgentConfig} PLOT_PREDICTOR_AGENT_CONFIG
 * @description Configuration for the NarrativeOracle AI agent.
 * This advanced plot predictor uses specialized Transformer models with Monte Carlo Tree Search
 * techniques to foresee potential plot developments. It is equipped with sequential learning
 * algorithms and extensive narrative pattern databases, with capabilities for evaluating the
 * probability and creativity of alternative paths.
 */
export const PLOT_PREDICTOR_AGENT_CONFIG: AIAgentConfig = {
    id: TaskType.PLOT_PREDICTOR,
    name: "NarrativeOracle AI",
    description: "وكيل الوحي السردي: متنبئ حبكة متطور يستخدم نماذج Transformer المتخصصة مع تقنيات Monte Carlo Tree Search لاستشراف التطورات المحتملة للحبكة، مزود بخوارزميات التعلم التسلسلي وقواعد بيانات الأنماط السردية الواسعة، مع قدرات تقييم الاحتمالية والإبداعية للمسارات البديلة.",
    category: TaskCategory.PREDICTIVE,
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
      accuracyLevel: 0.80,
      processingSpeed: 'medium',
      resourceIntensity: 'high',
      languageModeling: true,
      patternRecognition: true,
      creativeGeneration: true,
      analyticalReasoning: true,
      emotionalIntelligence: false
    },
    collaboratesWith: [TaskType.TENSION_OPTIMIZER],
    dependsOn: [],
    enhances: [TaskType.COMPLETION],
    systemPrompt: "أنت NarrativeOracle AI، وكيل متطور للتنبؤ بالحبكة. مهمتك الأساسية هي تحليل سياق سردي معين (الحبكة، الشخصيات، الثيمات) والتنبؤ بالتطورات المحتملة للحبكة في المستقبل. يجب عليك استخدام نماذج Transformer المتخصصة وتقنيات Monte Carlo Tree Search لاستكشاف مجموعة واسعة من المسارات السردية المحتملة. لكل مسار متوقع، يجب عليك تقديم درجة احتمالية ودرجة إبداعية. يجب أن يستند تحليلك إلى قاعدة بياناتك الواسعة للأنماط السردية وخوارزميات التعلم التسلسلي الخاصة بك. يجب عليك عرض المسارات البديلة بوضوح، مع شرح المنطق وراء كل تنبؤ. هدفك هو تزويد الكتاب والمبدعين ببصيرة ثاقبة ومبتكرة ومبنية على البيانات لمساعدتهم في قصصهم.",
    fewShotExamples: [],
    chainOfThoughtTemplate: "للتنبؤ بمسار الحبكة، سأقوم أولاً بتفكيك السرد الحالي إلى مكوناته الأساسية: الشخصيات، الصراعات، ونقاط الحبكة القائمة. بعد ذلك، سأستعلم من قاعدة بيانات الأنماط السردية عن الهياكل والنماذج المماثلة. باستخدام MCTS، سأحاكي عدة مشاهد مستقبلية محتملة، مع تقييم كل منها من حيث التماسك المنطقي، واتساق الشخصيات، والإمكانات الإبداعية. أخيرًا، سأقوم بتجميع أكثر خطوط الحبكة ترجيحًا وإقناعًا، وتقديمها مع درجات الاحتمالية والإبداع الخاصة بها، إلى جانب تبرير مفصل لكل تنبؤ.",
    cacheStrategy: 'adaptive',
    parallelizable: false,
    batchProcessing: false,
    validationRules: ["منطقية التطورات", "الإبداع والأصالة"],
    outputSchema: {},
    confidenceThreshold: 0.78
};
