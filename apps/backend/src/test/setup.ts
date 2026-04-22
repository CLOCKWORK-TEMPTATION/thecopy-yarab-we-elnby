import { beforeAll, afterAll, vi } from 'vitest';

// Mock logger FIRST before anything else to prevent logger.warn errors
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('bullmq', async () => await import('./mocks/bullmq'));

// Mock environment variables for testing
process.env['NODE_ENV'] = 'test';
process.env['REDIS_ENABLED'] = 'false';
process.env['DATABASE_URL'] = 'postgresql://test:test@localhost:5432/test';
process.env['JWT_SECRET'] = 'test-secret-key';
process.env['GOOGLE_GENAI_API_KEY'] = 'test-api-key';
process.env['CORS_ORIGIN'] = 'http://localhost:5000';
process.env['PORT'] = '3001';
process.env['RATE_LIMIT_WINDOW_MS'] = '900000';
process.env['RATE_LIMIT_MAX_REQUESTS'] = '100';

beforeAll(() => {
  // Setup code before all tests
});

afterAll(() => {
  // Cleanup code after all tests
});
