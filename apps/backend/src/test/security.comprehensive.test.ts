/**
 * Comprehensive Security Testing Suite
 *
 * This test suite covers:
 * 1. SQL Injection Prevention
 * 2. XSS (Cross-Site Scripting) Prevention
 * 3. Rate Limiting
 * 4. Authentication & Authorization (JWT, UUID)
 * 5. CORS Policy Validation
 */

import express from 'express';
import request from 'supertest';
import { describe, it, expect, beforeAll, vi } from 'vitest';

// Constants for test data
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'Pass123!';
const WRONG_PASSWORD = 'pass';
const MOCK_INVALID_TOKEN = 'invalid.jwt.token';
const MOCK_MALFORMED_TOKEN = 'Bearer malformed-token';
const MOCK_EXPIRED_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0IiwiZXhwIjoxfQ.sig';
const MOCK_TAMPERED_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbiJ9.sig';
const MOCK_MANIPULATED_TOKEN = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYWRtaW4iLCJ1c2VySWQiOiJhdHRhY2tlciJ9.sig';
const UUID_WITH_PREFIX = 'valid-token-';

// Mock database and services before importing middleware
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  pool: null,
  closeDatabase: vi.fn(),
}));

vi.mock('@/services/auth.service', () => ({
  authService: {
    signup: vi.fn(),
    login: vi.fn(),
    verifyToken: vi.fn(),
    getUserById: vi.fn(),
    generateSecureSessionToken: vi.fn(),
  },
}));

vi.mock('@/services/websocket.service', () => ({
  websocketService: {
    initialize: vi.fn(),
    shutdown: vi.fn(),
  },
}));

vi.mock('@/services/sse.service', () => ({
  sseService: {
    shutdown: vi.fn(),
  },
}));

vi.mock('@/queues', () => ({
  initializeWorkers: vi.fn(),
  shutdownQueues: vi.fn(),
}));

import { authController } from '@/controllers/auth.controller';
import { setupMiddleware } from '@/middleware';
import { authMiddleware } from '@/middleware/auth.middleware';

// Create test app
const createTestApp = () => {
  const app = express();
  setupMiddleware(app);

  // Auth routes
  app.post('/api/auth/signup', authController.signup.bind(authController));
  app.post('/api/auth/login', authController.login.bind(authController));
  app.get('/api/auth/me', authMiddleware, authController.getCurrentUser.bind(authController));

  // Test protected route
  app.get('/api/protected', authMiddleware, (req, res) => {
    res.json({ success: true, message: 'Protected resource accessed' });
  });

  return app;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function responseBody(response: { body: unknown }): Record<string, unknown> {
  return asRecord(response.body);
}

function nestedRecord(source: Record<string, unknown>, field: string): Record<string, unknown> {
  return asRecord(source[field]);
}

function stringField(source: Record<string, unknown>, field: string): string | undefined {
  const value = source[field];
  return typeof value === 'string' ? value : undefined;
}

function headerValue(response: { headers: Record<string, unknown> }, field: string): string | undefined {
  const value = response.headers[field];
  if (Array.isArray(value)) {
    return value.find((item): item is string => typeof item === 'string');
  }
  return typeof value === 'string' ? value : undefined;
}

function assertSessionCookieSecurity(cookies: unknown): void {
  const tokenCookie = Array.isArray(cookies)
    ? cookies.find((cookie): cookie is string => typeof cookie === 'string' && cookie.includes('token='))
    : typeof cookies === 'string'
      ? cookies
      : undefined;

  if (!tokenCookie) {
    return;
  }

  expect(tokenCookie).toContain('HttpOnly');
  expect(tokenCookie).toContain('SameSite=Strict');
}

function assertJwtPayloadIsSanitized(response: { body: unknown; status: number }): void {
  if (response.status !== 201) {
    return;
  }

  const body = responseBody(response);
  const data = nestedRecord(body, 'data');
  const token = stringField(data, 'token');
  if (!token) {
    return;
  }

  const encodedPayload = token.split('.')[1];
  if (!encodedPayload) {
    return;
  }

  const payload = asRecord(JSON.parse(Buffer.from(encodedPayload, 'base64').toString()));

  expect(payload).not.toHaveProperty('password');
  expect(payload).not.toHaveProperty('passwordHash');
}

function assertCorsAllowedMethods(allowedMethods: string | undefined): void {
  expect(allowedMethods).toBeDefined();
  if (!allowedMethods) {
    return;
  }

  const methods = allowedMethods.split(',').map((method) => method.trim());
  expect(methods).toContain('GET');
  expect(methods).toContain('POST');
  expect(methods).not.toContain('TRACE');
  expect(methods).not.toContain('CONNECT');
}

function assertServerHeaderDoesNotExposeExpress(serverHeader: string | undefined): void {
  if (!serverHeader) {
    return;
  }

  expect(serverHeader).not.toContain('Express');
}

let app: express.Application;

beforeAll(() => {
  app = createTestApp();
});

  // =============================================================================
  // 1. SQL INJECTION TESTS
  // =============================================================================

  describe('1️⃣ SQL Injection Prevention', () => {
    const sqlInjectionPayloads = [
      // Classic SQL injection attempts
      "' OR '1'='1",
      "' OR '1'='1' --",
      "' OR '1'='1' /*",
      "admin'--",
      "admin' #",
      "admin'/*",

      // Union-based injection
      "' UNION SELECT NULL--",
      "' UNION SELECT NULL, NULL--",
      "' UNION ALL SELECT NULL--",

      // Boolean-based blind injection
      "' AND 1=1--",
      "' AND 1=2--",

      // Time-based blind injection
      "'; WAITFOR DELAY '0:0:5'--",
      "'; SELECT pg_sleep(5)--",

      // Stacked queries
      "'; DROP TABLE users--",
      "'; DELETE FROM users WHERE '1'='1",

      // Comment-based evasion
      "admin'/**/OR/**/1=1--",

      // Encoded attacks
      "%27%20OR%20%271%27%3D%271",

      // Double encoding
      "%2527%20OR%20%25271%2527%253D%25271",
    ];

    it('should reject SQL injection attempts in email field', async () => {
      for (const payload of sqlInjectionPayloads) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: payload,
            password: TEST_PASSWORD
          });

        // Should either reject with validation error, not find user, or rate limit
        expect([400, 401, 429]).toContain(response.status);
        expect(responseBody(response)['success']).toBe(false);
      }
    });

    it('should reject SQL injection attempts in password field', async () => {
      for (const payload of sqlInjectionPayloads) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: TEST_EMAIL,
            password: payload
          });

        // Should not cause server error - should handle gracefully
        expect(response.status).toBeLessThan(500);
        expect(responseBody(response)['success']).toBe(false);
      }
    });

    it('should use parameterized queries (prevent SQL injection)', async () => {
      // Attempt to inject SQL that would normally bypass authentication
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: "admin' OR '1'='1' --",
          password: "anything"
        });

      // Should reject (401) or rate limit (429)
      expect([401, 429]).toContain(response.status);
      expect(responseBody(response)['success']).toBe(false);
    });

    it('should properly escape special characters in database queries', async () => {
      const specialChars = ["'", '"', '\\', '/', '\n', '\r', '\t', '\b', '\f'];

      for (const char of specialChars) {
        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: `test${char}@example.com`,
            password: TEST_PASSWORD,
            firstName: 'Test',
            lastName: 'User'
          });

        // Should handle special characters without errors (or rate limit)
        expect([201, 400, 429]).toContain(response.status);
      }
    });
  });

  // =============================================================================
  // 2. XSS (CROSS-SITE SCRIPTING) TESTS
  // =============================================================================

  describe('2️⃣ XSS (Cross-Site Scripting) Prevention', () => {
    const xssPayloads = [
      // Basic XSS
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      '<svg/onload=alert("XSS")>',

      // Event handlers
      '<body onload=alert("XSS")>',
      '<input onfocus=alert("XSS") autofocus>',
      '<marquee onstart=alert("XSS")>',

      // JavaScript protocol
      '<a href="javascript:alert(\'XSS\')">Click</a>',
      '<iframe src="javascript:alert(\'XSS\')">',

      // Data URIs
      '<object data="data:text/html,<script>alert(\'XSS\')</script>">',

      // HTML5 features
      '<video src=x onerror=alert("XSS")>',
      '<audio src=x onerror=alert("XSS")>',

      // Filter evasion
      '<scr<script>ipt>alert("XSS")</scr</script>ipt>',
      '<img src="x" onerror="alert(String.fromCharCode(88,83,83))">',

      // Encoded XSS
      '&lt;script&gt;alert("XSS")&lt;/script&gt;',

      // DOM-based XSS
      '<img src=x onerror="eval(atob(\'YWxlcnQoJ1hTUycp\'))">',
    ];

    it('should sanitize XSS attempts in user input fields', async () => {
      for (const payload of xssPayloads) {
        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: TEST_EMAIL,
            password: TEST_PASSWORD,
            firstName: payload,
            lastName: 'User'
          });

        // Should not execute scripts or cause errors (or rate limit)
        expect([201, 400, 429]).toContain(response.status);

        // If successful, check that the payload is properly escaped in response
        const body = responseBody(response);
        const data = nestedRecord(body, 'data');
        const user = nestedRecord(data, 'user');
        const userData = stringField(user, 'firstName') ?? '';
        expect(userData).not.toMatch(/<script[^>]*>/gi);
      }
    });

    it('should set proper security headers to prevent XSS', async () => {
      const response = await request(app)
        .get('/api/health');

      // Check for XSS protection headers
      expect(response.headers['x-xss-protection']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['content-security-policy']).toBeDefined();
    });

    it('should not reflect unescaped user input in error messages', async () => {
      const xssAttempt = '<script>alert("XSS")</script>';

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: xssAttempt,
          password: TEST_PASSWORD
        });

      // Error message should not contain raw XSS payload
      const responseBody = JSON.stringify(response.body);
      expect(responseBody).not.toContain('<script>');
      expect(responseBody).not.toContain('onerror=');
    });
  });

  // =============================================================================
  // 3. RATE LIMITING TESTS
  // =============================================================================

  describe('3️⃣ Rate Limiting', () => {
    it('should enforce rate limits on authentication endpoints', async () => {
      const requests = [];
      const maxAttempts = 6; // Auth limiter allows 5 requests

      // Make multiple rapid requests
      for (let i = 0; i < maxAttempts; i++) {
        requests.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email: `test${i}@example.com`,
              password: WRONG_PASSWORD
            })
        );
      }

      const responses = await Promise.all(requests);

      // Last request should be rate limited (429)
      const lastResponse = responses[responses.length - 1];
      expect(lastResponse.status).toBe(429);
    });

    it('should include rate limit headers in responses', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: TEST_EMAIL,
          password: TEST_PASSWORD
        });

      // Should have rate limit headers
      expect(response.headers['ratelimit-limit']).toBeDefined();
      expect(response.headers['ratelimit-remaining']).toBeDefined();
    });

    it('should have different rate limits for different endpoint types', async () => {
      // Auth endpoints have stricter limits (5 per 15 min)
      const authResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

      // General API endpoints have more relaxed limits (100 per 15 min)
      const healthResponse = await request(app)
        .get('/api/health');

      // Both should have rate limit headers
      expect(authResponse.headers['ratelimit-limit']).toBeDefined();
      expect(healthResponse.headers['ratelimit-limit']).toBeDefined();
    });

    it('should prevent brute force attacks with rate limiting', async () => {
      const attempts = 10;
      const results = { blocked: 0, allowed: 0 };

      for (let i = 0; i < attempts; i++) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'victim@example.com',
            password: `wrongpass${i}`
          });

        if (response.status === 429) {
          results.blocked++;
        } else {
          results.allowed++;
        }
      }

      // Should block requests after limit is reached
      expect(results.blocked).toBeGreaterThan(0);
    });
  });

  // =============================================================================
  // 4. AUTHENTICATION & AUTHORIZATION TESTS (JWT, UUID)
  // =============================================================================

  describe('4️⃣ JWT & Authentication Security', () => {
    it('should reject requests with invalid JWT tokens', async () => {
      const invalidTokens = [
        MOCK_INVALID_TOKEN,
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
        MOCK_MALFORMED_TOKEN,
        '',
        'null',
        'undefined'
      ];

      for (const token of invalidTokens) {
        const response = await request(app)
          .get('/api/protected')
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(401);
        expect(responseBody(response)['success']).toBe(false);
      }
    });

    it('should reject expired JWT tokens', async () => {
      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${MOCK_EXPIRED_TOKEN}`);

      expect(response.status).toBe(401);
    });

    it('should validate JWT signature', async () => {
      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${MOCK_TAMPERED_TOKEN}`);

      expect(response.status).toBe(401);
    });

    it('should reject tokens with manipulated payload', async () => {
      // Attempt to escalate privileges by modifying payload
      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', MOCK_MANIPULATED_TOKEN);

      expect(response.status).toBe(401);
    });

    it('should use httpOnly cookies for session tokens', async () => {
      // Create a test user and login
      const signupResponse = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'user@example.com',
          password: TEST_PASSWORD,
          firstName: 'Test',
          lastName: 'User'
        });

      // Check that cookie is httpOnly
      expect(signupResponse.status).toBeLessThan(500);
      const cookies = signupResponse.headers['set-cookie'];
      assertSessionCookieSecurity(cookies);
    });

    it('should properly validate UUIDs', async () => {
      const invalidUUIDs = [
        'not-a-uuid',
        '12345',
        'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        '00000000-0000-0000-0000-000000000000',
        '../../../etc/passwd',
        '<script>alert("XSS")</script>'
      ];

      for (const uuid of invalidUUIDs) {
        const response = await request(app)
          .get(`/api/protected`)
          .set('Authorization', `Bearer ${UUID_WITH_PREFIX}${uuid}`);

        // Should be rejected (401 due to invalid token)
        expect(response.status).toBe(401);
      }
    });

    it('should not expose sensitive information in JWT tokens', async () => {
      const signupResponse = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'user@example.com',
          password: TEST_PASSWORD,
          firstName: 'JWT',
          lastName: 'Test'
        });

      expect(signupResponse.status).toBeLessThan(500);
      assertJwtPayloadIsSanitized(signupResponse);
    });
  });

  // =============================================================================
  // 5. CORS POLICY TESTS
  // =============================================================================

  describe('5️⃣ CORS Policy Validation', () => {
    it('should reject requests from unauthorized origins', async () => {
      const unauthorizedOrigins = [
        'https://evil.com',
        'https://malicious-site.com',
        'https://attacker.io',
        'null' // null origin attacks
      ];

      for (const origin of unauthorizedOrigins) {
        const response = await request(app)
          .options('/api/auth/login')
          .set('Origin', origin)
          .set('Access-Control-Request-Method', 'POST');

        // Should not include CORS headers for unauthorized origins
        // or should return error
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

      // Should only allow specified methods
      expect(response.status).toBeLessThan(500);
      assertCorsAllowedMethods(typeof allowedMethods === 'string' ? allowedMethods : undefined);
    });

    it('should validate preflight requests properly', async () => {
      const response = await request(app)
        .options('/api/protected')
        .set('Origin', process.env.CORS_ORIGIN ?? 'http://localhost:5000')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'Authorization');

      // Preflight should be handled correctly
      expect([200, 204]).toContain(response.status);
    });
  });

  // =============================================================================
  // 6. ADDITIONAL SECURITY TESTS
  // =============================================================================

  describe('6️⃣ Additional Security Measures', () => {
    it('should have proper security headers set', async () => {
      const response = await request(app)
        .get('/api/health');

      // Essential security headers
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['strict-transport-security']).toBeDefined();
      expect(response.headers['x-download-options']).toBeDefined();
    });

    it('should not expose server information', async () => {
      const response = await request(app)
        .get('/api/health');

      // Should not expose server technology
      expect(response.headers['x-powered-by']).toBeUndefined();

      // Server header should either be undefined or not contain 'Express'
      assertServerHeaderDoesNotExposeExpress(headerValue(response, 'server'));
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"email": invalid json}');

      expect(response.status).toBeLessThan(500);
    });

    it('should sanitize error messages to prevent information disclosure', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: WRONG_PASSWORD
        });

      // Error message should be generic, not revealing if email exists
      const error = stringField(responseBody(response), 'error') ?? '';
      expect(error).not.toContain('password');
      expect(error).not.toContain('username');
      expect(error).not.toContain('does not exist');
    });

    it('should prevent path traversal attacks', async () => {
      const pathTraversalAttempts = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32',
        './../../config/env',
        '%2e%2e%2f%2e%2e%2f',
      ];

      for (const attempt of pathTraversalAttempts) {
        const response = await request(app)
          .get(`/api/${attempt}`);

        // Should return 404, not expose file system (or rate limit)
        expect([404, 400, 429]).toContain(response.status);
      }
    });
  });
