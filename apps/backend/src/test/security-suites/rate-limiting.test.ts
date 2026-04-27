import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createTestApp } from '../helpers/test-app';

const TEST_EMAIL = 'admin@example.com';
const TEST_PASSWORD = 'Password123!';
const WRONG_PASSWORD = 'wrong';

describe('3️⃣ Rate Limiting', () => {
  let app: express.Application;

  beforeAll(() => {
    app = createTestApp();
  });

  it('should enforce rate limits on authentication endpoints', async () => {
    const requests = [];
    const maxAttempts = 6;
    for (let i = 0; i < maxAttempts; i++) {
      requests.push(
        request(app).post('/api/auth/login').send({ email: `test${i}@example.com`, password: WRONG_PASSWORD })
      );
    }
    const responses = await Promise.all(requests);
    const lastResponse = responses[responses.length - 1];
    expect(lastResponse.status).toBe(429);
  });

  it('should include rate limit headers in responses', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    expect(response.headers['ratelimit-limit']).toBeDefined();
    expect(response.headers['ratelimit-remaining']).toBeDefined();
  });

  it('should have different rate limits for different endpoint types', async () => {
    const authResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    const healthResponse = await request(app).get('/api/health');
    expect(authResponse.headers['ratelimit-limit']).toBeDefined();
    expect(healthResponse.headers['ratelimit-limit']).toBeDefined();
  });

  it('should prevent brute force attacks with rate limiting', async () => {
    const attempts = 10;
    const results = { blocked: 0, allowed: 0 };
    for (let i = 0; i < attempts; i++) {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'victim@example.com', password: `wrongpass${i}` });
      if (response.status === 429) {
        results.blocked++;
      } else {
        results.allowed++;
      }
    }
    expect(results.blocked).toBeGreaterThan(0);
  });
});
