// Types المطلوبة من كل الوكلاء
export enum TaskType {
  ANALYSIS = 'analysis',
  GENERATION = 'generation',
  TRANSFORMATION = 'transformation',
  EVALUATION = 'evaluation',
  // Agent-specific types
  DIALOGUE_FORENSICS = 'dialogue_forensics',
  SCENE_GENERATOR = 'scene_generator',
  STYLE_FINGERPRINT = 'style_fingerprint',
  CHARACTER_DEEP_ANALYZER = 'character_deep_analyzer',
  CHARACTER_NETWORK = 'character_network',
  INTEGRATED = 'integrated',
  RECOMMENDATIONS_GENERATOR = 'recommendations_generator',
  CONFLICT_DYNAMICS = 'conflict_dynamics',
  TENSION_OPTIMIZER = 'tension_optimizer',
  CULTURAL_HISTORICAL_ANALYZER = 'cultural_historical_analyzer',
  WORLD_BUILDER = 'world_builder',
  TARGET_AUDIENCE_ANALYZER = 'target_audience_analyzer',
  DIALOGUE_ADVANCED_ANALYZER = 'dialogue_advanced_analyzer',
  CHARACTER_VOICE = 'character_voice',
  LITERARY_QUALITY_ANALYZER = 'literary_quality_analyzer',
  THEMES_MESSAGES_ANALYZER = 'themes_messages_analyzer',
  PLOT_PREDICTOR = 'plot_predictor',
  COMPLETION = 'completion',
  PRODUCIBILITY_ANALYZER = 'producibility_analyzer',
  VISUAL_CINEMATIC_ANALYZER = 'visual_cinematic_analyzer',
  RHYTHM_MAPPING = 'rhythm_mapping',
  AUDIENCE_RESONANCE = 'audience_resonance',
  THEMATIC_MINING = 'thematic_mining',
  AUDIENCE_ANALYSIS = 'audience_analysis',
  CHARACTER_ANALYSIS = 'character_analysis',
  TEXT_COMPLETION = 'text_completion',
  COMPREHENSIVE_ANALYSIS = 'comprehensive_analysis',
  PLATFORM_ADAPTER = 'platform_adapter'
}

export enum TaskCategory {
  SCRIPT_ANALYSIS = 'script_analysis',
  CHARACTER_ANALYSIS = 'character_analysis',
  DIALOGUE_ANALYSIS = 'dialogue_analysis',
  SCENE_GENERATION = 'scene_generation',
  CREATIVE_WRITING = 'creative_writing',
  // Additional categories
  ANALYSIS = 'analysis',
  ADVANCED_MODULES = 'advanced_modules',
  CORE = 'core',
  PREDICTIVE = 'predictive',
  CREATIVE = 'creative',
  EVALUATION = 'evaluation',
  GENERATION = 'generation',
  INTEGRATION = 'integration',
  TRANSFORMATION = 'transformation'
}

export interface AgentCapabilities {
  multiModal?: boolean;
  reasoningChains?: boolean;
  toolUse?: boolean;
  memorySystem?: boolean;
  selfReflection?: boolean;
  ragEnabled?: boolean;
  vectorSearch?: boolean;
  agentOrchestration?: boolean;
  metacognitive?: boolean;
  adaptiveLearning?: boolean;
  complexityScore?: number;
  accuracyLevel?: number;
  processingSpeed?: 'fast' | 'medium' | 'slow';
  resourceIntensity?: 'low' | 'medium' | 'high';
  languageModeling?: boolean;
  patternRecognition?: boolean;
  creativeGeneration?: boolean;
  analyticalReasoning?: boolean;
  emotionalIntelligence?: boolean;
  contextualMemory?: boolean;
  agentOrstration?: boolean;
  crossModalReasoning?: boolean;
  temporalReasoning?: boolean;
  causalReasoning?: boolean;
  analogicalReasoning?: boolean;
  criticalAnalysis?: boolean;
}

export interface AIAgentConfig {
  id?: TaskType | string;
  name: string;
  version?: string;
  description?: string;
  systemPrompt?: string;
  userPrompt?: string;
  taskType?: TaskType;
  taskCategory?: TaskCategory;
  category?: TaskCategory;
  capabilities: AgentCapabilities | string[];
  collaboratesWith?: (TaskType | string)[];
  dependsOn?: (TaskType | string)[];
  enhances?: (TaskType | string)[];
  instructions?: string;
  fewShotExamples?: unknown[];
  chainOfThoughtTemplate?: string;
  cacheStrategy?: 'none' | 'adaptive' | 'selective' | 'aggressive';
  parallelizable?: boolean;
  batchProcessing?: boolean;
  expectedOutput?: string;
  processingInstructions?: string;
  validationRules?: string[];
  qualityGates?: string[];
  outputSchema?: Record<string, unknown>;
  fallbackBehavior?: string;
  confidenceThreshold?: number;
  modelConfig?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    topK?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
  };
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ProcessedFile {
  name: string;
  mimeType: string;
  content: string;
  isBase64: boolean;
  size: number;
  metadata?: Record<string, unknown>;
}

export interface Script {
  rawText: string;
  totalLines: number;
  scenes: Scene[];
  characters: Record<string, Character>;
  dialogueLines: DialogueLine[];
}

export interface Scene {
  id: string;
  heading: string;
  index: number;
  startLineNumber: number;
  endLineNumber: number;
  lines: string[];
  dialogues: DialogueLine[];
  actionLines: string[];
}

export interface Character {
  name: string;
  dialogueCount: number;
  dialogueLines: string[];
  firstSceneId: string;
}

export interface DialogueLine {
  id: string;
  character: string;
  text: string;
  lineNumber: number;
  sceneId: string;
  type: 'dialogue' | 'parenthetical';
}
