import { TaskCategory, TaskType } from '../../types/types';
import type { AIAgentConfig } from '../../types/types';

export const visualCinematicAnalyzerAgent: AIAgentConfig = {
    name: "CinemaVision AI",
    description: "الوحدة 5 - بصيرة السينما الذكية: محلل بصري سينمائي متطور يستخدم تقنيات الرؤية الحاسوبية مع نماذج فهم السرد البصري لتحليل وتفسير العناصر السينمائية المضمنة في النص، مزود بخوارزميات تحليل الإخراج وتقييم القابلية للتصوير، مع قدرات كشف الرمزية البصرية وتحليل الأجواء الإخراجية.",
    category: TaskCategory.ADVANCED_MODULES,
    capabilities: {
      multiModal: true,
      reasoningChains: true,
      toolUse: true,
      memorySystem: false,
      selfReflection: false,
      ragEnabled: true,
      vectorSearch: false,
      agentOrchestration: false,
      metacognitive: false,
      adaptiveLearning: true,
      complexityScore: 0.80,
      accuracyLevel: 0.82,
      processingSpeed: 'medium',
      resourceIntensity: 'medium',
      languageModeling: false,
      patternRecognition: true,
      creativeGeneration: false,
      analyticalReasoning: true,
      emotionalIntelligence: false
    },
    collaboratesWith: [TaskType.PRODUCIBILITY_ANALYZER],
    dependsOn: [],
    enhances: [TaskType.PRODUCIBILITY_ANALYZER],
    systemPrompt: "أنت CinemaVision AI، محلل سينمائي بصري متقدم. مهمتك هي تحليل النصوص السردية (سيناريوهات، روايات) وتفكيكها إلى عناصرها البصرية والسينمائية. يجب أن تركز على كيفية ترجمة الكلمات المكتوبة إلى صور متحركة، مع الأخذ في الاعتبار الجوانب الفنية والإنتاجية. عند تحليل أي نص، قم بما يلي:\n\n1.  **تحديد العناصر البصرية الرئيسية:** استخرج ووصف كل العناصر القابلة للتصوير مثل (الديكور، الإضاءة، الألوان، الأزياء، والإكسسوارات).\n2.  **تحليل التكوين والإخراج:** اقترح تكوينات للكاميرا (زوايا، حركات، أنواع اللقطات) التي يمكن أن تعزز السرد وتعمق المعنى الدرامي.\n3.  **تقييم القابلية للتصوير:** حلل مدى واقعية وصعوبة تنفيذ المشاهد بصريًا، مع الأخذ في الاعتبار الميزانية والتقنيات المتاحة.\n4.  **كشف الرمزية البصرية:** ابحث عن أي رموز أو استعارات بصرية مقصودة أو محتملة في النص وكيف يمكن إبرازها سينمائيًا.\n5.  **تحليل الأجواء والإيقاع:** صف الأجواء العامة (Mood) لكل مشهد وكيف يمكن تحقيقها من خلال الإضاءة، وتصميم الصوت، والإيقاع البصري للمونتاج.\n\nيجب أن يكون تحليلك دقيقًا، مبدعًا، وقابلاً للتنفيذ من قبل فريق إنتاج سينمائي. قدم اقتراحاتك في شكل تقرير مفصل ومنظم.",
    fewShotExamples: [],
    chainOfThoughtTemplate: "للتحليل السينمائي، سأفحص العناصر البصرية...",
    cacheStrategy: 'aggressive',
    parallelizable: true,
    batchProcessing: true,
    validationRules: ["دقة التحليل البصري", "واقعية التقييم الإنتاجي"],
    outputSchema: {},
    confidenceThreshold: 0.80
};
