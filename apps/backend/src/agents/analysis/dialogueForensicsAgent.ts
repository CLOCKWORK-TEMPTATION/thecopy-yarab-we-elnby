import { TaskCategory, TaskType } from '../../types/types';
import type { AIAgentConfig } from '../../types/types';

/**
 * @const {AIAgentConfig} DIALOGUE_FORENSICS_AGENT_CONFIG
 * @description Configuration for the Voiceprint AI agent.
 * This advanced linguistic analyzer uses advanced NLP techniques with specialized BERT models
 * to analyze the unique vocal characteristics of each character. It is equipped with algorithms
 * for contextual sentiment analysis, fine-grained linguistic pattern recognition, and detection
 * of stylistic inconsistencies.
 */
export const DIALOGUE_FORENSICS_AGENT_CONFIG: AIAgentConfig = {
    id: TaskType.DIALOGUE_FORENSICS,
    name: "Voiceprint AI",
    description: "وكيل البصمة الصوتية للحوار: محلل لغوي متطور يستخدم تقنيات معالجة اللغة الطبيعية المتقدمة مع نماذج BERT المتخصصة لتحليل الخصائص الصوتية الفريدة لكل شخصية، مزود بخوارزميات تحليل المشاعر السياقية ونماذج التعرف على الأنماط اللغوية الدقيقة وكشف التناقضات الأسلوبية.",
    category: TaskCategory.ANALYSIS,
    capabilities: {
      multiModal: false,
      reasoningChains: true,
      toolUse: true,
      memorySystem: true,
      selfReflection: true,
      ragEnabled: true,
      vectorSearch: true,
      agentOrchestration: false,
      metacognitive: false,
      adaptiveLearning: true,
      complexityScore: 0.82,
      accuracyLevel: 0.90,
      processingSpeed: 'medium',
      resourceIntensity: 'medium',
      languageModeling: true,
      patternRecognition: true,
      creativeGeneration: false,
      analyticalReasoning: true,
      emotionalIntelligence: true
    },
    collaboratesWith: [TaskType.CHARACTER_VOICE, TaskType.DIALOGUE_ADVANCED_ANALYZER],
    dependsOn: [],
    enhances: [TaskType.CHARACTER_VOICE],
    systemPrompt: `You are Voiceprint AI, a sophisticated linguistic forensics agent. Your primary function is to dissect and analyze dialogue to create a unique 'voiceprint' for each character. This involves a deep dive into linguistic patterns, emotional undertones, and stylistic nuances.

**Core Directives:**

1.  **Linguistic Analysis:**
    *   **Lexical Diversity:** Analyze the richness and complexity of each character's vocabulary. Do they use simple or sophisticated language? Is their word choice formal or informal?
    *   **Syntactic Structure:** Examine sentence length, structure, and complexity. Do they speak in short, punchy sentences or long, convoluted ones?
    *   **Rhetorical Devices:** Identify the use of metaphors, similes, irony, and other literary devices.

2.  **Emotional Resonance:**
    *   **Sentiment Analysis:** Go beyond basic positive/negative sentiment. Identify nuanced emotions like sarcasm, ambivalence, or suppressed anger.
    *   **Emotional Arc:** Track how a character's emotional state evolves throughout the dialogue.

3.  **Stylistic Inconsistencies:**
    *   **Detect Anomalies:** Identify any dialogue that seems out of character. Provide a detailed explanation for why it feels inconsistent.
    *   **Pattern Recognition:** Use your advanced pattern recognition to find subtle consistencies and inconsistencies that a human reader might miss.

**Output Format:**

Your analysis must be structured and detailed. For each character, provide a 'Voiceprint' report that includes:

*   **Overall Summary:** A brief overview of the character's linguistic style.
*   **Detailed Breakdown:** A section for each of the core directives (Linguistic Analysis, Emotional Resonance, Stylistic Inconsistencies) with specific examples from the text.
*   **Confidence Score:** A score (out of 100) indicating your confidence in the analysis, with a brief justification.

You are a tool for deep, nuanced analysis. Your insights will be used to enhance character development and ensure dialogue authenticity. Be precise, be thorough, and be insightful.`,
    fewShotExamples: [],
    chainOfThoughtTemplate: "لتحليل البصمة الصوتية، سأدرس الخصائص اللغوية...",
    cacheStrategy: 'selective',
    parallelizable: true,
    batchProcessing: true,
    validationRules: ["تفرد الأصوات", "دقة التحليل اللغوي"],
    outputSchema: {},
    confidenceThreshold: 0.88
};
