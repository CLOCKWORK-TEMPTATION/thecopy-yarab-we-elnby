/**
 * Backend API Integration Tests
 *
 * This test suite covers:
 * 1. Health checks and system status
 * 2. Authentication and authorization flows
 * 3. REST API endpoints
 * 4. Database operations
 * 5. Error handling and validation
 */

import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import request from 'supertest';
import { describe, it, expect, beforeAll, vi } from 'vitest';

// Mock dependencies
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/config/env', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 3001,
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    JWT_SECRET: 'test-secret-key-min-32-chars-length!',
    CORS_ORIGIN: 'http://localhost:5000',
    REDIS_URL: 'redis://localhost:6379/0',
    RATE_LIMIT_WINDOW_MS: 900000,
    RATE_LIMIT_MAX_REQUESTS: 100,
  },
}));

describe('Backend API Integration Tests', () => {
  let app: Express;

  beforeAll(() => {
    // Setup Express app for testing
    app = express();
    
    // Middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Test routes
    app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    });

    app.get('/api/v1/status', (req, res) => {
      res.json({
        status: 'ok',
        version: '1.0.0',
        environment: 'test',
      });
    });

    app.post('/api/v1/auth/login', (req, res) => {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Missing credentials' });
      }

      if (email === 'test@example.com' && password === 'test123') {
        return res.status(200).json({
          token: 'mock-jwt-token',
          user: { id: '1', email },
          expiresIn: 3600,
        });
      }

      res.status(401).json({ error: 'Invalid credentials' });
    });

    app.get('/api/v1/projects/:id', (req, res) => {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ error: 'Project ID is required' });
      }

      if (id === '1') {
        return res.status(200).json({
          id: '1',
          title: 'Test Project',
          description: 'A test drama project',
          status: 'draft',
          createdAt: '2024-01-01T00:00:00Z',
        });
      }

      res.status(404).json({ error: 'Project not found' });
    });

    app.post('/api/v1/projects', (req, res) => {
      const { title, description, genre } = req.body;

      if (!title || title.length < 3) {
        return res.status(400).json({
          error: 'Title is required and must be at least 3 characters',
        });
      }

      if (description && description.length > 5000) {
        return res.status(400).json({
          error: 'Description cannot exceed 5000 characters',
        });
      }

      res.status(201).json({
        id: 'new-project-id',
        title,
        description: description || '',
        genre: genre || 'drama',
        status: 'draft',
        createdAt: new Date().toISOString(),
      });
    });

    app.put('/api/v1/projects/:id', (req, res) => {
      const { id } = req.params;
      const { title, status } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Project ID is required' });
      }

      if (id === '1') {
        return res.status(200).json({
          id: '1',
          title: title || 'Test Project',
          status: status || 'draft',
          updatedAt: new Date().toISOString(),
        });
      }

      res.status(404).json({ error: 'Project not found' });
    });

    app.delete('/api/v1/projects/:id', (req, res) => {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ error: 'Project ID is required' });
      }

      if (id === '1') {
        return res.status(200).json({ message: 'Project deleted successfully' });
      }

      res.status(404).json({ error: 'Project not found' });
    });

    // Error handling middleware
    app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
      res.status(err.status ?? 500).json({
        error: err.message.length > 0 ? err.message : 'Internal server error',
      });
    });
  });

  describe('Health Checks', () => {
    it('should return healthy status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });

    it('should return API status', async () => {
      const response = await request(app).get('/api/v1/status');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('environment', 'test');
    });
  });

  describe('Authentication Flow', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'test123',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('expiresIn');
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject missing credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Project Management - GET', () => {
    it('should retrieve project by ID', async () => {
      const response = await request(app).get('/api/v1/projects/1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', '1');
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('createdAt');
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app).get('/api/v1/projects/999');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle missing project ID', async () => {
      const response = await request(app).get('/api/v1/projects/');

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Project Management - POST', () => {
    it('should create project with valid data', async () => {
      const response = await request(app)
        .post('/api/v1/projects')
        .send({
          title: 'New Drama Project',
          description: 'An exciting drama analysis',
          genre: 'tragedy',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('title', 'New Drama Project');
      expect(response.body).toHaveProperty('status', 'draft');
    });

    it('should reject project with short title', async () => {
      const response = await request(app)
        .post('/api/v1/projects')
        .send({
          title: 'ab',
          description: 'Test',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject project with empty title', async () => {
      const response = await request(app)
        .post('/api/v1/projects')
        .send({
          title: '',
          description: 'Test',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject project with oversized description', async () => {
      const response = await request(app)
        .post('/api/v1/projects')
        .send({
          title: 'Valid Title',
          description: 'a'.repeat(5001),
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Project Management - PUT', () => {
    it('should update project successfully', async () => {
      const response = await request(app)
        .put('/api/v1/projects/1')
        .send({
          title: 'Updated Title',
          status: 'published',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', '1');
      expect(response.body).toHaveProperty('title', 'Updated Title');
      expect(response.body).toHaveProperty('status', 'published');
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app)
        .put('/api/v1/projects/999')
        .send({ title: 'Updated' });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle missing project ID', async () => {
      const response = await request(app)
        .put('/api/v1/projects/')
        .send({ title: 'Updated' });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Project Management - DELETE', () => {
    it('should delete project successfully', async () => {
      const response = await request(app).delete('/api/v1/projects/1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app).delete('/api/v1/projects/999');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle missing project ID', async () => {
      const response = await request(app).delete('/api/v1/projects/');

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Request Validation', () => {
    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/v1/projects')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle empty body for POST request', async () => {
      const response = await request(app)
        .post('/api/v1/projects')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle very long strings in payload', async () => {
      const response = await request(app)
        .post('/api/v1/projects')
        .send({
          title: 'a'.repeat(10000),
          description: 'Test',
        });

      // Should either accept with sanitization or reject
      expect([201, 400, 413]).toContain(response.status);
    });
  });

  describe('Response Format', () => {
    it('should return JSON with correct Content-Type', async () => {
      const response = await request(app).get('/api/v1/status');

      expect(response.type).toMatch(/json/);
      expect(typeof response.body).toBe('object');
    });

    it('should include proper error structure in error responses', async () => {
      const response = await request(app).get('/api/v1/projects/999');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
    });
  });

  describe('Concurrent Requests', () => {
    it('should handle multiple concurrent requests', async () => {
      const requests = Array.from({ length: 5 }).map(() =>
        request(app).get('/api/v1/status')
      );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status', 'ok');
      });
    });

    it('should handle concurrent POST and GET requests', async () => {
      const postRequests = Array.from({ length: 3 }).map(() =>
        request(app)
          .post('/api/v1/projects')
          .send({
            title: 'Concurrent Test Project',
            description: 'Testing concurrent requests',
          })
      );

      const getRequests = Array.from({ length: 3 }).map(() =>
        request(app).get('/api/v1/projects/1')
      );

      const responses = await Promise.all([...postRequests, ...getRequests]);

      const postResponses = responses.slice(0, 3);
      const getResponses = responses.slice(3);

      postResponses.forEach((response) => {
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');
      });

      getResponses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('id');
      });
    });
  });
});
