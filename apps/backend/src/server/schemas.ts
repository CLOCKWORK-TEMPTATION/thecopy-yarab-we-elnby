import { z } from "zod";

export const wafIpBodySchema = z
  .object({
    ip: z.string().min(1),
    reason: z.string().optional(),
  })
  .passthrough();

export const telemetryBodySchema = z
  .object({
    event: z.string().optional(),
    payload: z.unknown().optional(),
  })
  .passthrough();

export const wafConfigUpdateSchema = z
  .object({
    enabled: z.boolean().optional(),
    mode: z.enum(["block", "monitor"]).optional(),
    logLevel: z.enum(["minimal", "standard", "verbose"]).optional(),
    rules: z.record(z.string(), z.boolean()).optional(),
    whitelist: z
      .object({
        ips: z.array(z.string()).optional(),
        paths: z.array(z.string()).optional(),
        userAgents: z.array(z.string()).optional(),
      })
      .partial()
      .optional(),
    blacklist: z
      .object({
        ips: z.array(z.string()).optional(),
        countries: z.array(z.string()).optional(),
        userAgents: z.array(z.string()).optional(),
      })
      .partial()
      .optional(),
    rateLimit: z
      .object({
        windowMs: z.number().optional(),
        maxRequests: z.number().optional(),
        blockDurationMs: z.number().optional(),
      })
      .partial()
      .optional(),
    customRules: z.array(z.unknown()).optional(),
  })
  .partial()
  .passthrough();
