import { AGENT_CONFIGS } from "@agents/index";
import { TaskType } from "@core/enums";
import { AIAgentConfig } from "@core/types";

function toKnownTaskType(value: unknown): TaskType | null {
  return typeof value === "string" &&
    Object.values(TaskType).includes(value as TaskType)
    ? (value as TaskType)
    : null;
}

const agentRegistry = new Map<TaskType, AIAgentConfig>(
  AGENT_CONFIGS.flatMap(
    (config: AIAgentConfig): [TaskType, AIAgentConfig][] => {
      const taskType = toKnownTaskType(config.id);
      return taskType ? [[taskType, config]] : [];
    }
  )
);

export const getAgentConfig = (task: unknown): AIAgentConfig | undefined => {
  const taskType = toKnownTaskType(task);
  return taskType ? agentRegistry.get(taskType) : undefined;
};

export const listAgentConfigs = (): readonly AIAgentConfig[] => AGENT_CONFIGS;
