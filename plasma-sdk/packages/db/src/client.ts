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
 * Singleton PrismaClient instance
 * 
 * In production, creates a new client each time.
 * In development, reuses the existing client to prevent connection exhaustion.
 */
export const prisma: PrismaClient =
  global.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
  });

// In development, store the client on the global object to reuse across hot reloads
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;

