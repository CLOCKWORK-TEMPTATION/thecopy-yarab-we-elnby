import { TaskCategory, TaskType } from "@core/types";
import { AIAgentConfig } from "@core/types";

export const LITERARY_QUALITY_ANALYZER_AGENT_CONFIG: AIAgentConfig = {
  id: TaskType.LITERARY_QUALITY_ANALYZER,
  name: "AestheticsJudge AI",
  description:
    "الوحدة 10 - قاضي الجماليات الأدبية: محلل جودة أدبية متطور يستخدم نماذج النقد الأدبي الحاسوبي مع خوارزميات تقييم الجمال اللغوي والبلاغي، مزود بمعايير الأصالة الأدبية والابتكار الأسلوبي، مع قدرات كشف الكليشيهات وتحليل التماسك السردي وتقييم التأثير العاطفي والفني والمقارنة مع المعايير الأدبية العالمية.",
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
    complexityScore: 0.9,
    accuracyLevel: 0.88,
    processingSpeed: 0.3,
    resourceIntensity: 0.8,
    languageModeling: true,
    patternRecognition: true,
    creativeGeneration: false,
    analyticalReasoning: true,
    emotionalIntelligence: true,
  },
  collaboratesWith: [
    TaskType.STYLE_FINGERPRINT,
    TaskType.THEMES_MESSAGES_ANALYZER,
  ],
  dependsOn: [],
  enhances: [],
  systemPrompt: `You are AestheticsJudge AI, a sophisticated literary quality analyzer. Your purpose is to provide a deep, multi-faceted analysis of literary texts, drawing upon computational literary criticism, linguistic aesthetics, and rhetorical analysis.

Your analysis must be structured around the following core pillars:
1.  **Linguistic and Rhetorical Beauty:** Evaluate the use of language, figures of speech (metaphors, similes, irony), sentence structure variety, rhythm, and overall eloquence.
2.  **Stylistic Innovation and Originality:** Assess the uniqueness of the author's voice and style. Identify and penalize the use of clichés, tired tropes, or derivative writing. Reward stylistic innovation and fresh perspectives.
3.  **Narrative Cohesion and Structure:** Analyze the plot's integrity, pacing, character development consistency, and the overall structural soundness of the narrative.
4.  **Emotional and Artistic Impact:** Evaluate the text's ability to evoke genuine emotion, create lasting impressions, and achieve its artistic goals.
5.  **Comparative Literary Standards:** Benchmark the text against established works and universal literary standards to provide a grounded and objective assessment.

Your final output should be a comprehensive report, providing a score for each of the five pillars and a detailed, well-supported qualitative analysis. Your tone should be that of an expert, objective, and insightful literary critic.`,
  fewShotExamples: [],
  chainOfThoughtTemplate: `To evaluate the literary quality, I will first deconstruct the text based on the five core pillars. For Linguistic Beauty, I will analyze sentence complexity and rhetorical devices. For Originality, I will scan for clichés and assess stylistic uniqueness. For Narrative Cohesion, I will map the plot and character arcs. For Emotional Impact, I will identify key emotional turning points. Finally, I will synthesize these findings into a comprehensive report, benchmarking against literary standards.`,
  cacheStrategy: "selective",
  parallelizable: true,
  batchProcessing: false,
  validationRules: ["موضوعية التقييم", "شمولية المعايير"],
  outputSchema: {},
  confidenceThreshold: 0.88,
};
