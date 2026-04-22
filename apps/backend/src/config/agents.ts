/**
 * Agent Configuration for Backend Services
 * Defines model parameters and settings for all AI agents
 */

/**
 * Defines the structure for a single agent's configuration.
 */
export interface AgentConfig {
  model: string;
  temperature: number;
  maxOutputTokens: number;
  topP: number;
  topK: number;
}

/**
 * Defines the structure for all agent configurations.
 */
export interface AgentsConfig {
  default: AgentConfig;
  [key: string]: AgentConfig;
}

/**
 * The agent configurations object.
 */
export const agentsConfig: AgentsConfig = {
  default: {
    model: 'gemini-2.5-flash',
    temperature: 0.7,
    maxOutputTokens: 8192,
    topP: 1,
    topK: 40,
  },
  creativeAgent: {
    model: 'gemini-2.5-flash',
    temperature: 0.9,
    maxOutputTokens: 8192,
    topP: 1,
    topK: 40,
  },
  analysisAgent: {
    model: 'gemini-2.5-flash',
    temperature: 0.5,
    maxOutputTokens: 8192,
    topP: 1,
    topK: 40,
  },
  integratedAgent: {
    model: 'gemini-2.5-flash',
    temperature: 0.7,
    maxOutputTokens: 8192,
    topP: 1,
    topK: 40,
  },
  characterAnalyzer: {
    model: 'gemini-2.5-flash',
    temperature: 0.6,
    maxOutputTokens: 8192,
    topP: 1,
    topK: 40,
  },
  dialogueAnalyzer: {
    model: 'gemini-2.5-flash',
    temperature: 0.6,
    maxOutputTokens: 8192,
    topP: 1,
    topK: 40,
  },
  worldBuilder: {
    model: 'gemini-2.5-flash',
    temperature: 0.8,
    maxOutputTokens: 8192,
    topP: 1,
    topK: 40,
  },
};

/**
 * Get configuration for a specific agent
 */
export function getAgentConfig(agentId: string): AgentConfig {
  return agentsConfig[agentId] || agentsConfig.default;
}
