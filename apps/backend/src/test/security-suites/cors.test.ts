import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createTestApp } from '../helpers/test-app';
import { assertCorsAllowedMethods } from '../helpers/test-utils';

describe('5️⃣ CORS Policy Validation', () => {
  let app: express.Application;

  beforeAll(() => {
    app = createTestApp();
  });

  it('should reject requests from unauthorized origins', async () => {
    const unauthorizedOrigins = [
      'https://evil.com',
      'https://malicious-site.com',
      'https://attacker.io',
      'null'
    ];
    for (const origin of unauthorizedOrigins) {
      const response = await request(app)
        .options('/api/auth/login')
        .set('Origin', origin)
        .set('Access-Control-Request-Method', 'POST');
      expect(response.status).not.toBe(200);
    }
  });

  it('should allow requests from authorized origins', async () => {
    const authorizedOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5000';
    const response = await request(app)
      .options('/api/auth/login')
      .set('Origin', authorizedOrigin)
      .set('Access-Control-Request-Method', 'POST');
    expect(response.headers['access-control-allow-origin']).toBeDefined();
  });

  it('should include proper CORS headers', async () => {
    const response = await request(app)
      .get('/api/health')
      .set('Origin', process.env.CORS_ORIGIN ?? 'http://localhost:5000');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('should restrict CORS methods to safe list', async () => {
    const response = await request(app)
      .options('/api/auth/login')
      .set('Origin', process.env.CORS_ORIGIN ?? 'http://localhost:5000')
      .set('Access-Control-Request-Method', 'POST');
    const allowedMethods = response.headers['access-control-allow-methods'];
    expect(response.status).toBeLessThan(500);
    assertCorsAllowedMethods(typeof allowedMethods === 'string' ? allowedMethods : undefined);
  });

  it('should validate preflight requests properly', async () => {
    const response = await request(app)
      .options('/api/protected')
      .set('Origin', process.env.CORS_ORIGIN ?? 'http://localhost:5000')
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'Authorization');
    expect([200, 204]).toContain(response.status);
  });
});
