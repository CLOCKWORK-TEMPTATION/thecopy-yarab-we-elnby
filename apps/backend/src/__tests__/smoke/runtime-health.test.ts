/**
 * Runtime Health Smoke Tests
 *
 * Verifies that all health-check endpoints respond correctly when the
 * backend server is running. These tests require a live server and are
 * intentionally skipped during unit-test runs (set SMOKE_TESTS=true or
 * point BACKEND_URL to a running instance to activate them).
 *
 * Run with:
 *   SMOKE_TESTS=true BACKEND_URL=http://localhost:3001 pnpm test --filter @the-copy/backend test:smoke
 */

import { describe, it, expect } from 'vitest';

const SMOKE_ENABLED = process.env['SMOKE_TESTS'] === 'true' || process.env['CI_SMOKE'] === 'true';

const describeSmoke = SMOKE_ENABLED ? describe : describe.skip;

interface ReadyHealthBody {
  status?: unknown;
}

interface DetailedHealthBody {
  checks?: {
    database?: unknown;
    redis?: unknown;
    weaviate?: unknown;
  };
}

describeSmoke('Runtime Health Smoke Tests', () => {
  const BACKEND_URL = process.env['BACKEND_URL'] ?? 'http://localhost:3001';

  it('GET /health/ready returns 200 when services are healthy', async () => {
    const res: globalThis.Response = await fetch(`${BACKEND_URL}/health/ready`);
    expect(res.status).toBe(200);
    const body = await res.json() as ReadyHealthBody;
    expect(body.status).toBe('ready');
  });

  it('GET /health/detailed returns service statuses', async () => {
    const res: globalThis.Response = await fetch(`${BACKEND_URL}/health/detailed`);
    expect([200, 503]).toContain(res.status);
    const body = await res.json() as DetailedHealthBody;
    expect(body.checks).toBeDefined();
    expect(body.checks?.database).toBeDefined();
    expect(body.checks?.redis).toBeDefined();
    expect(body.checks?.weaviate).toBeDefined();
  });

  it('GET /admin/queues returns queue dashboard', async () => {
    const res: globalThis.Response = await fetch(`${BACKEND_URL}/admin/queues`, {
      redirect: 'manual',
    });
    // May redirect to login (302), require auth (401), or return the dashboard (200)
    expect([200, 302, 401]).toContain(res.status);
  });
});
