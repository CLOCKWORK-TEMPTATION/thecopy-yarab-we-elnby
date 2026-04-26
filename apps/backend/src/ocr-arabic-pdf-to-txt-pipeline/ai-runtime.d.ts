import type { MCPTransport } from "@ai-sdk/mcp";

export type ToolSet = Record<
  string,
  {
    description?: string;
    inputSchema?: unknown;
    execute?: unknown;
  }
>;

export interface StepFinishEvent {
  text?: string;
  toolCalls?: ({
      toolName: string;
      input?: unknown;
      args?: unknown;
    } & Record<string, unknown>)[];
}

export interface OcrAgentGenerateResult {
  text?: string;
  usage?: unknown;
  steps?: unknown[];
}

export interface OcrAgent {
  generate(input: { prompt: string }): Promise<OcrAgentGenerateResult>;
}

export interface ToolLoopAgentSettings {
  model: unknown;
  instructions: string;
  tools: ToolSet;
  stopWhen: unknown;
  onStepFinish?: (event: StepFinishEvent) => void;
}

export type ToolLoopAgentConstructor = new (settings: ToolLoopAgentSettings) => OcrAgent;

export type StdioClientTransportConstructor = new (options: {
    command: string;
    args?: string[];
    env?: NodeJS.ProcessEnv;
  }) => MCPTransport;

export const StdioClientTransport: StdioClientTransportConstructor;
export const ToolLoopAgent: ToolLoopAgentConstructor;
export const stepCountIs: (stepCount: number) => unknown;
