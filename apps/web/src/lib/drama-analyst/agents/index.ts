import { AIAgentConfig, TaskType, AgentConfigMapping } from "@core/types";
import { log } from "../services/loggerService";

/**
 * Agent configuration mapping
 * Maps TaskType to module path and config name
 * Reduces cyclomatic complexity from 28 to 3
 */
const AGENT_CONFIG_MAP: Partial<Record<TaskType, AgentConfigMapping>> = {
  [TaskType.ANALYSIS]: {
    path: "./analysis/agent",
    configName: "ANALYSIS_AGENT_CONFIG",
  },
  [TaskType.CREATIVE]: {
    path: "./creative/agent",
    configName: "CREATIVE_AGENT_CONFIG",
  },
  [TaskType.INTEGRATED]: {
    path: "./integrated/agent",
    configName: "INTEGRATED_AGENT_CONFIG",
  },
  [TaskType.COMPLETION]: {
    path: "./completion/agent",
    configName: "COMPLETION_AGENT_CONFIG",
  },
  [TaskType.RHYTHM_MAPPING]: {
    path: "./rhythmMapping/agent",
    configName: "RHYTHM_MAPPING_AGENT_CONFIG",
  },
  [TaskType.CHARACTER_NETWORK]: {
    path: "./characterNetwork/agent",
    configName: "CHARACTER_NETWORK_AGENT_CONFIG",
  },
  [TaskType.DIALOGUE_FORENSICS]: {
    path: "./dialogueForensics/agent",
    configName: "DIALOGUE_FORENSICS_AGENT_CONFIG",
  },
  [TaskType.THEMATIC_MINING]: {
    path: "./thematicMining/agent",
    configName: "THEMATIC_MINING_AGENT_CONFIG",
  },
  [TaskType.STYLE_FINGERPRINT]: {
    path: "./styleFingerprint/agent",
    configName: "STYLE_FINGERPRINT_AGENT_CONFIG",
  },
  [TaskType.CONFLICT_DYNAMICS]: {
    path: "./conflictDynamics/agent",
    configName: "CONFLICT_DYNAMICS_AGENT_CONFIG",
  },
  [TaskType.ADAPTIVE_REWRITING]: {
    path: "./adaptiveRewriting/agent",
    configName: "ADAPTIVE_REWRITING_AGENT_CONFIG",
  },
  [TaskType.SCENE_GENERATOR]: {
    path: "./sceneGenerator/agent",
    configName: "SCENE_GENERATOR_AGENT_CONFIG",
  },
  [TaskType.CHARACTER_VOICE]: {
    path: "./characterVoice/agent",
    configName: "CHARACTER_VOICE_AGENT_CONFIG",
  },
  [TaskType.WORLD_BUILDER]: {
    path: "./worldBuilder/agent",
    configName: "WORLD_BUILDER_AGENT_CONFIG",
  },
  [TaskType.PLOT_PREDICTOR]: {
    path: "./plotPredictor/agent",
    configName: "PLOT_PREDICTOR_AGENT_CONFIG",
  },
  [TaskType.TENSION_OPTIMIZER]: {
    path: "./tensionOptimizer/agent",
    configName: "TENSION_OPTIMIZER_AGENT_CONFIG",
  },
  [TaskType.AUDIENCE_RESONANCE]: {
    path: "./audienceResonance/agent",
    configName: "AUDIENCE_RESONANCE_AGENT_CONFIG",
  },
  [TaskType.PLATFORM_ADAPTER]: {
    path: "./platformAdapter/agent",
    configName: "PLATFORM_ADAPTER_AGENT_CONFIG",
  },
  [TaskType.CHARACTER_DEEP_ANALYZER]: {
    path: "./characterDeepAnalyzer/agent",
    configName: "CHARACTER_DEEP_ANALYZER_AGENT_CONFIG",
  },
  [TaskType.DIALOGUE_ADVANCED_ANALYZER]: {
    path: "./dialogueAdvancedAnalyzer/agent",
    configName: "DIALOGUE_ADVANCED_ANALYZER_AGENT_CONFIG",
  },
  [TaskType.VISUAL_CINEMATIC_ANALYZER]: {
    path: "./visualCinematicAnalyzer/agent",
    configName: "VISUAL_CINEMATIC_ANALYZER_AGENT_CONFIG",
  },
  [TaskType.THEMES_MESSAGES_ANALYZER]: {
    path: "./themesMessagesAnalyzer/agent",
    configName: "THEMES_MESSAGES_ANALYZER_AGENT_CONFIG",
  },
  [TaskType.CULTURAL_HISTORICAL_ANALYZER]: {
    path: "./culturalHistoricalAnalyzer/agent",
    configName: "CULTURAL_HISTORICAL_ANALYZER_AGENT_CONFIG",
  },
  [TaskType.PRODUCIBILITY_ANALYZER]: {
    path: "./producibilityAnalyzer/agent",
    configName: "PRODUCIBILITY_ANALYZER_AGENT_CONFIG",
  },
  [TaskType.TARGET_AUDIENCE_ANALYZER]: {
    path: "./targetAudienceAnalyzer/agent",
    configName: "TARGET_AUDIENCE_ANALYZER_AGENT_CONFIG",
  },
  [TaskType.LITERARY_QUALITY_ANALYZER]: {
    path: "./literaryQualityAnalyzer/agent",
    configName: "LITERARY_QUALITY_ANALYZER_AGENT_CONFIG",
  },
  [TaskType.RECOMMENDATIONS_GENERATOR]: {
    path: "./recommendationsGenerator/agent",
    configName: "RECOMMENDATIONS_GENERATOR_AGENT_CONFIG",
  },
};

/**
 * Dynamic Agent Loader
 * Reduced cyclomatic complexity from 28 to 3
 */
export const loadAgentConfig = async (
  taskType: TaskType
): Promise<AIAgentConfig> => {
  const mapping = AGENT_CONFIG_MAP[taskType];

  if (!mapping) {
    throw new Error(`Unknown task type: ${taskType}`);
  }

  const module = await import(/* @vite-ignore */ mapping.path);
  return module[mapping.configName];
};
// Static imports removed to eliminate Vite dynamic import warnings
// All agent configs are now loaded dynamically via loadAgentConfig()

// Dynamic agent configs loader
export const getAllAgentConfigs = async (): Promise<AIAgentConfig[]> => {
  const configs: AIAgentConfig[] = [];

  // Load all agent configs dynamically
  const taskTypes = Object.values(TaskType) as TaskType[];

  for (const taskType of taskTypes) {
    try {
      const config = await loadAgentConfig(taskType);
      configs.push(config);
    } catch (error) {
      log.warn(
        "Failed to load agent config",
        { taskType, error },
        "AgentConfigLoader"
      );
    }
  }

  return configs;
};

// Legacy export for backward compatibility (will be deprecated)
export const AGENT_CONFIGS = Object.freeze<AIAgentConfig[]>([]);
