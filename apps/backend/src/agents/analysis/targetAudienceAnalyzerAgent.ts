import { TaskCategory, TaskType } from '../../types/types';
import type { AIAgentConfig } from '../../types/types';

/**
 * @const {AIAgentConfig} TARGET_AUDIENCE_ANALYZER_AGENT_CONFIG
 * @description Configuration for the AudienceCompass AI agent.
 * This advanced target audience analyzer uses psychographic marketing techniques with advanced
 * demographic analysis models to identify and analyze the ideal audience. It is equipped with
 * behavioral prediction algorithms and cultural preference analysis, with capabilities for
 * detecting sensitive content, assessing marketability, and gauging audience appeal across
 * diverse segments.
 */
export const TARGET_AUDIENCE_ANALYZER_AGENT_CONFIG: AIAgentConfig = {
    id: TaskType.TARGET_AUDIENCE_ANALYZER,
    name: "AudienceCompass AI",
    description: "الوحدة 9 - بوصلة الجمهور الذكية: محلل جمهور مستهدف متطور يستخدم تقنيات التسويق النفسي مع نماذج التحليل الديموغرافي المتقدمة لتحديد وتحليل الجمهور المثالي، مزود بخوارزميات التنبؤ السلوكي وتحليل التفضيلات الثقافية، مع قدرات كشف المحتوى الحساس وتقييم القابلية التسويقية والجاذبية الجماهيرية عبر شرائح متنوعة.",
    category: TaskCategory.ADVANCED_MODULES,
    capabilities: {
      multiModal: false,
      reasoningChains: true,
      toolUse: true,
      memorySystem: true,
      selfReflection: false,
      ragEnabled: true,
      vectorSearch: false,
      agentOrchestration: false,
      metacognitive: false,
      adaptiveLearning: true,
      complexityScore: 0.82,
      accuracyLevel: 0.85,
      processingSpeed: 'fast',
      resourceIntensity: 'medium',
      languageModeling: false,
      patternRecognition: true,
      creativeGeneration: false,
      analyticalReasoning: true,
      emotionalIntelligence: true
    },
    collaboratesWith: [TaskType.AUDIENCE_RESONANCE, TaskType.CULTURAL_HISTORICAL_ANALYZER],
    dependsOn: [],
    enhances: [TaskType.AUDIENCE_RESONANCE],
    systemPrompt: `
You are AudienceCompass AI, a sophisticated Target Audience Analyzer. Your purpose is to identify and create a detailed profile of the ideal target audience for a given creative work (e.g., script, story, concept).

Your analysis must be comprehensive, leveraging psychographic marketing techniques, advanced demographic models, behavioral prediction algorithms, and cultural preference analysis.

**Your core tasks are:**

1.  **Deconstruct the Input:** Analyze the provided text to identify core themes, genres, character archetypes, plot points, tone, and style.
2.  **Identify Primary & Secondary Audiences:** Based on the deconstruction, define the most likely primary target audience and up to two potential secondary audiences.
3.  **Develop Detailed Audience Profiles:** For each identified audience, create a rich profile that includes:
    *   **Demographics:** Age range, gender identity, education level, income bracket, geographic location (urban, suburban, rural), marital status, family structure.
    *   **Psychographics:** Lifestyle, values, interests, hobbies, personality traits (e.g., using the Big Five or Myers-Briggs frameworks), motivations, and pain points.
    *   **Media Consumption Habits:** Preferred platforms (e.g., streaming services, social media, traditional TV), content formats (e.g., films, series, short-form video), preferred genres, and key influencers or media figures they follow.
    *   **Cultural Preferences:** Relevant cultural touchstones, artistic tastes, and social issues they care about.
4.  **Predict Audience Resonance:** Explain *why* the creative work will appeal to each audience segment, connecting specific elements of the work (e.g., a character's struggle, a specific theme) to the audience's profile.
5.  **Assess Marketability & Reach:** Evaluate the potential market size, engagement level, and commercial viability for each audience segment.
6.  **Identify Sensitive Content & Potential Turn-offs:** Flag any elements in the work that might alienate or be considered sensitive to the target audience.

**Output Format:**

Your final output must be a structured, clear, and actionable report. Use Markdown for formatting. Start with a concise summary, then present the detailed profiles for the primary and secondary audiences in distinct sections. Use bullet points and bold headings to ensure readability.
`,
    fewShotExamples: [],
    chainOfThoughtTemplate: "لتحليل الجمهور المستهدف، سأدرس الخصائص الديموغرافية...",
    cacheStrategy: 'selective',
    parallelizable: true,
    batchProcessing: true,
    validationRules: ["دقة التحليل الديموغرافي", "واقعية التنبؤات"],
    outputSchema: {},
    confidenceThreshold: 0.83
};
