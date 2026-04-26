import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import dotenv from 'dotenv';
import { z } from 'zod';

import { runEnvSafeCheck } from './env-safe';

let envLoaded = false;
const projectScopedAiKeys = new Set(['GEMINI_API_KEY', 'GOOGLE_GENAI_API_KEY']);
const preferredProjectEnvValues = new Map<string, string>();

function collectEnvCandidates(startPath: string, limit = 5): string[] {
  const candidates: string[] = [];
  let current = resolve(startPath);

  for (let index = 0; index < limit; index += 1) {
    candidates.push(resolve(current, '.env'));
    const parent = dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  return candidates;
}

function stripWrappingQuotes(value: string): string {
  return value.replace(/^['"]|['"]$/g, '');
}

function isPlaceholderEnvValue(key: string, value?: string | null): boolean {
  const trimmed = stripWrappingQuotes(value?.trim() ?? '');
  if (!trimmed) {
    return true;
  }

  if (trimmed.includes('CHANGE_THIS')) {
    return true;
  }

  if (key === 'DATABASE_URL' && /:\/\/USER:PASSWORD@HOST(?::\d+)?\/DB_NAME/i.test(trimmed)) {
    return true;
  }

  return false;
}

function applyEnvFile(path: string): void {
  const parsed = dotenv.parse(readFileSync(path));

  for (const [key, rawValue] of Object.entries(parsed)) {
    const value = rawValue.trim();
    const existingValue = process.env[key];

    if (isPlaceholderEnvValue(key, value)) {
      continue;
    }

    // When a machine-level AI alias conflicts with the project's checked-in
    // local env file, prefer the nearest project file so stale global values
    // cannot silently shadow the backend runtime.
    if (projectScopedAiKeys.has(key)) {
      if (!preferredProjectEnvValues.has(key)) {
        preferredProjectEnvValues.set(key, value);
        process.env[key] = value;
      }
      continue;
    }

    if (existingValue === undefined || isPlaceholderEnvValue(key, existingValue)) {
      process.env[key] = value;
    }
  }
}

function ensureEnvLoaded(): void {
  if (envLoaded || process.env.NODE_ENV === 'test' || process.env['SKIP_DOTENV_AUTOLOAD'] === 'true') {
    envLoaded = true;
    return;
  }

  const configuredPath = process.env['BACKEND_ENV_FILE']?.trim();
  const candidatePaths = [
    configuredPath || null,
    ...collectEnvCandidates(process.cwd()),
    ...collectEnvCandidates(__dirname),
  ];
  const seen = new Set<string>();

  for (const candidate of candidatePaths) {
    if (!candidate) {
      continue;
    }

    const normalized = resolve(candidate);
    if (seen.has(normalized) || !existsSync(normalized)) {
      continue;
    }

    seen.add(normalized);
    applyEnvFile(normalized);
  }

  envLoaded = true;
}

ensureEnvLoaded();
runEnvSafeCheck();

const booleanFromEnv = (defaultValue: 'true' | 'false' = 'false') =>
  z.enum(['true', 'false']).default(defaultValue).transform(value => value === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001').transform(Number),
  GOOGLE_GENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required — PostgreSQL connection string must be set'),
  // JWT_SECRET: Required in production with minimum 32 characters
  // In development, a default is provided but should be changed
  JWT_SECRET: z.string().default('dev-secret-CHANGE-THIS-IN-PRODUCTION-minimum-32-chars'),
  // JWT_SECRET_PREVIOUS: optional — يُستخدم في استراتيجية دوران السر لقبول
  // الرموز الموقّعة بالسر السابق أثناء نافذة الانتقال. التوقيع الجديد يستخدم JWT_SECRET.
  // يُسمح بسلسلة مفصولة بفواصل لدعم أكثر من سر سابق أثناء الانتقال.
  JWT_SECRET_PREVIOUS: z.string().optional(),
  NEXT_PUBLIC_BACKEND_URL: z.string().url().default('http://localhost:3001'),
  CORS_ORIGIN: z.string().default('http://localhost:5000,http://localhost:9002'),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000').transform(Number), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100').transform(Number),
  // Redis Configuration (for caching and job queues)
  FRONTEND_URL: z.string().optional(),
  REDIS_ENABLED: z.string().optional(),
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().optional().default('localhost'),
  REDIS_PORT: z.string().optional().default('6379').transform(Number),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_SENTINEL_ENABLED: z.string().optional(),
  REDIS_SENTINELS: z.string().optional(),
  REDIS_MASTER_NAME: z.string().optional(),
  REDIS_SENTINEL_PASSWORD: z.string().optional(),
  // Sentry Configuration (for error tracking and performance monitoring)
  SENTRY_DSN: z.string().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  SENTRY_RELEASE: z.string().optional(),
  SENTRY_SERVER_NAME: z.string().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.string().optional(),
  SENTRY_PROFILES_SAMPLE_RATE: z.string().optional(),
  SENTRY_SUPPRESS_TURBOPACK_WARNING: z.string().optional(),
  SENTRY_SUPPRESS_GLOBAL_ERROR_HANDLER_FILE_WARNING: z.string().optional(),
  TRACING_ENABLED: z.string().optional(),
  SERVICE_NAME: z.string().optional(),
  FILE_IMPORT_HOST: z.string().optional(),
  FILE_IMPORT_PORT: z.string().optional(),
  LOG_LEVEL: z.string().optional(),
  MEMORY_SYSTEM_ENABLED: booleanFromEnv('true'),
  WEAVIATE_REQUIRED: booleanFromEnv('true'),
  WEAVIATE_URL: z.string().optional(),
  WEAVIATE_API_KEY: z.string().optional(),
  WEAVIATE_STARTUP_TIMEOUT_MS: z.string().default('3000').transform(Number),
});

const parsedEnv = envSchema.parse(process.env);

if (parsedEnv.WEAVIATE_REQUIRED && !parsedEnv.MEMORY_SYSTEM_ENABLED) {
  throw new Error('WEAVIATE_REQUIRED=true requires MEMORY_SYSTEM_ENABLED=true');
}

// Security validation: In production, JWT_SECRET must be strong
if (parsedEnv.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  if (parsedEnv.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production');
  }
  if (parsedEnv.JWT_SECRET.includes('dev-secret') || parsedEnv.JWT_SECRET.includes('CHANGE-THIS')) {
    throw new Error('JWT_SECRET cannot use default value in production. Please set a secure secret.');
  }
  // دوران السر: لو وُجد JWT_SECRET_PREVIOUS يجب أن يستوفي نفس الحد الأدنى الأمني
  if (parsedEnv.JWT_SECRET_PREVIOUS) {
    const previousSecrets = parsedEnv.JWT_SECRET_PREVIOUS.split(',').map((s) => s.trim()).filter(Boolean);
    for (const prev of previousSecrets) {
      if (prev.length < 32) {
        throw new Error('JWT_SECRET_PREVIOUS entries must be at least 32 characters in production');
      }
      if (prev.includes('dev-secret') || prev.includes('CHANGE-THIS')) {
        throw new Error('JWT_SECRET_PREVIOUS entries cannot use default placeholder values in production');
      }
      if (prev === parsedEnv.JWT_SECRET) {
        throw new Error('JWT_SECRET_PREVIOUS entries must differ from the active JWT_SECRET');
      }
    }
  }
}

if (
  parsedEnv.NODE_ENV === 'development' &&
  (parsedEnv.JWT_SECRET.includes('dev-secret') || parsedEnv.JWT_SECRET.includes('CHANGE-THIS'))
) {
  logger.warn('[ENV] Development JWT_SECRET is using default value. Set a project-specific secret for realistic auth testing.');
}

export const env = parsedEnv;

export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
