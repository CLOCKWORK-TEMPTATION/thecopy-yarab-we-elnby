// واجهات أساسية مطلوبة من عدة وحدات
export interface Result<T, E = Error> {
  ok: boolean;
  value?: T;
  error?:
    | E
    | {
        code: string;
        message: string;
        cause?: any;
      };
}

export interface AIRequest {
  agent: string;
  prompt: string;
  files?: { fileName: string; sizeBytes: number }[];
  params?: any;
  parameters?: any;
}

export interface AIResponse {
  text?: string;
  tokensUsed?: number;
  meta?: Record<string, unknown>;
  raw?: string;
  parsed?: any;
  agent?: string;
}

export interface ProcessedFile {
  fileName: string;
  content: string;
  sizeBytes: number;
  mimeType?: string;
  textContent?: string;
  size?: number;
  name?: string;
}

export interface AIAgentCapabilities {
  // حقول مستخدمة بالفعل في الكود
  reasoningChains?: boolean;
  ragEnabled?: boolean;
  agentOrchestration?: boolean;
  metacognitive?: boolean;
  multiModal?: boolean;
  complexityScore?: number;
  accuracyLevel?: number;
  processingSpeed?: number | string;
  resourceIntensity?: number | string;
  memorySystem?: boolean;
  toolUse?: boolean;
  vectorSearch?: boolean;
  adaptiveLearning?: boolean;
  contextWindow?: number;
  responseLatency?: number;
  scalability?: number;
  reliability?: number;
  canAnalyze?: boolean;
  canGenerate?: boolean;
  canTransform?: boolean;
  canPredict?: boolean;
  requiresContext?: boolean;
  requiresFiles?: boolean;
  selfReflection?: boolean;
  languageModeling?: boolean;
  patternRecognition?: boolean;
  contextualUnderstanding?: boolean;
  creativeSynthesis?: boolean;
  logicalInference?: boolean;
  emotionalIntelligence?: boolean;
  culturalAwareness?: boolean;
  temporalReasoning?: boolean;
  spatialReasoning?: boolean;
  narrativeConstruction?: boolean;
  characterPsychology?: boolean;
  dialogueGeneration?: boolean;
  sceneComposition?: boolean;
  thematicAnalysis?: boolean;
  structuralAnalysis?: boolean;
  styleAdaptation?: boolean;
  audienceModeling?: boolean;
  feedbackIntegration?: boolean;
  iterativeRefinement?: boolean;
  crossDomainKnowledge?: boolean;
  ethicalConsideration?: boolean;
  creativeGeneration?: boolean;
  analyticalReasoning?: boolean;
  outputType?: string;
  [key: string]: any;
}

export type CacheStrategy = "none" | "memory" | "disk";

export interface AIAgentConfig {
  id: string;
  name?: string;
  description?: string;
  type?: string;
  category?: string;
  capabilities?: AIAgentCapabilities;
  dependencies?: string[];
  collaborators?: string[];
  enhancedBy?: string[];
  dependsOn?: string[];
  collaboratesWith?: string[];
  enhances?: string[];
  parallelizable?: boolean;
  cacheStrategy?: CacheStrategy | string;
  confidenceThreshold?: number;
  prompt?: string;
  systemInstruction?: string;
  systemPrompt?: string;
  fewShotExamples?: any[];
  chainOfThoughtTemplate?: string;
  temperature?: number;
  maxTokens?: number;
  [key: string]: any;
}

// ============================================
// ===== أنواع جديدة للترقية - 2025 =====
// ============================================

/**
 * نوع المدخل الذي يقدمه المستخدم
 * User Input Type Classification
 */
export enum InputType {
  DRAMATIC_IDEA = "dramatic_idea", // فكرة درامية
  FILM_TREATMENT = "film_treatment", // معالجة درامية لفيلم
  FULL_SCREENPLAY = "full_screenplay", // سيناريو فيلم كامل
  PARTIAL_SCREENPLAY = "partial_screenplay", // جزء من سيناريو
  SERIES_TREATMENT = "series_treatment", // معالجة درامية لمسلسل
  SERIES_EPISODES = "series_episodes", // حلقة أو مجموعة حلقات
}

/**
 * قياس عدم اليقين
 * Uncertainty Quantification Metrics
 */
export interface UncertaintyMetrics {
  confidence: number; // 0-1: مستوى الثقة
  needsReview: boolean; // هل يحتاج مراجعة بشرية؟
  uncertainAspects: string[]; // الجوانب غير المؤكدة
  method: "monte_carlo" | "ensemble" | "bayesian";
}

/**
 * نتيجة النقد الذاتي
 * Self-Critique Result
 */
export interface SelfCritiqueResult {
  originalOutput: string;
  critiques: string[];
  refinedOutput: string;
  improvementScore: number; // 0-1
  iterations: number;
}

/**
 * نتيجة نقاش متعدد الوكلاء
 * Multi-Agent Debate Result
 */
export interface DebateResult {
  proposals: AgentProposal[];
  finalDecision: string;
  consensus: boolean;
  debateRounds: number;
  judgeReasoning: string;
}

export interface AgentProposal {
  agentId: string;
  proposal: string;
  supportingEvidence: string[];
  confidence: number;
}

/**
 * نتيجة الاسترجاع المعزز (RAG)
 * Retrieval-Augmented Generation Context
 */
export interface RAGContext {
  retrievedChunks: RetrievedChunk[];
  sourceText: string;
  analysisReport: any;
  relevanceScores: number[];
}

export interface RetrievedChunk {
  content: string;
  source: "original_text" | "analysis_report";
  relevanceScore: number;
  location: string;
}

/**
 * قواعد الذكاء الدستوري
 * Constitutional AI Rules
 */
export interface ConstitutionalRule {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  critiquePrompt: string;
  revisionPrompt: string;
  priority: number;
}

/**
 * نتيجة كشف الهلوسات
 * Hallucination Detection Result
 */
export interface HallucinationDetection {
  isHallucinated: boolean;
  hallucinatedParts: string[];
  factCheckResults: FactCheck[];
  correctedOutput: string;
}

export interface FactCheck {
  claim: string;
  isSupported: boolean;
  sources: string[];
  confidence: number;
}

/**
 * الرسم البياني السببي للحبكة
 * Causal Plot Graph
 */
export interface CausalPlotGraph {
  nodes: PlotNode[];
  edges: PlotEdge[];
  timeline: string[];
  causality: CausalRelation[];
}

export interface PlotNode {
  id: string;
  event: string;
  timestamp: number;
  importance: number;
}

export interface PlotEdge {
  from: string;
  to: string;
  causationType: "direct" | "indirect" | "consequence";
  strength: number;
}

export interface CausalRelation {
  cause: string;
  effect: string;
  explanation: string;
}

/**
 * مخرجات محسّنة للوكيل
 * Enhanced Agent Output
 */
export interface EnhancedAgentOutput {
  agentId: string;
  rawOutput: string;
  selfCritique?: SelfCritiqueResult;
  uncertaintyMetrics?: UncertaintyMetrics;
  hallucinationCheck?: HallucinationDetection;
  constitutionalValidation: boolean;
  finalOutput: string;
  metadata: OutputMetadata;
}

export interface OutputMetadata {
  timestamp: string;
  processingTime: number;
  tokensUsed: number;
  model: string;
  qualityScore: number;
}

/**
 * معلومات إضافية عن المدخل
 * Input Metadata
 */
export interface InputMetadata {
  genre: string;
  estimatedLength: string;
  mainCharacters: string[];
  setting: string;
  mainTheme: string;
}
