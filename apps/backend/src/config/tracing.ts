/**
 * OpenTelemetry Distributed Tracing Configuration
 *
 * This module intentionally avoids loading OpenTelemetry packages unless
 * tracing is explicitly enabled. Importing the SDK and auto-instrumentations
 * eagerly was adding more than a minute to backend cold start even when
 * tracing was disabled.
 */

import { logger } from '@/lib/logger';

import type { NodeSDK } from '@opentelemetry/sdk-node';

const TRACING_ENABLED = process.env['TRACING_ENABLED'] === 'true';
const OTEL_EXPORTER_OTLP_ENDPOINT =
  process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] ?? 'http://localhost:4318/v1/traces';
const SERVICE_NAME = process.env['SERVICE_NAME'] ?? 'thecopy-backend';
const SERVICE_VERSION = process.env.npm_package_version ?? '1.0.0';
const ENVIRONMENT = process.env.NODE_ENV ?? 'development';
const OTEL_LOG_LEVEL = process.env['OTEL_LOG_LEVEL'] ?? 'info';

function loadOtelModules() {
  const { NodeSDK } = require('@opentelemetry/sdk-node') as typeof import('@opentelemetry/sdk-node');
  const { defaultResource, resourceFromAttributes } =
    require('@opentelemetry/resources') as typeof import('@opentelemetry/resources');
  const { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } =
    require('@opentelemetry/semantic-conventions') as typeof import('@opentelemetry/semantic-conventions');
  const { OTLPTraceExporter } =
    require('@opentelemetry/exporter-trace-otlp-http') as typeof import('@opentelemetry/exporter-trace-otlp-http');
  const { getNodeAutoInstrumentations } =
    require('@opentelemetry/auto-instrumentations-node') as typeof import('@opentelemetry/auto-instrumentations-node');
  const { diag, DiagConsoleLogger, DiagLogLevel } =
    require('@opentelemetry/api') as typeof import('@opentelemetry/api');

  return {
    NodeSDK, defaultResource, resourceFromAttributes,
    SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION,
    OTLPTraceExporter, getNodeAutoInstrumentations,
    diag, DiagConsoleLogger, DiagLogLevel,
  };
}

function configureOtelDiag(
  diag: ReturnType<typeof loadOtelModules>['diag'],
  DiagConsoleLogger: ReturnType<typeof loadOtelModules>['DiagConsoleLogger'],
  DiagLogLevel: ReturnType<typeof loadOtelModules>['DiagLogLevel'],
) {
  if (OTEL_LOG_LEVEL === 'debug') {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
  } else if (OTEL_LOG_LEVEL === 'verbose') {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.VERBOSE);
  }
}

function createTracingResource(modules: ReturnType<typeof loadOtelModules>) {
  return modules.defaultResource().merge(
    modules.resourceFromAttributes({
      [modules.SEMRESATTRS_SERVICE_NAME]: SERVICE_NAME,
      [modules.SEMRESATTRS_SERVICE_VERSION]: SERVICE_VERSION,
      'deployment.environment': ENVIRONMENT,
    })
  );
}

export function initTracing(): NodeSDK | null {
  if (!TRACING_ENABLED) {
    return null;
  }

  const modules = loadOtelModules();
  configureOtelDiag(modules.diag, modules.DiagConsoleLogger, modules.DiagLogLevel);

  const traceExporter = new modules.OTLPTraceExporter({
    url: OTEL_EXPORTER_OTLP_ENDPOINT,
  });

  const resource = createTracingResource(modules);

  const sdk = new modules.NodeSDK({
    resource,
    traceExporter,
    instrumentations: [
      modules.getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-http': {
          enabled: true,
          ignoreIncomingRequestHook: (request) => {
            const url = request.url ?? '';
            return url.includes('/health') || url.includes('/metrics');
          },
        },
        '@opentelemetry/instrumentation-express': { enabled: true },
        '@opentelemetry/instrumentation-pg': { enabled: true },
        '@opentelemetry/instrumentation-redis': { enabled: true },
        '@opentelemetry/instrumentation-mongodb': { enabled: true },
        '@opentelemetry/instrumentation-net': { enabled: false },
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  sdk.start();

  process.on('SIGTERM', () => {
    sdk
      .shutdown()
      .catch((error: unknown) => logger.error('OpenTelemetry shutdown failed', error))
      .finally(() => process.exit(0));
  });

  return sdk;
}
