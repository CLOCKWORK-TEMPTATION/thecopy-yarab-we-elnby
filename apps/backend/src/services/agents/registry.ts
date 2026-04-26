/**
 * Agent Registry - Backend
 * Central registry for all drama analyst agents
 * 
 * جميع الـ 27 وكيل مُسجّلة هنا
 */


import { adaptiveRewritingAgent } from './adaptiveRewriting/AdaptiveRewritingAgent';
import { analysisAgent } from './analysis/AnalysisAgent';
import { audienceResonanceAgent } from './audienceResonance/AudienceResonanceAgent';
import { characterDeepAnalyzerAgent } from './characterDeepAnalyzer/CharacterDeepAnalyzerAgent';
import { characterNetworkAgent } from './characterNetwork/CharacterNetworkAgent';
import { characterVoiceAgent } from './characterVoice/CharacterVoiceAgent';
import { completionAgent } from './completion/CompletionAgent';
import { conflictDynamicsAgent } from './conflictDynamics/ConflictDynamicsAgent';
import { TaskType } from './core/enums';
import { creativeAgent } from './creative/CreativeAgent';
import { culturalHistoricalAnalyzerAgent } from './culturalHistoricalAnalyzer/CulturalHistoricalAnalyzerAgent';
import { dialogueAdvancedAnalyzerAgent } from './dialogueAdvancedAnalyzer/DialogueAdvancedAnalyzerAgent';
import { dialogueForensicsAgent } from './dialogueForensics/DialogueForensicsAgent';
import { integratedAgent } from './integrated/IntegratedAgent';
import { literaryQualityAnalyzerAgent } from './literaryQualityAnalyzer/LiteraryQualityAnalyzerAgent';
import { platformAdapterAgent } from './platformAdapter/PlatformAdapterAgent';
import { plotPredictorAgent } from './plotPredictor/PlotPredictorAgent';
import { producibilityAnalyzerAgent } from './producibilityAnalyzer/ProducibilityAnalyzerAgent';
import { recommendationsGeneratorAgent } from './recommendationsGenerator/RecommendationsGeneratorAgent';
import { rhythmMappingAgent } from './rhythmMapping/RhythmMappingAgent';
import { sceneGeneratorAgent } from './sceneGenerator/SceneGeneratorAgent';
import { BaseAgent } from './shared/BaseAgent';
import { styleFingerprintAgent } from './styleFingerprint/StyleFingerprintAgent';
import { targetAudienceAnalyzerAgent } from './targetAudienceAnalyzer/TargetAudienceAnalyzerAgent';
import { tensionOptimizerAgent } from './tensionOptimizer/TensionOptimizerAgent';
import { thematicMiningAgent } from './thematicMining/ThematicMiningAgent';
import { themesMessagesAnalyzerAgent } from './themesMessagesAnalyzer/ThemesMessagesAnalyzerAgent';
import { visualCinematicAnalyzerAgent } from './visualCinematicAnalyzer/VisualCinematicAnalyzerAgent';
import { worldBuilderAgent } from './worldBuilder/WorldBuilderAgent';

/**
 * Agent Registry Map
 * Maps TaskType to Agent Instance
 */
export class AgentRegistry {
  private static instance: AgentRegistry;
  private agents = new Map<TaskType, BaseAgent>();

  private constructor() {
    this.registerAgents();
  }

  public static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  /**
   * Register all available agents (27 total)
   */
  private registerAgents(): void {
    // ===== Core Agents (4) =====
    this.agents.set(TaskType.ANALYSIS, analysisAgent);
    this.agents.set(TaskType.CREATIVE, creativeAgent);
    this.agents.set(TaskType.INTEGRATED, integratedAgent);
    this.agents.set(TaskType.COMPLETION, completionAgent);

    // ===== Analysis Agents (6) =====
    this.agents.set(TaskType.RHYTHM_MAPPING, rhythmMappingAgent);
    this.agents.set(TaskType.CHARACTER_NETWORK, characterNetworkAgent);
    this.agents.set(TaskType.DIALOGUE_FORENSICS, dialogueForensicsAgent);
    this.agents.set(TaskType.THEMATIC_MINING, thematicMiningAgent);
    this.agents.set(TaskType.STYLE_FINGERPRINT, styleFingerprintAgent);
    this.agents.set(TaskType.CONFLICT_DYNAMICS, conflictDynamicsAgent);

    // ===== Creative Agents (4) =====
    this.agents.set(TaskType.ADAPTIVE_REWRITING, adaptiveRewritingAgent);
    this.agents.set(TaskType.SCENE_GENERATOR, sceneGeneratorAgent);
    this.agents.set(TaskType.CHARACTER_VOICE, characterVoiceAgent);
    this.agents.set(TaskType.WORLD_BUILDER, worldBuilderAgent);

    // ===== Predictive Agents (4) =====
    this.agents.set(TaskType.PLOT_PREDICTOR, plotPredictorAgent);
    this.agents.set(TaskType.TENSION_OPTIMIZER, tensionOptimizerAgent);
    this.agents.set(TaskType.AUDIENCE_RESONANCE, audienceResonanceAgent);
    this.agents.set(TaskType.PLATFORM_ADAPTER, platformAdapterAgent);

    // ===== Advanced Modules (9) =====
    this.agents.set(TaskType.CHARACTER_DEEP_ANALYZER, characterDeepAnalyzerAgent);
    this.agents.set(TaskType.DIALOGUE_ADVANCED_ANALYZER, dialogueAdvancedAnalyzerAgent);
    this.agents.set(TaskType.VISUAL_CINEMATIC_ANALYZER, visualCinematicAnalyzerAgent);
    this.agents.set(TaskType.THEMES_MESSAGES_ANALYZER, themesMessagesAnalyzerAgent);
    this.agents.set(TaskType.CULTURAL_HISTORICAL_ANALYZER, culturalHistoricalAnalyzerAgent);
    this.agents.set(TaskType.PRODUCIBILITY_ANALYZER, producibilityAnalyzerAgent);
    this.agents.set(TaskType.TARGET_AUDIENCE_ANALYZER, targetAudienceAnalyzerAgent);
    this.agents.set(TaskType.LITERARY_QUALITY_ANALYZER, literaryQualityAnalyzerAgent);
    this.agents.set(TaskType.RECOMMENDATIONS_GENERATOR, recommendationsGeneratorAgent);
  }

  /**
   * Get agent by task type
   */
  public getAgent(taskType: TaskType): BaseAgent | undefined {
    return this.agents.get(taskType);
  }

  /**
   * Get all registered agents
   */
  public getAllAgents(): Map<TaskType, BaseAgent> {
    return new Map(this.agents);
  }

  /**
   * Check if agent exists for task type
   */
  public hasAgent(taskType: TaskType): boolean {
    return this.agents.has(taskType);
  }

  /**
   * Get available task types
   */
  public getAvailableTaskTypes(): TaskType[] {
    return Array.from(this.agents.keys());
  }

  /**
   * Get agent count
   */
  public getAgentCount(): number {
    return this.agents.size;
  }
}

/**
 * Singleton instance export
 */
export const agentRegistry = AgentRegistry.getInstance();
