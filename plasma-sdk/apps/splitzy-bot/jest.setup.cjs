/**
 * Jest Setup for Splitzy Bot
 * 
 * Mock database and external services for unit testing.
 */

// Mock the Prisma client
jest.mock('@plasma-pay/db', () => ({
  prisma: {
    paymentIntent: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    telegramWallet: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
    bill: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  },
}));

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'file:./test.db';
