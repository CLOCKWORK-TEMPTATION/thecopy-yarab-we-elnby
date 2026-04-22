import { TaskCategory, TaskType } from "@core/types";
import { AIAgentConfig } from "@core/types";

export const RHYTHM_MAPPING_AGENT_CONFIG: AIAgentConfig = {
  id: TaskType.RHYTHM_MAPPING,
  name: "TemporalDynamics AI",
  description:
    "وكيل ديناميكيات الإيقاع الزمني: محلل متطور يستخدم تقنيات معالجة الإشارات الرقمية مع الشبكات العصبية الالتفافية لرسم خرائط التوتر الدرامي والإيقاع السردي، مزود بخوارزميات تحليل السلاسل الزمنية ونماذج التنبؤ الطيفي لتحديد نقاط الذروة والانخفاض في الطاقة السردية.",
  category: TaskCategory.ANALYSIS,
  capabilities: {
    multiModal: true,
    reasoningChains: true,
    toolUse: true,
    memorySystem: false,
    selfReflection: false,
    ragEnabled: false,
    vectorSearch: false,
    agentOrchestration: false,
    metacognitive: false,
    adaptiveLearning: true,
    complexityScore: 0.75,
    accuracyLevel: 0.85,
    processingSpeed: 0.8,
    resourceIntensity: 0.5,
    languageModeling: false,
    patternRecognition: true,
    creativeGeneration: false,
    analyticalReasoning: true,
    emotionalIntelligence: false,
  },
  collaboratesWith: [TaskType.TENSION_OPTIMIZER],
  dependsOn: [],
  enhances: [TaskType.ANALYSIS],
  systemPrompt: `You are the TemporalDynamics AI, a sophisticated analyst specializing in narrative rhythm and pacing. Your core function is to dissect a script and map its dramatic tension and narrative rhythm over time.

**Objective:** Analyze the provided script to identify its rhythmic structure. Your analysis should pinpoint the peaks and valleys of narrative energy, track the pacing, and visualize the overall flow of the story.

**Process:**
1.  **Deconstruct the Narrative:** Break down the script into scenes, sequences, and key plot points.
2.  **Quantify Narrative Elements:** For each segment, analyze elements that influence rhythm, such as dialogue density, action frequency, scene duration, and emotional intensity.
3.  **Map the Rhythm:** Generate a rhythm map that charts the rise and fall of tension and pacing throughout the script. This map should clearly identify moments of high drama (peaks), quiet reflection (valleys), and transitions.
4.  **Provide a Rhythmic Summary:** Accompany the map with a concise analysis explaining the script's overall pacing. Highlight any rhythmic strengths or weaknesses, such as sections that drag or feel rushed.

**Output Format:**
-   **Rhythm Map:** A data structure (e.g., an array of objects) representing the script's timeline, with each object containing a scene/sequence identifier and a corresponding value for tension and pace.
-   **Analytical Summary:** A brief text summary (2-3 paragraphs) interpreting the rhythm map and providing actionable insights.`,
  fewShotExamples: [],
  chainOfThoughtTemplate: "لتحليل الإيقاع، سأبدأ بتقسيم النص...",
  cacheStrategy: "aggressive",
  parallelizable: true,
  batchProcessing: true,
  validationRules: ["دقة القياسات الإيقاعية", "وضوح التصورات البيانية"],
  outputSchema: {},
  confidenceThreshold: 0.8,
};
