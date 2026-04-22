import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { logger } from '@/utils/logger';

const { Pool } = pg;

const DATABASE_URL = process.env['DATABASE_URL'];

export const pool = DATABASE_URL
  ? new Pool({
      connectionString: DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })
  : (null as unknown as pg.Pool);

export const db = pool
  ? drizzle(pool)
  : (null as unknown as ReturnType<typeof drizzle>);

export let databaseAvailable = false;

export async function initializeDatabase(): Promise<void> {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. PostgreSQL is required — set DATABASE_URL in .env');
  }

  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    databaseAvailable = true;
    logger.info('Database connection established successfully');
  } catch (error) {
    databaseAvailable = false;
    throw new Error(
      `Database connection failed: ${error instanceof Error ? error.message : String(error)}. ` +
      'Ensure PostgreSQL is running (pnpm run infra:up) and DATABASE_URL is correct.'
    );
  }
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    try {
      await pool.end();
      logger.info('Database connection pool closed');
    } catch (error) {
      logger.error('Error closing database pool:', error);
    }
  }
}
