import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const connectMock = vi.fn();
const pingMock = vi.fn();
const disconnectMock = vi.fn();
const quitMock = vi.fn();

const mockClient = {
  connect: connectMock,
  ping: pingMock,
  disconnect: disconnectMock,
  quit: quitMock,
} as unknown;

const createClientMock = vi.fn(() => mockClient);
const getRedisConfigMock = vi.fn();

vi.mock('redis', () => ({
  createClient: createClientMock,
}));

vi.mock('@/config/redis.config', () => ({
  getRedisConfig: getRedisConfigMock,
}));

const infoMock = vi.fn();
const warnMock = vi.fn();

vi.mock('./logger', () => ({
  logger: {
    info: infoMock,
    warn: warnMock,
  },
}));

describe('Redis Health Utility', () => {
  beforeEach(() => {
    connectMock.mockReset();
    pingMock.mockReset();
    disconnectMock.mockReset();
    quitMock.mockReset();
    createClientMock.mockReset();
    createClientMock.mockImplementation(() => mockClient);
    infoMock.mockReset();
    warnMock.mockReset();
    vi.resetModules();

    process.env.REDIS_HOST = 'cache.internal';
    process.env.REDIS_PORT = '6381';
    process.env.REDIS_PASSWORD = 'super-secret';
    delete process.env.REDIS_URL;

    getRedisConfigMock.mockReset();
    getRedisConfigMock.mockReturnValue({
      url: 'redis://:super-secret@cache.internal:6381',
    });
  });

  afterEach(() => {
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_PORT;
    delete process.env.REDIS_PASSWORD;
  });

  it('should create a Redis client and verify connectivity when ping succeeds', async () => {
    connectMock.mockResolvedValueOnce(undefined);
    pingMock.mockResolvedValueOnce('PONG');

    const { checkRedisHealth } = await import('./redis-health');

    const result = await checkRedisHealth();

    expect(result).toBe(true);
    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(connectMock).toHaveBeenCalledTimes(1);
    expect(pingMock).toHaveBeenCalledTimes(1);
    expect(infoMock).toHaveBeenCalledWith('[Redis] Health check passed');

    const clientConfig = createClientMock.mock.calls[0][0];
    expect(clientConfig.url).toBe('redis://:super-secret@cache.internal:6381');
    expect(clientConfig.socket.connectTimeout).toBe(5000);
    expect(clientConfig.socket.reconnectStrategy(0)).toBe(false);
  });

  it('should reuse the existing client on subsequent health checks', async () => {
    connectMock.mockResolvedValue(undefined);
    pingMock.mockResolvedValue('PONG');

    const { checkRedisHealth } = await import('./redis-health');

    await checkRedisHealth();
    await checkRedisHealth();

    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(connectMock).toHaveBeenCalledTimes(1);
    expect(pingMock).toHaveBeenCalledTimes(2);
    expect(infoMock).toHaveBeenCalledTimes(2);
  });

  it('should handle ping failures by disconnecting and allowing retry', async () => {
    const failure = new Error('redis offline');
    connectMock.mockResolvedValue(undefined);
    pingMock.mockRejectedValueOnce(failure);
    disconnectMock.mockResolvedValueOnce(undefined);

    const { checkRedisHealth } = await import('./redis-health');

    const firstAttempt = await checkRedisHealth();

    expect(firstAttempt).toBe(false);
    expect(warnMock).toHaveBeenCalledWith('[Redis] Health check failed:', failure);
    expect(disconnectMock).toHaveBeenCalledTimes(1);

    createClientMock.mockClear();
    connectMock.mockClear();
    pingMock.mockReset();
    pingMock.mockResolvedValueOnce('PONG');

    const secondAttempt = await checkRedisHealth();

    expect(secondAttempt).toBe(true);
    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(connectMock).toHaveBeenCalledTimes(1);
    expect(pingMock).toHaveBeenCalledTimes(1);
  });

  it('should provide monitoring metadata via getRedisStatus', async () => {
    connectMock.mockResolvedValue(undefined);
    pingMock.mockResolvedValueOnce('PONG');

    const { getRedisStatus } = await import('./redis-health');

    const status = await getRedisStatus();

    expect(status).toMatchObject({
      status: 'connected',
      host: 'cache.internal',
      port: 6381,
    });
    expect(new Date(status.timestamp).toString()).not.toBe('Invalid Date');

    const failure = new Error('unreachable');
    pingMock.mockRejectedValueOnce(failure);
    disconnectMock.mockResolvedValueOnce(undefined);

    const disconnected = await getRedisStatus();

    expect(disconnected.status).toBe('disconnected');
    expect(warnMock).toHaveBeenCalledWith('[Redis] Health check failed:', failure);
  });

  it('should use REDIS_URL metadata when present', async () => {
    process.env.REDIS_URL = 'redis://default:secret@redis.railway.internal:16379';
    connectMock.mockResolvedValue(undefined);
    pingMock.mockResolvedValueOnce('PONG');

    const { getRedisStatus } = await import('./redis-health');

    const status = await getRedisStatus();

    expect(status).toMatchObject({
      status: 'connected',
      host: 'redis.railway.internal',
      port: 16379,
    });
  });

  it('should close the client when closeRedisConnection is called', async () => {
    connectMock.mockResolvedValue(undefined);
    pingMock.mockResolvedValue('PONG');
    quitMock.mockResolvedValue(undefined);

    const { checkRedisHealth, closeRedisConnection } = await import('./redis-health');

    await checkRedisHealth();
    await closeRedisConnection();

    expect(quitMock).toHaveBeenCalledTimes(1);

    await closeRedisConnection();

    expect(quitMock).toHaveBeenCalledTimes(1);
  });
});
