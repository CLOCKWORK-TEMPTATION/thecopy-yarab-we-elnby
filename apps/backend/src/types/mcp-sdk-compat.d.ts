import type { JSONRPCMessage, MCPTransport } from "@ai-sdk/mcp";

declare module "@modelcontextprotocol/sdk/client/stdio" {
  export interface StdioClientTransportOptions {
    command: string;
    args?: string[];
    env?: Record<string, string | undefined>;
  }

  export class StdioClientTransport implements MCPTransport {
    constructor(options: StdioClientTransportOptions);
    start(): Promise<void>;
    send(message: JSONRPCMessage): Promise<void>;
    close(): Promise<void>;
    onclose?: () => void;
    onerror?: (error: Error) => void;
    onmessage?: (message: JSONRPCMessage) => void;
  }
}

declare module "@modelcontextprotocol/sdk/server" {
  export interface ServerInfo {
    name: string;
    version: string;
  }

  export interface ServerCapabilities {
    capabilities: Record<string, unknown>;
  }

  export type RequestHandler = (
    request: { params: { name: string; arguments?: unknown } },
    extra: unknown,
  ) => unknown;

  export class Server {
    constructor(info: ServerInfo, capabilities: ServerCapabilities);
    setRequestHandler(schema: unknown, handler: RequestHandler): void;
    connect(transport: unknown): Promise<void>;
  }
}

declare module "@modelcontextprotocol/sdk/server/stdio" {
  export class StdioServerTransport {}
}

declare module "@modelcontextprotocol/sdk/types" {
  export const CallToolRequestSchema: unknown;
  export const ListToolsRequestSchema: unknown;

  export enum ErrorCode {
    MethodNotFound = -32601,
    InvalidParams = -32602,
  }

  export class McpError extends Error {
    constructor(code: ErrorCode, message: string);
    code: ErrorCode;
  }
}
