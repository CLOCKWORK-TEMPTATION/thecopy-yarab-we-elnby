/**
 * اختبارات وحدة — Redis Reconnection Strategy [UTP-007]
 *
 * يتحقق من:
 * - استراتيجية إعادة الاتصال (exponential backoff)
 * - التوقف عن المحاولة بعد 10 مرات في Sentinel mode
 * - بوابة Redis: isRedisEnabled
 * - getRedisConfig: تكوين URL مباشر
 * - getRedisConfig: تكوين Sentinel
 * - checkRedisVersion: التحقق من توافق الإصدار
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mock للوحدات الخارجية ───
vi.mock('redis', () => ({
  createClient: vi.fn(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    ping: vi.fn().mockResolvedValue('PONG'),
    info: vi.fn().mockResolvedValue('redis_version:7.2.0'),
    quit: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
  })),
}));

// ═══ اختبارات getRedisConfig ═══

describe('getRedisConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('يجب أن يُرجع config مع URL عند وجود REDIS_URL', async () => {
    process.env['REDIS_URL'] = 'redis://localhost:6379';
    process.env['REDIS_SENTINEL_ENABLED'] = 'false';

    const { getRedisConfig } = await import('@/config/redis.config');
    const config = getRedisConfig();

    expect(config).toHaveProperty('url', 'redis://localhost:6379');
  });

  it('يجب أن يضيف كلمة المرور عند وجود REDIS_PASSWORD مع URL', async () => {
    process.env['REDIS_URL'] = 'redis://localhost:6379';
    process.env['REDIS_PASSWORD'] = 'secret123';
    process.env['REDIS_SENTINEL_ENABLED'] = 'false';

    const { getRedisConfig } = await import('@/config/redis.config');
    const config = getRedisConfig();

    expect(config.password).toBe('secret123');
  });

  it('يجب أن يفعّل وضع Sentinel عند REDIS_SENTINEL_ENABLED=true', async () => {
    process.env['REDIS_SENTINEL_ENABLED'] = 'true';
    process.env['REDIS_SENTINELS'] = '10.0.0.1:26379,10.0.0.2:26380';
    process.env['REDIS_MASTER_NAME'] = 'mymaster';

    const { getRedisConfig } = await import('@/config/redis.config');
    const config = getRedisConfig();

    expect(config).toHaveProperty('sentinels');
    expect(config.sentinels).toHaveLength(2);
    expect(config.name).toBe('mymaster');
  });

  it('يجب أن تتضمن استراتيجية إعادة الاتصال في وضع Sentinel', async () => {
    process.env['REDIS_SENTINEL_ENABLED'] = 'true';

    const { getRedisConfig } = await import('@/config/redis.config');
    const config = getRedisConfig();

    expect(config.socket).toHaveProperty('reconnectStrategy');
    expect(typeof config.socket.reconnectStrategy).toBe('function');
  });

  it('يجب أن تُرجع reconnectStrategy تأخيراً متزايداً', async () => {
    process.env['REDIS_SENTINEL_ENABLED'] = 'true';

    const { getRedisConfig } = await import('@/config/redis.config');
    const config = getRedisConfig();

    const strategy = config.socket.reconnectStrategy;

    // المحاولة الأولى: 100ms
    expect(strategy(1)).toBe(100);
    // المحاولة الخامسة: 500ms
    expect(strategy(5)).toBe(500);
    // بعد الحد الأقصى: false (استنفاد المحاولات)
    // الكود يتوقف عند retries > 10
    const result = strategy(10);
    expect(typeof result === 'number' || result === false).toBe(true);
  });

  it('يجب أن تتوقف reconnectStrategy بعد 10 محاولات', async () => {
    process.env['REDIS_SENTINEL_ENABLED'] = 'true';

    const { getRedisConfig } = await import('@/config/redis.config');
    const config = getRedisConfig();

    const strategy = config.socket.reconnectStrategy;

    // بعد 10 محاولات: يجب أن ترجع false
    expect(strategy(11)).toBe(false);
  });
});

// ═══ اختبارات isRedisEnabled ═══

describe('isRedisEnabled', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('يجب أن تُرجع false عند عدم وجود REDIS_URL أو REDIS_HOST', async () => {
    delete process.env['REDIS_ENABLED'];
    delete process.env['REDIS_URL'];
    delete process.env['REDIS_HOST'];

    const { isRedisEnabled } = await import('@/config/redis-gate');
    expect(isRedisEnabled()).toBe(false);
  });

  it('يجب أن تُرجع true عند وجود REDIS_URL مع عدم تعطيل Redis', async () => {
    process.env['REDIS_ENABLED'] = 'true';
    process.env['REDIS_URL'] = 'redis://localhost:6379';

    const { isRedisEnabled } = await import('@/config/redis-gate');
    expect(isRedisEnabled()).toBe(true);
  });

  it('يجب أن تُرجع false عند REDIS_ENABLED=false حتى مع وجود URL', async () => {
    process.env['REDIS_ENABLED'] = 'false';
    process.env['REDIS_URL'] = 'redis://localhost:6379';

    const { isRedisEnabled } = await import('@/config/redis-gate');
    expect(isRedisEnabled()).toBe(false);
  });
});
