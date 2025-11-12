/**
 * Jest Setup File
 * 
 * Global test configuration and mocks
 */

// Mock environment variables
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://test:test@localhost:5432/test";
process.env.REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
process.env.PLASMA_RPC = process.env.PLASMA_RPC || "https://rpc.plasma.to";
process.env.PLASMA_CHAIN_ID = process.env.PLASMA_CHAIN_ID || "9745";
process.env.USDT0_ADDRESS = process.env.USDT0_ADDRESS || "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb";
process.env.MERCHANT_ADDRESS = process.env.MERCHANT_ADDRESS || "0x0000000000000000000000000000000000000000";
process.env.CRON_SECRET = process.env.CRON_SECRET || "test-secret";

// Increase timeout for integration tests
jest.setTimeout(30000);

// Suppress console errors in tests (optional)
// global.console = {
//   ...console,
//   error: jest.fn(),
//   warn: jest.fn(),
// };

