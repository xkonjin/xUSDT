/**
 * Database Utilities
 * Provides connection management and query helpers for Prisma
 * Uses standard Prisma patterns without external extensions
 */

import { db } from '@plasma-pay/db';
import logger from './logger';

/**
 * Re-export the database client from @plasma-pay/db
 * This provides a consistent interface for database access
 */
export const prisma = db;

/**
 * Database connection status
 */
export interface DbStatus {
  connected: boolean;
  latencyMs: number;
  error?: string;
}

/**
 * Check database connection health
 */
export async function checkDbHealth(): Promise<DbStatus> {
  const start = Date.now();
  
  try {
    // Execute a simple query to check connection
    await db.$queryRaw`SELECT 1`;
    
    return {
      connected: true,
      latencyMs: Date.now() - start
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Database health check failed', { error: errorMessage });
    
    return {
      connected: false,
      latencyMs: Date.now() - start,
      error: errorMessage
    };
  }
}

/**
 * A utility function to execute database queries with retry logic for transient errors.
 * This improves resilience against temporary database issues.
 *
 * @template T
 * @param query - The Prisma query to execute.
 * @param retries - The number of times to retry the query (default: 3).
 * @param delay - The initial delay in milliseconds between retries (default: 100).
 * @returns The result of the query.
 * @throws Error if the query fails after all retries.
 */
export async function withRetry<T>(
  query: () => Promise<T>,
  retries = 3,
  delay = 100
): Promise<T> {
  let lastError: unknown;

  for (let i = 0; i < retries; i++) {
    try {
      return await query();
    } catch (error) {
      lastError = error;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.warn(`Query failed, retrying... (attempt ${i + 1}/${retries})`, { 
        error: errorMessage,
        attempt: i + 1 
      });
      
      // Exponential backoff
      await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }

  const errorMessage = lastError instanceof Error ? lastError.message : 'Unknown error';
  logger.error('Query failed after all retries', { error: errorMessage });
  throw lastError;
}

/**
 * Execute a query with timeout
 * 
 * @template T
 * @param query - The Prisma query to execute.
 * @param timeoutMs - Timeout in milliseconds (default: 30000).
 * @returns The result of the query.
 * @throws Error if the query times out.
 */
export async function withTimeout<T>(
  query: () => Promise<T>,
  timeoutMs = 30000
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Query timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([query(), timeoutPromise]);
}

/**
 * Execute a query with both retry and timeout
 * 
 * @template T
 * @param query - The Prisma query to execute.
 * @param options - Configuration options.
 * @returns The result of the query.
 */
export async function optimizedQuery<T>(
  query: () => Promise<T>,
  options: {
    retries?: number;
    retryDelay?: number;
    timeoutMs?: number;
  } = {}
): Promise<T> {
  const { retries = 3, retryDelay = 100, timeoutMs = 30000 } = options;
  
  return withRetry(
    () => withTimeout(query, timeoutMs),
    retries,
    retryDelay
  );
}

/**
 * Gracefully disconnects from the database.
 * This should be called when the application is shutting down.
 */
export async function disconnectFromDB(): Promise<void> {
  try {
    await db.$disconnect();
    logger.info('Successfully disconnected from the database');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to disconnect from the database', { error: errorMessage });
  }
}

/**
 * Transaction wrapper with automatic retry on deadlock
 * 
 * @template T
 * @param fn - The transaction function to execute.
 * @param maxRetries - Maximum number of retries on deadlock (default: 3).
 * @returns The result of the transaction.
 */
export async function withTransaction<T>(
  fn: Parameters<typeof db.$transaction>[0],
  maxRetries = 3
): Promise<T> {
  let lastError: unknown;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      // @ts-expect-error - Prisma transaction types are complex
      return await db.$transaction(fn);
    } catch (error) {
      lastError = error;
      const errorMessage = error instanceof Error ? error.message : '';
      
      // Check for deadlock errors (MySQL/PostgreSQL)
      if (errorMessage.includes('deadlock') || errorMessage.includes('Deadlock')) {
        logger.warn(`Transaction deadlock detected, retrying... (attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, i)));
        continue;
      }
      
      // Re-throw non-deadlock errors immediately
      throw error;
    }
  }
  
  throw lastError;
}

export default prisma;
