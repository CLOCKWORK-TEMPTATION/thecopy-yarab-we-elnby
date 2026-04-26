/**
 * Bull Board - Queue Monitoring Dashboard
 *
 * Provides a web interface to monitor and manage BullMQ queues
 * Access: http://localhost:3000/admin/queues (requires authentication)
 */

import { ExpressAdapter } from '@bull-board/express';
import express, { Router } from 'express';
import { rateLimit } from 'express-rate-limit';

import { logger } from '@/lib/logger';
import { authMiddleware } from '@/middleware/auth.middleware';


// Create Express adapter for Bull Board
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

/**
 * Initialize Bull Board with all queues and authentication
 */
export function setupBullBoard() {


  logger.info('[BullBoard] Dashboard initialized at /admin/queues');

  return serverAdapter;
}

/**
 * Get authenticated Bull Board router
 * Wraps the Bull Board router with authentication middleware
 */
export function getAuthenticatedBullBoardRouter(): Router {
  const router = Router();

  // Apply rate limiting for dashboard access
  const dashboardLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests to dashboard, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  });

  router.use(dashboardLimiter as unknown as express.RequestHandler);

  // Apply authentication middleware to all Bull Board routes
  router.use(authMiddleware);

  // Add the Bull Board router
  router.use(serverAdapter.getRouter());

  logger.info('[BullBoard] Authentication enabled for dashboard');

  return router;
}

export { serverAdapter };

