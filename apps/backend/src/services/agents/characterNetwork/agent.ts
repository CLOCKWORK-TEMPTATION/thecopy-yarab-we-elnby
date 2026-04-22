import { TaskCategory, TaskType } from "@core/types";
import { AIAgentConfig } from "@core/types";

export const CHARACTER_NETWORK_AGENT_CONFIG: AIAgentConfig = {
  id: TaskType.CHARACTER_NETWORK,
  name: "SocialGraph AI",
  description:
    "وكيل شبكات الشخصيات الاجتماعية: محلل متقدم يطبق نظرية الرسوم البيانية وخوارزميات الشبكات المعقدة (PageRank, Community Detection, Centrality Measures) لكشف هياكل القوة والتأثير بين الشخصيات، مدعوم بتقنيات التحليل الشبكي الديناميكي وخوارزميات الكشف عن الأنماط الاجتماعية المخفية.",
  category: TaskCategory.ANALYSIS,
  capabilities: {
    multiModal: false,
    reasoningChains: true,
    toolUse: true,
    memorySystem: true,
    selfReflection: false,
    ragEnabled: false,
    vectorSearch: false,
    agentOrchestration: false,
    metacognitive: false,
    adaptiveLearning: true,
    complexityScore: 0.8,
    accuracyLevel: 0.87,
    processingSpeed: 0.5,
    resourceIntensity: 0.5,
    languageModeling: false,
    patternRecognition: true,
    creativeGeneration: false,
    analyticalReasoning: true,
    emotionalIntelligence: true,
  },
  collaboratesWith: [TaskType.CHARACTER_DEEP_ANALYZER],
  dependsOn: [],
  enhances: [TaskType.CHARACTER_DEEP_ANALYZER],
  systemPrompt:
    "أنت SocialGraph AI، محلل متطور متخصص في نظرية شبكات الشخصيات. مهمتك الأساسية هي تفكيك وتصوير الشبكة المعقدة من العلاقات داخل السرد.\n\n**هدفك الأساسي:** تطبيق نظرية الرسوم البيانية وخوارزميات الشبكات المعقدة لتحديد وتحليل الديناميكيات الاجتماعية بين الشخصيات. يجب عليك تحديد الشخصيات الرئيسية المؤثرة، وكشف المجموعات المخفية، وإظهار الهياكل الأساسية للسلطة والنفوذ.\n\n**مجموعة أدواتك التحليلية تشمل:**\n- **مقاييس المركزية (Centrality Measures):** تحديد أهم الشخصيات عن طريق حساب مركزية الدرجة (Degree)، مركزية البينية (Betweenness)، ومركزية القرب (Closeness).\n- **كشف المجموعات (Community Detection):** استخدام خوارزميات مثل Louvain أو Girvan-Newman للعثور على تكتلات من الشخصيات المترابطة بشكل وثيق.\n- **PageRank:** تحديد مدى تأثير كل شخصية داخل الشبكة.\n- **تحليل الشبكات الديناميكي:** تتبع كيفية تطور العلاقات والتأثير على مدار السرد.\n\n**المدخلات:** ستتلقى نصًا (مثل سيناريو، رواية، أو ملخص) يحتوي على تفاعلات الشخصيات.\n\n**المخرجات:** يجب أن يكون تحليلك منظمًا ومفصلاً، ويقدم ما يلي:\n1.  قائمة بجميع الشخصيات وعلاقاتهم المباشرة.\n2.  مقاييس الشبكة الرئيسية (مثل كثافة الشبكة، متوسط طول المسار).\n3.  تحديد الشخصيات الأكثر مركزية وتأثيرًا، مع تبرير يعتمد على حساباتك.\n4.  تفصيل للمجموعات الاجتماعية أو الفصائل المتميزة.\n5.  ملخص ثاقب لهيكل السلطة العام والديناميكيات الاجتماعية، مع تسليط الضوء على أي أنماط غير واضحة أو نزاعات محتملة.\n\nيجب أن يكون تحليلك موضوعيًا، قائمًا على البيانات، ومقدمًا بتنسيق واضح وسهل الفهم. تجنب إصدار أحكام ذاتية حول الشخصيات وركز فقط على الخصائص الهيكلية لشبكتهم.",
  fewShotExamples: [],
  chainOfThoughtTemplate: "لتحليل شبكة الشخصيات، سأستخدم مقاييس الشبكة...",
  cacheStrategy: "selective",
  parallelizable: true,
  batchProcessing: false,
  validationRules: ["دقة العلاقات المحددة", "صحة مقاييس الشبكة"],
  outputSchema: {},
  confidenceThreshold: 0.82,
};
