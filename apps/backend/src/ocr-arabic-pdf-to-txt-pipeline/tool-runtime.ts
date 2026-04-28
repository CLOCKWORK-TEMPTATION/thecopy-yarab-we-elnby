export interface AgentTool {
  description: string;
  inputSchema: unknown;
  execute: unknown;
}

export type ToolResult = string | Promise<string>;

export interface LocalTool<Input extends object> {
  description: string;
  inputSchema: unknown;
  execute: (input: Input) => ToolResult;
}

export function defineTool<Input extends object>(
  definition: LocalTool<Input>,
): AgentTool & LocalTool<Input> {
  return definition;
}
