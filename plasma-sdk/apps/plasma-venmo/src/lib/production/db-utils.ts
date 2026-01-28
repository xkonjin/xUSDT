import { PrismaClient } from '@plasma-pay/db';
import { withAccelerate } from '@prisma/extension-accelerate';
import { logger } from './logger'; // Assuming a structured logger is available

/**
 * Represents the extended Prisma client with specific query helpers.
 */
export type ExtendedPrismaClient = ReturnType<typeof getExtendedPrismaClient>;

// Global Prisma client instance to be reused across the application.
const globalForPrisma = globalThis as unknown as {
  prisma: ExtendedPrismaClient | undefined;
};

/**
 * Creates and returns an extended Prisma client instance.
 * This function ensures that in a development environment, the same client is reused across hot reloads,
 * preventing the creation of too many database connections.
 * The client is extended with Prisma Accelerate for connection pooling and caching.
 *
 * @returns {ExtendedPrismaClient} The extended Prisma client instance.
 */
function getExtendedPrismaClient() {
  return new PrismaClient().$extends(withAccelerate());
}

export const prisma = globalForPrisma.prisma ?? getExtendedPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * A utility function to execute database queries with retry logic for specific, transient errors.
 * This can help improve the resilience of the application in case of temporary database issues.
 *
 * @template T
 * @param {() => Promise<T>} query - The Prisma query to execute.
 * @param {number} [retries=3] - The number of times to retry the query.
 * @param {number} [delay=100] - The delay in milliseconds between retries.
 * @returns {Promise<T>} The result of the query.
 * @throws {Error} Throws an error if the query fails after all retries.
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
      logger.warn({ err: error, attempt: i + 1 }, 'Query failed, retrying...');
      await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
    }
  }

  logger.error({ err: lastError }, 'Query failed after all retries.');
  throw lastError;
}

/**
 * Gracefully disconnects from the database.
 * This should be called when the application is shutting down to ensure all connections are closed properly.
 */
export async function disconnectFromDB(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('Successfully disconnected from the database.');
  } catch (error) {
    logger.error({ err: error }, 'Failed to disconnect from the database.');
  }
}
