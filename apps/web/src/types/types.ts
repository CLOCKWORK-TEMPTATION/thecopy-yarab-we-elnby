/**
 * @file This file defines the core TypeScript types and enums used throughout the application.
 * These types ensure consistency and provide strong typing for agent configurations, tasks, and other critical data structures.
 */

/**
 * @enum {string} TaskType
 * @description Defines the unique identifiers for all available agent tasks.
 * This enum is crucial for task routing, agent selection, and configuration mapping.
 */
export const enum TaskType {
  // Core foundational agents
  ANALYSIS = "analysis",
  CREATIVE = "creative",
  INTEGRATED = "integrated",
  COMPLETION = "completion",

  // Advanced analytical agents
  RHYTHM_MAPPING = "rhythm-mapping",
  CHARACTER_NETWORK = "character-network",
  DIALOGUE_FORENSICS = "dialogue-forensics",
  THEMATIC_MINING = "thematic-mining",
  STYLE_FINGERPRINT = "style-fingerprint",
  CONFLICT_DYNAMICS = "conflict-dynamics",

  // Creative generation agents
  ADAPTIVE_REWRITING = "adaptive-rewriting",
  SCENE_GENERATOR = "scene-generator",
  CHARACTER_VOICE = "character-voice",
  WORLD_BUILDER = "world-builder",

  // Predictive & optimization agents
  PLOT_PREDICTOR = "plot-predictor",
  TENSION_OPTIMIZER = "tension-optimizer",
  AUDIENCE_RESONANCE = "audience-resonance",
  PLATFORM_ADAPTER = "platform-adapter",

  // Advanced specialized modules
  CHARACTER_DEEP_ANALYZER = "character-deep-analyzer",
  DIALOGUE_ADVANCED_ANALYZER = "dialogue-advanced-analyzer",
  VISUAL_CINEMATIC_ANALYZER = "visual-cinematic-analyzer",
  THEMES_MESSAGES_ANALYZER = "themes-messages-analyzer",
  CULTURAL_HISTORICAL_ANALYZER = "cultural-historical-analyzer",
  PRODUCIBILITY_ANALYZER = "producibility-analyzer",
  TARGET_AUDIENCE_ANALYZER = "target-audience-analyzer",
  LITERARY_QUALITY_ANALYZER = "literary-quality-analyzer",
  RECOMMENDATIONS_GENERATOR = "recommendations-generator",

  // Additional task types for compatibility
  SUMMARIZE = "summarize",
  ANALYZE_CHARACTERS = "analyze-characters",
  CREATIVE_WRITING = "creative-writing",
  PLOT_PREDICTION = "plot-prediction",
  THEMATIC_ANALYSIS = "thematic-analysis",
  STYLE_ANALYSIS = "style-analysis",
  SCENE_GENERATION = "scene-generation",
  WORLDBUILDING = "worldbuilding",
  TENSION_ANALYSIS = "tension-analysis",
  ADAPTATION = "adaptation",
  VISUAL_ANALYSIS = "visual-analysis",
  THEME_MESSAGE_ANALYSIS = "theme-message-analysis",
  RECOMMENDATION = "recommendation",

  // Additional missing task types
  AUDIENCE_ANALYSIS = "audience-analysis",
  TEXT_COMPLETION = "text-completion",
  COMPREHENSIVE_ANALYSIS = "comprehensive-analysis",
  CHARACTER_ANALYSIS = "character-analysis",
}

/**
 * @enum {string} TaskCategory
 * @description Categorizes agents into broad functional groups.
 * This helps in organizing and presenting agents to the user.
 */
export const enum TaskCategory {
  CORE = "CORE",
  ANALYSIS = "ANALYSIS",
  ANALYSES = "ANALYSES",
  AGENTS = "AGENTS",
  CREATIVE = "CREATIVE",
  PREDICTIVE = "PREDICTIVE",
  ADVANCED_MODULES = "ADVANCED_MODULES",
  EVALUATION = "EVALUATION",
  GENERATION = "GENERATION",
  INTEGRATION = "INTEGRATION",
}

/**
 * @interface CompletionEnhancementOption
 * @description Defines the structure for an option that can enhance a completion task.
 * @property {TaskType} id - The unique identifier for the enhancement task.
 * @property {string} label - The user-facing label for the enhancement option.
 */
export interface CompletionEnhancementOption {
  id: TaskType;
  label: string;
}

/**
 * @interface AIAgentConfig
 * @description Provides a comprehensive configuration for an AI agent.
 * This interface details everything from the agent's identity and capabilities to its operational parameters.
 * @property {TaskType} id - The unique identifier for the agent, linking it to a specific task.
 * @property {string} name - The user-friendly name of the agent.
 * @property {string} description - A detailed description of the agent's purpose and functionality.
 * @property {TaskCategory} category - The category the agent belongs to.
 * @property {object} capabilities - A detailed object outlining the agent's technical and cognitive abilities.
 * @property {TaskType[]} collaboratesWith - A list of other agents this agent can collaborate with.
 * @property {TaskType[]} dependsOn - A list of agents whose output is required before this agent can run.
 * @property {TaskType[]} enhances - A list of agents that this agent can enhance.
 * @property {string} systemPrompt - The base instruction or persona given to the AI model.
 * @property {any[]} fewShotExamples - Examples provided to the model to guide its responses.
 * @property {string} chainOfThoughtTemplate - A template for structured, multi-step reasoning.
 * @property {string} cacheStrategy - The caching mechanism to use for the agent's responses.
 * @property {boolean} parallelizable - Indicates if the agent can be run in parallel with others.
 * @property {boolean} batchProcessing - Indicates if the agent supports processing multiple inputs at once.
 * @property {string[]} validationRules - Rules for validating the agent's output.
 * @property {any} outputSchema - The expected schema of the agent's output.
 * @property {number} confidenceThreshold - The minimum confidence level required for the agent to return a result.
 */
export interface AIAgentConfig {
  id?: string;
  name: string;
  description: string;
  category: TaskCategory | string;
  taskType?: TaskType;
  instructions?: string;
  capabilities?: string[] | Record<string, boolean | string | number>;
  collaboratesWith?: TaskType[];
  dependsOn?: TaskType[];
  enhances?: TaskType[];
  modelConfig?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
  };
  systemPrompt?: string;
  userPrompt?: string;
  expectedOutput?: string;
  processingInstructions?: string;
  qualityGates?: string[];
  fallbackBehavior?: string;
  confidenceThreshold?: number;
  fewShotExamples?: any[];
  chainOfThoughtTemplate?: string;
  cacheStrategy?: string;
  parallelizable?: boolean;
  batchProcessing?: boolean;
  validationRules?: string[];
  outputSchema?: any;
}

/**
 * Represents a single spoken or parenthetical line in the structured screenplay model.
 */
export interface DialogueLine {
  /** Unique identifier generated for tracking the dialogue line. */
  id: string;
  /** Character name associated with the line. */
  character: string;
  /** Raw text content of the line. */
  text: string;
  /** One-based index of the line within the original script. */
  lineNumber: number;
  /** Identifier of the scene that contains this line. */
  sceneId: string;
  /**
   * Type of dialogue line captured.
   * `dialogue` denotes spoken text whereas `parenthetical` stores inline directions.
   */
  type: "dialogue" | "parenthetical";
}

/**
 * Captures metadata for a screenplay character and their dialogue footprint.
 */
export interface Character {
  /** Canonical character name. */
  name: string;
  /** Total number of dialogue lines attributed to the character. */
  dialogueCount: number;
  /** Detailed list of dialogue entries spoken by the character. */
  dialogueLines: DialogueLine[];
  /** Identifier of the first scene where the character appears. */
  firstSceneId?: string;
}

/**
 * Stores action lines within a scene with their original ordering preserved.
 */
export interface SceneActionLine {
  /** Original text for the action or description line. */
  text: string;
  /** One-based index within the screenplay. */
  lineNumber: number;
}

/**
 * Represents a processed file for agent input
 */
export interface ProcessedFile {
  name: string;
  content: string;
  mimeType: string;
  isBase64: boolean;
  size: number;
}

/**
 * AI Writing Assistant interface for compatibility
 */
export interface AIWritingAssistantLike {
  generateText(
    prompt: string,
    context: string,
    options?: any
  ): Promise<{ text?: string }>;
}

/**
 * Represents a structured screenplay scene extracted from free-form text.
 */
export interface Scene {
  /** Stable identifier for the scene. */
  id: string;
  /** Normalized heading text (e.g. "مشهد 1"). */
  heading: string;
  /** Zero-based scene position within the screenplay. */
  index: number;
  /** One-based line number where the scene begins. */
  startLineNumber: number;
  /** One-based line number where the scene ends. */
  endLineNumber?: number;
  /** Ordered list of raw lines included in the scene. */
  lines: string[];
  /** Spoken and parenthetical dialogue entries contained in the scene. */
  dialogues: DialogueLine[];
  /** Descriptive or action-oriented lines associated with the scene. */
  actionLines: SceneActionLine[];
}

/**
 * Root data model describing a structured screenplay document.
 */
export interface Script {
  /** Original screenplay text provided by the user. */
  rawText: string;
  /** Total number of lines in the screenplay. */
  totalLines: number;
  /** Ordered collection of structured scenes. */
  scenes: Scene[];
  /** Aggregated character information keyed by character name. */
  characters: Record<string, Character>;
  /** Flat list of all dialogue lines for quick inspection. */
  dialogueLines: DialogueLine[];
}
