/**
 * Prisma Client Instance
 * 
 * Creates and exports a singleton PrismaClient instance to avoid
 * multiple connections in development with hot-reloading.
 */

import { PrismaClient } from '@prisma/client';

// Extend global type to include prisma client for singleton pattern
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

/**
 * Check if DATABASE_URL is configured
 */
const hasDatabaseUrl = !!process.env.DATABASE_URL;

/**
 * Singleton PrismaClient instance
 * 
 * In production, creates a new client each time.
 * In development, reuses the existing client to prevent connection exhaustion.
 * If DATABASE_URL is not set, creates a client that will throw on first query.
 */
function createPrismaClient(): PrismaClient {
  if (!hasDatabaseUrl) {
    console.warn('[db] DATABASE_URL not set - database features will not work');
  }
  
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
  });
}

export const prisma: PrismaClient = global.prisma || createPrismaClient();

// In development, store the client on the global object to reuse across hot reloads
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;

