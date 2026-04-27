import { Request } from "express";
import { PluginInput } from "../types";

/**
 * Safely extracts a route parameter from the request.
 * Returns null if the parameter is missing, not a string, or empty.
 */
export function getRouteParam(req: Request, paramName: string): string | null {
    const value = req.params[paramName];

    if (typeof value !== "string" || value.trim().length === 0) {
        return null;
    }

    return value;
}

/**
 * Safely extracts the request body.
 * Returns an empty object if the body is not an object.
 */
export function getRequestBody(req: Request): Record<string, unknown> {
    const body: unknown = req.body;
    return typeof body === "object" && body !== null
        ? (body as Record<string, unknown>)
        : {};
}

/**
 * Converts a request body to a PluginInput with validation.
 */
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