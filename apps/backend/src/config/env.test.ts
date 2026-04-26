import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import crypto from 'crypto';

describe('Environment Configuration', () => {
  const originalEnv = process.env;
  const createBaseEnv = () => ({
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test_db',
  });
  const createProductionEnv = (overrides: Record<string, string> = {}) => ({
    NODE_ENV: 'production',
    PORT: '3001',
    DATABASE_URL: 'postgresql://prod:prod@localhost:5432/prod_db',
    JWT_SECRET: crypto.randomBytes(32).toString('hex'),
    CORS_ORIGIN: 'http://localhost:5000',
    RATE_LIMIT_WINDOW_MS: '900000',
    RATE_LIMIT_MAX_REQUESTS: '100',
    // مطلوب من apps/backend/.env.example — env-safe يفرضه في production
    NEXT_PUBLIC_BACKEND_URL: 'http://localhost:3001',
    ...overrides,
  });

  beforeEach(() => {
    vi.resetModules();
    const parse = vi.fn(() => ({}));
    vi.doMock('dotenv', () => ({
      default: {
        config: vi.fn(),
        parse,
      },
      parse,
    }));
    process.env = createBaseEnv();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('env validation', () => {
    it('should parse valid environment variables', async () => {
      process.env['NODE_ENV'] = 'development';
      process.env['PORT'] = '3001';
      process.env['DATABASE_URL'] = `postgresql://${process.env['TEST_DB_USER'] || 'user'}:${process.env['TEST_DB_PASS'] || 'pass'}@localhost:5432/test_db`;
      process.env['JWT_SECRET'] = 'a-very-long-secret-key-for-testing-purposes-32-chars';
      process.env['CORS_ORIGIN'] = 'http://localhost:5000';
      process.env['RATE_LIMIT_WINDOW_MS'] = '900000';
      process.env['RATE_LIMIT_MAX_REQUESTS'] = '100';

      const { env } = await import('./env');

      expect(env.NODE_ENV).toBe('development');
      expect(env.PORT).toBe(3001);
      expect(env.DATABASE_URL).toContain('postgresql://');
      expect(env.DATABASE_URL).toContain('@localhost:5432/test_db');
      expect(env.JWT_SECRET).toBe(process.env['JWT_SECRET']);
      expect(env.CORS_ORIGIN).toBe('http://localhost:5000');
      expect(env.RATE_LIMIT_WINDOW_MS).toBe(900000);
      expect(env.RATE_LIMIT_MAX_REQUESTS).toBe(100);
    });

    it('should use default values when not provided', async () => {
      process.env = createBaseEnv();

      const { env } = await import('./env');

      expect(env.NODE_ENV).toBe('test');
      expect(env.PORT).toBe(3001);
      expect(env.DATABASE_URL).toBe('postgresql://test:test@localhost:5432/test_db');
      expect(env.WEAVIATE_REQUIRED).toBe(true);
    });

    it('should validate NODE_ENV enum', async () => {
      process.env = createProductionEnv();

      const { env } = await import('./env');

      expect(env.NODE_ENV).toBe('production');
    });

    it('should reject weak JWT secrets in production', async () => {
      process.env = createProductionEnv({ JWT_SECRET: 'weak-secret' });

      await expect(import('./env')).rejects.toThrow(
        'JWT_SECRET must be at least 32 characters in production'
      );
    });

    it('should handle test environment', async () => {
      process.env['NODE_ENV'] = 'test';
      delete process.env['JWT_SECRET'];

      const { env } = await import('./env');

      expect(env.NODE_ENV).toBe('test');
    });

    it('should transform string PORT to number', async () => {
      process.env['PORT'] = '8080';
      delete process.env['JWT_SECRET'];

      const { env } = await import('./env');

      expect(typeof env.PORT).toBe('number');
      expect(env.PORT).toBe(8080);
    });

    it('should transform rate limit values to numbers', async () => {
      process.env['RATE_LIMIT_WINDOW_MS'] = '600000';
      process.env['RATE_LIMIT_MAX_REQUESTS'] = '50';
      delete process.env['JWT_SECRET'];

      const { env } = await import('./env');

      expect(typeof env.RATE_LIMIT_WINDOW_MS).toBe('number');
      expect(typeof env.RATE_LIMIT_MAX_REQUESTS).toBe('number');
      expect(env.RATE_LIMIT_WINDOW_MS).toBe(600000);
      expect(env.RATE_LIMIT_MAX_REQUESTS).toBe(50);
    });
  });

  describe('isDevelopment helper', () => {
    it('should return true for development environment', async () => {
      process.env['NODE_ENV'] = 'development';
      delete process.env['JWT_SECRET'];

      const { isDevelopment } = await import('./env');

      expect(isDevelopment).toBe(true);
    });

    it('should return false for production environment', async () => {
      process.env = createProductionEnv();

      const { isDevelopment } = await import('./env');

      expect(isDevelopment).toBe(false);
    });

    it('should return false for test environment', async () => {
      process.env['NODE_ENV'] = 'test';
      delete process.env['JWT_SECRET'];

      const { isDevelopment } = await import('./env');

      expect(isDevelopment).toBe(false);
    });
  });

  describe('optional environment variables', () => {
    it('should handle optional GOOGLE_GENAI_API_KEY', async () => {
      process.env = createBaseEnv();

      const { env } = await import('./env');

      // Optional fields can be undefined
      expect(env.GOOGLE_GENAI_API_KEY === undefined || typeof env.GOOGLE_GENAI_API_KEY === 'string').toBe(true);
    });

    it('should handle optional GEMINI_API_KEY', async () => {
      process.env = createBaseEnv();

      const { env } = await import('./env');

      // Optional fields can be undefined
      expect(env.GEMINI_API_KEY === undefined || typeof env.GEMINI_API_KEY === 'string').toBe(true);
    });

    it('should accept GOOGLE_GENAI_API_KEY when provided', async () => {
      process.env = {
        ...createBaseEnv(),
        GOOGLE_GENAI_API_KEY: 'test-key',
      };

      const { env } = await import('./env');

      expect(env.GOOGLE_GENAI_API_KEY).toBe('test-key');
    });

    it('should accept documented operational environment variables', async () => {
      process.env = {
        ...createBaseEnv(),
        FRONTEND_URL: 'http://localhost:5000',
        REDIS_ENABLED: 'true',
        REDIS_SENTINEL_ENABLED: 'false',
        REDIS_SENTINELS: '127.0.0.1:26379,127.0.0.1:26380',
        REDIS_MASTER_NAME: 'mymaster',
        SERVICE_NAME: 'thecopy-backend',
        TRACING_ENABLED: 'true',
        FILE_IMPORT_HOST: '127.0.0.1',
        FILE_IMPORT_PORT: '3001',
        LOG_LEVEL: 'info',
        SENTRY_RELEASE: 'the-copy@1.0.0',
        SENTRY_SERVER_NAME: 'backend-prod-01',
      };

      const { env } = await import('./env');

      expect(env.FRONTEND_URL).toBe('http://localhost:5000');
      expect(env.REDIS_ENABLED).toBe('true');
      expect(env.REDIS_SENTINELS).toBe('127.0.0.1:26379,127.0.0.1:26380');
      expect(env.SERVICE_NAME).toBe('thecopy-backend');
      expect(env.FILE_IMPORT_PORT).toBe('3001');
      expect(env.SENTRY_RELEASE).toBe('the-copy@1.0.0');
    });

    it('should parse Weaviate operational flags and timeout values', async () => {
      process.env = {
        ...createBaseEnv(),
        MEMORY_SYSTEM_ENABLED: 'true',
        WEAVIATE_REQUIRED: 'false',
        WEAVIATE_URL: 'http://localhost:8080',
        WEAVIATE_API_KEY: 'memory-key',
        WEAVIATE_STARTUP_TIMEOUT_MS: '4500',
      };

      const { env } = await import('./env');

      expect(env.MEMORY_SYSTEM_ENABLED).toBe(true);
      expect(env.WEAVIATE_REQUIRED).toBe(false);
      expect(env.WEAVIATE_URL).toBe('http://localhost:8080');
      expect(env.WEAVIATE_API_KEY).toBe('memory-key');
      expect(env.WEAVIATE_STARTUP_TIMEOUT_MS).toBe(4500);
    });

    it('should reject requiring Weaviate when memory system is disabled', async () => {
      process.env = {
        ...createBaseEnv(),
        MEMORY_SYSTEM_ENABLED: 'false',
        WEAVIATE_REQUIRED: 'true',
      };

      await expect(import('./env')).rejects.toThrow(
        'WEAVIATE_REQUIRED=true requires MEMORY_SYSTEM_ENABLED=true'
      );
    });
  });
});
