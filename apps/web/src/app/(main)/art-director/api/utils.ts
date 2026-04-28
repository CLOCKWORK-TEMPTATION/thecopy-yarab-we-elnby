// API Route Utilities

import type { Request } from "express";
import type { PluginInput } from "../types";

export function getRouteParam(req: Request, paramName: string): string | null {
  const value = req.params[paramName];
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }
  return value;
}

export function getRequestBody(req: Request): Record<string, unknown> {
  const body: unknown = req.body;
  return typeof body === "object" && body !== null
    ? (body as Record<string, unknown>)
    : {};
}

export function toPluginInput(body: Record<string, unknown>): PluginInput {
  const data = body["data"];
  const options = body["options"];

  return {
    type: typeof body["type"] === "string" ? body["type"] : "",
    data:
      typeof data === "object" && data !== null
        ? (data as Record<string, unknown>)
        : {},
    options:
      typeof options === "object" && options !== null
        ? (options as Record<string, unknown>)
        : undefined,
  };
}
