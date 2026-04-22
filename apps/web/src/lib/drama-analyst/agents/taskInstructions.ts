/**
 * Task instructions and agent mappings
 */

import { TaskType } from "../enums";
import type { AgentId } from "../types";

export const agentIdToTaskTypeMap: Record<AgentId, TaskType> = {
  "character-analyst": TaskType.CHARACTER_ANALYSIS,
  "plot-analyst": TaskType.PLOT_ANALYSIS,
  "theme-analyst": TaskType.THEME_ANALYSIS,
  "dialogue-analyst": TaskType.DIALOGUE_ANALYSIS,
  "structure-analyst": TaskType.STRUCTURE_ANALYSIS,
  "character-developer": TaskType.CHARACTER_DEVELOPMENT,
  "plot-developer": TaskType.PLOT_DEVELOPMENT,
  "dialogue-enhancer": TaskType.DIALOGUE_ENHANCEMENT,
  "scene-expander": TaskType.SCENE_EXPANSION,
  "conflict-enhancer": TaskType.CONFLICT_ENHANCEMENT,
};

export const taskTypeToAgentIdMap: Record<TaskType, AgentId> = Object.entries(
  agentIdToTaskTypeMap
).reduce(
  (acc, [agentId, taskType]) => {
    acc[taskType] = agentId;
    return acc;
  },
  {} as Record<TaskType, AgentId>
);
