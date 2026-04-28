/**
 * Upgraded Agents Export
 * جميع الوكلاء المحدّثة بالنمط القياسي
 * RAG → Self-Critique → Constitutional → Uncertainty → Hallucination → Debate
 * إخراج نصي فقط - لا JSON
 */

import { TaskType } from "@core/types";

import { log } from "../services/loggerService";

import { AdaptiveRewritingAgent } from "./adaptiveRewriting/AdaptiveRewritingAgent";
import { AnalysisAgent } from "./analysis/AnalysisAgent";
import { AudienceResonanceAgent } from "./audienceResonance/AudienceResonanceAgent";
import { CharacterDeepAnalyzerAgent } from "./characterDeepAnalyzer/CharacterDeepAnalyzerAgent";
import { CharacterNetworkAgent } from "./characterNetwork/CharacterNetworkAgent";
import { CharacterVoiceAgent } from "./characterVoice/CharacterVoiceAgent";
import { CompletionAgent } from "./completion/CompletionAgent";
import { ConflictDynamicsAgent } from "./conflictDynamics/ConflictDynamicsAgent";
import { CreativeAgent } from "./creative/CreativeAgent";
import { CulturalHistoricalAnalyzerAgent } from "./culturalHistoricalAnalyzer/CulturalHistoricalAnalyzerAgent";
import { DialogueAdvancedAnalyzerAgent } from "./dialogueAdvancedAnalyzer/DialogueAdvancedAnalyzerAgent";
import { DialogueForensicsAgent } from "./dialogueForensics/DialogueForensicsAgent";
import { IntegratedAgent } from "./integrated/IntegratedAgent";
import { LiteraryQualityAnalyzerAgent } from "./literaryQualityAnalyzer/LiteraryQualityAnalyzerAgent";
import { PlatformAdapterAgent } from "./platformAdapter/PlatformAdapterAgent";
import { PlotPredictorAgent } from "./plotPredictor/PlotPredictorAgent";
import { ProducibilityAnalyzerAgent } from "./producibilityAnalyzer/ProducibilityAnalyzerAgent";
import { RecommendationsGeneratorAgent } from "./recommendationsGenerator/RecommendationsGeneratorAgent";
import { RhythmMappingAgent } from "./rhythmMapping/RhythmMappingAgent";
import { SceneGeneratorAgent } from "./sceneGenerator/SceneGeneratorAgent";
import { BaseAgent } from "./shared/BaseAgent";
import {
  StandardAgentInput,
  StandardAgentOutput,
} from "./shared/standardAgentPattern";
import { StyleFingerprintAgent } from "./styleFingerprint/StyleFingerprintAgent";
import { TargetAudienceAnalyzerAgent } from "./targetAudienceAnalyzer/TargetAudienceAnalyzerAgent";
import { TensionOptimizerAgent } from "./tensionOptimizer/TensionOptimizerAgent";
import { ThematicMiningAgent } from "./thematicMining/ThematicMiningAgent";
import { ThemesMessagesAnalyzerAgent } from "./themesMessagesAnalyzer/ThemesMessagesAnalyzerAgent";
import { VisualCinematicAnalyzerAgent } from "./visualCinematicAnalyzer/VisualCinematicAnalyzerAgent";
import { WorldBuilderAgent } from "./worldBuilder/WorldBuilderAgent";

// Agent instances (singleton pattern)
export const completionAgent = new CompletionAgent();
export const creativeAgent = new CreativeAgent();
export const characterVoiceAgent = new CharacterVoiceAgent();
export const sceneGeneratorAgent = new SceneGeneratorAgent();
export const styleFingerprintAgent = new StyleFingerprintAgent();
export const thematicMiningAgent = new ThematicMiningAgent();
export const conflictDynamicsAgent = new ConflictDynamicsAgent();
export const dialogueForensicsAgent = new DialogueForensicsAgent();
export const characterNetworkAgent = new CharacterNetworkAgent();
export const adaptiveRewritingAgent = new AdaptiveRewritingAgent();
export const tensionOptimizerAgent = new TensionOptimizerAgent();
export const rhythmMappingAgent = new RhythmMappingAgent();
export const plotPredictorAgent = new PlotPredictorAgent();
export const worldBuilderAgent = new WorldBuilderAgent();
export const analysisAgent = new AnalysisAgent();
export const integratedAgent = new IntegratedAgent();

// المجموعة الأولى - الوكلاء السبعة الجديدة
export const platformAdapterAgent = new PlatformAdapterAgent();
export const characterDeepAnalyzerAgent = new CharacterDeepAnalyzerAgent();
export const dialogueAdvancedAnalyzerAgent =
  new DialogueAdvancedAnalyzerAgent();
export const themesMessagesAnalyzerAgent = new ThemesMessagesAnalyzerAgent();
export const culturalHistoricalAnalyzerAgent =
  new CulturalHistoricalAnalyzerAgent();
export const visualCinematicAnalyzerAgent = new VisualCinematicAnalyzerAgent();
export const producibilityAnalyzerAgent = new ProducibilityAnalyzerAgent();

// الوكلاء الأربعة المتبقية
export const audienceResonanceAgent = new AudienceResonanceAgent();
export const targetAudienceAnalyzerAgent = new TargetAudienceAnalyzerAgent();
export const literaryQualityAnalyzerAgent = new LiteraryQualityAnalyzerAgent();
export const recommendationsGeneratorAgent =
  new RecommendationsGeneratorAgent();

/**
 * Agent registry - maps task types to agent instances
 */
export const UPGRADED_AGENTS = new Map<TaskType, BaseAgent>([
  // الوكلاء الأساسية الأصلية (16 وكيل)
  [TaskType.COMPLETION, completionAgent],
  [TaskType.CREATIVE, creativeAgent],
  [TaskType.CHARACTER_VOICE, characterVoiceAgent],
  [TaskType.SCENE_GENERATOR, sceneGeneratorAgent],
  [TaskType.STYLE_FINGERPRINT, styleFingerprintAgent],
  [TaskType.THEMATIC_MINING, thematicMiningAgent],
  [TaskType.CONFLICT_DYNAMICS, conflictDynamicsAgent],
  [TaskType.DIALOGUE_FORENSICS, dialogueForensicsAgent],
  [TaskType.CHARACTER_NETWORK, characterNetworkAgent],
  [TaskType.ADAPTIVE_REWRITING, adaptiveRewritingAgent],
  [TaskType.TENSION_OPTIMIZER, tensionOptimizerAgent],
  [TaskType.RHYTHM_MAPPING, rhythmMappingAgent],
  [TaskType.PLOT_PREDICTOR, plotPredictorAgent],
  [TaskType.WORLD_BUILDER, worldBuilderAgent],
  [TaskType.ANALYSIS, analysisAgent],
  [TaskType.INTEGRATED, integratedAgent],

  // الوكلاء السبعة الجديدة (المجموعة الأولى)
  [TaskType.PLATFORM_ADAPTER, platformAdapterAgent],
  [TaskType.CHARACTER_DEEP_ANALYZER, characterDeepAnalyzerAgent],
  [TaskType.DIALOGUE_ADVANCED_ANALYZER, dialogueAdvancedAnalyzerAgent],
  [TaskType.THEMES_MESSAGES_ANALYZER, themesMessagesAnalyzerAgent],
  [TaskType.CULTURAL_HISTORICAL_ANALYZER, culturalHistoricalAnalyzerAgent],
  [TaskType.VISUAL_CINEMATIC_ANALYZER, visualCinematicAnalyzerAgent],
  [TaskType.PRODUCIBILITY_ANALYZER, producibilityAnalyzerAgent],

  // الوكلاء الأربعة المتبقية (مرقّاة سابقاً)
  [TaskType.AUDIENCE_RESONANCE, audienceResonanceAgent],
  [TaskType.TARGET_AUDIENCE_ANALYZER, targetAudienceAnalyzerAgent],
  [TaskType.LITERARY_QUALITY_ANALYZER, literaryQualityAnalyzerAgent],
  [TaskType.RECOMMENDATIONS_GENERATOR, recommendationsGeneratorAgent],
]);

/**
 * Execute agent task with standard pattern
 * @param taskType - Type of task to execute
 * @param input - Standard agent input
 * @returns Standard agent output (text only)
 */
export async function executeAgentTask(
  taskType: TaskType,
  input: StandardAgentInput
): Promise<StandardAgentOutput> {
  const agent = UPGRADED_AGENTS.get(taskType);

  if (!agent) {
    // Fallback for agents not yet upgraded
    log.warn(
      "Agent not yet upgraded, using fallback",
      { taskType },
      "UpgradedAgents"
    );
    return {
      text: `الوكيل ${taskType} لم يتم ترقيته بعد. يرجى المحاولة لاحقاً.`,
      confidence: 0.0,
      notes: ["الوكيل غير متاح"],
      metadata: {
        processingTime: 0,
        tokensUsed: 0,
        modelUsed: "none",
        timestamp: new Date().toISOString(),
      },
    };
  }

  try {
    // Execute with standard pattern
    return await agent.executeTask(input);
  } catch (error) {
    log.error(
      "Error executing agent task",
      { taskType, error },
      "UpgradedAgents"
    );
    return {
      text: `حدث خطأ أثناء تنفيذ المهمة. يرجى المحاولة مرة أخرى.`,
      confidence: 0.0,
      notes: [error instanceof Error ? error.message : "خطأ غير معروف"],
      metadata: {
        processingTime: 0,
        tokensUsed: 0,
        modelUsed: "none",
        timestamp: new Date().toISOString(),
        error: true,
      },
    };
  }
}

/**
 * Get agent configuration
 */
export function getAgentConfig(taskType: TaskType) {
  const agent = UPGRADED_AGENTS.get(taskType);
  return agent?.getConfig() ?? null;
}

/**
 * Check if agent is upgraded
 */
export function isAgentUpgraded(taskType: TaskType): boolean {
  return UPGRADED_AGENTS.has(taskType);
}

/**
 * Get list of upgraded agents
 */
export function getUpgradedAgents(): TaskType[] {
  return Array.from(UPGRADED_AGENTS.keys());
}

/**
 * Create agents for remaining task types (to be implemented)
 * These will be created as they are upgraded
 */
export const AGENTS_TO_UPGRADE: TaskType[] = [
  // جميع الوكلاء تم ترقيتها! 🎉
  // Total: 27 وكيل مرقّى بالنمط القياسي
];

/**
 * Batch execute multiple agent tasks
 */
export async function batchExecuteAgentTasks(
  tasks: { taskType: TaskType; input: StandardAgentInput }[]
): Promise<StandardAgentOutput[]> {
  const results = await Promise.allSettled(
    tasks.map(({ taskType, input }) => executeAgentTask(taskType, input))
  );

  return results.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    } else {
      const task = tasks[index];
      const taskType = task?.taskType ?? "unknown";
      const reason = result.reason as unknown;
      const reasonMessage =
        reason instanceof Error ? reason.message : "خطأ غير معروف";
      return {
        text: `فشل تنفيذ المهمة ${taskType}`,
        confidence: 0.0,
        notes: [reasonMessage],
        metadata: {
          processingTime: 0,
          tokensUsed: 0,
          modelUsed: "none",
          timestamp: new Date().toISOString(),
          error: true,
        },
      };
    }
  });
}

/**
 * Get agent statistics
 */
export function getAgentStatistics() {
  const total = 27; // إجمالي الوكلاء (16 أساسية + 7 جديدة + 4 متبقية)
  const upgraded = UPGRADED_AGENTS.size;
  const remaining = AGENTS_TO_UPGRADE.length;

  return {
    total,
    upgraded,
    remaining,
    percentage: Math.round((upgraded / total) * 100),
    upgradedAgents: getUpgradedAgents(),
    remainingAgents: AGENTS_TO_UPGRADE,
  };
}
