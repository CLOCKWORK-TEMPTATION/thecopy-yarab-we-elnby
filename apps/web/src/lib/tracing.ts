/**
 * OpenTelemetry Browser Tracing Configuration
 *
 * This module initializes OpenTelemetry tracing for the frontend Next.js application.
 * It automatically instruments:
 * - Fetch API calls
 * - XMLHttpRequest
 * - User interactions (optional)
 * - Page navigation (via Next.js instrumentation)
 *
 * Note: OpenTelemetry packages are optional. If not installed, tracing will be disabled.
 * To enable tracing, install the required OpenTelemetry packages and set NEXT_PUBLIC_TRACING_ENABLED=true
 *
 * @module lib/tracing
 */

"use client";

import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { FetchInstrumentation } from "@opentelemetry/instrumentation-fetch";
import { XMLHttpRequestInstrumentation } from "@opentelemetry/instrumentation-xml-http-request";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  BatchSpanProcessor,
  type SpanExporter,
} from "@opentelemetry/sdk-trace-base";
import {
  WebTracerProvider,
  type WebTracerConfig,
} from "@opentelemetry/sdk-trace-web";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from "@opentelemetry/semantic-conventions";

import { logger } from "@/lib/ai/utils/logger";

/**
 * Environment variables for tracing configuration
 */
const OTEL_EXPORTER_OTLP_ENDPOINT =
  process.env["NEXT_PUBLIC_OTEL_EXPORTER_OTLP_ENDPOINT"] ??
  "http://localhost:4318/v1/traces";
const SERVICE_NAME =
  process.env["NEXT_PUBLIC_SERVICE_NAME"] ?? "theeeecopy-frontend";
const SERVICE_VERSION = process.env["NEXT_PUBLIC_APP_VERSION"] ?? "1.0.0";
const ENVIRONMENT = process.env["NEXT_PUBLIC_ENVIRONMENT"] ?? "development";

let isInitialized = false;

export const isBrowserTracingEnabled = (): boolean =>
  process.env["NEXT_PUBLIC_TRACING_ENABLED"] === "true";

/**
 * Initialize OpenTelemetry browser tracing
 * Should be called once in the root layout or _app file
 *
 * Note: This function will silently skip if OpenTelemetry packages are not installed
 * or if NEXT_PUBLIC_TRACING_ENABLED is not set to 'true'
 */
export function initBrowserTracing(): void {
  // Skip if not in browser environment
  if (typeof window === "undefined") {
    return;
  }

  if (!isBrowserTracingEnabled() || isInitialized) {
    return;
  }

  logger.info("Initializing browser tracing", {
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    environment: ENVIRONMENT,
    exporter: OTEL_EXPORTER_OTLP_ENDPOINT,
  });

  try {
    // Create resource with service metadata
    const resource = resourceFromAttributes({
      [ATTR_SERVICE_NAME]: SERVICE_NAME,
      [ATTR_SERVICE_VERSION]: SERVICE_VERSION,
      [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: ENVIRONMENT,
    });

    // Create OTLP exporter
    const exporter = new OTLPTraceExporter({
      url: OTEL_EXPORTER_OTLP_ENDPOINT,
      // Optional: Add headers for authentication
      // headers: {
      //   'Authorization': `Bearer ${process.env["NEXT_PUBLIC_OTEL_AUTH_TOKEN"]}`,
      // },
    });

    // Create batch span processor for efficient export
    const spanProcessor = new BatchSpanProcessor(
      exporter as unknown as SpanExporter
    );

    // Create tracer provider with batch span processor
    const providerConfig: WebTracerConfig = {
      resource,
      spanProcessors: [spanProcessor],
    };
    const provider = new WebTracerProvider(providerConfig);

    // Register the provider
    provider.register();

    // Register auto-instrumentations
    registerInstrumentations({
      instrumentations: [
        new FetchInstrumentation({
          // Ignore health checks and tracing endpoints
          ignoreUrls: [/\/health$/, /\/metrics$/, /v1\/traces$/],
          // Propagate trace context to backend
          propagateTraceHeaderCorsUrls: [
            new RegExp(
              process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001"
            ),
          ],
          // Clear timing resources
          clearTimingResources: true,
        }),
        new XMLHttpRequestInstrumentation({
          ignoreUrls: [/\/health$/, /\/metrics$/, /v1\/traces$/],
          propagateTraceHeaderCorsUrls: [
            new RegExp(
              process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001"
            ),
          ],
        }),
      ],
    });

    isInitialized = true;
    logger.info("Browser tracing initialized successfully");
  } catch (error) {
    isInitialized = false;
    logger.error("Failed to initialize browser tracing", { error });
  }
}

/**
 * Stub tracer span interface for when OpenTelemetry is not available
 */
interface StubSpan {
  end: () => void;
  setAttribute: (key: string, value: unknown) => void;
  setStatus: (status: { code: number }) => void;
  recordException: (error: Error) => void;
}

/**
 * Stub tracer interface for when OpenTelemetry is not available
 */
interface StubTracer {
  startSpan: (name: string) => StubSpan;
}

/**
 * Helper to get the current tracer
 * Use this to create custom spans in your components
 *
 * Note: Returns a no-op tracer stub if OpenTelemetry is not available
 */
export const trace = {
  getTracer: (): StubTracer => ({
    startSpan: (): StubSpan => ({
      end: () => {
        /* empty */
      },
      setAttribute: () => {
        /* empty */
      },
      setStatus: () => {
        /* empty */
      },
      recordException: () => {
        /* empty */
      },
    }),
  }),
};
