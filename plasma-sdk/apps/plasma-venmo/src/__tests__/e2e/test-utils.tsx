/**
 * E2E Test Utilities
 * Common mocks, helpers, and test fixtures for integration tests
 * @jest-environment jsdom
 */

import React from "react";
import { render, RenderOptions } from "@testing-library/react";

// Placeholder test to satisfy Jest requirement
describe("Test Utilities", () => {
  it("should export test utilities", () => {
    expect(createMockWallet).toBeDefined();
    expect(createMockContact).toBeDefined();
    expect(createMockPaymentLink).toBeDefined();
  });
});

// ============================================================================
// Type Definitions
// ============================================================================

export interface MockWallet {
  address: string;
  signTypedData: jest.Mock;
  signMessage: jest.Mock;
}

export interface MockUser {
  id: string;
  email?: { address: string };
  phone?: { number: string };
  wallet?: { address: string };
}

export interface MockContact {
  id: string;
  ownerAddress: string;
  contactAddress: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  isFavorite: boolean;
  lastPayment: Date | string | null;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

export interface MockPaymentLink {
  id: string;
  creatorAddress: string;
  amount: number | null;
  currency: string;
  memo?: string;
  status: "active" | "paid" | "cancelled" | "expired";
  paidBy?: string;
  paidAt?: string;
  txHash?: string;
  expiresAt?: string;
  createdAt: string;
  url: string;
}

// ============================================================================
// Mock Data Factories
// ============================================================================

export const createMockWallet = (
  overrides?: Partial<MockWallet>
): MockWallet => ({
  address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
  signTypedData: jest.fn().mockResolvedValue("0xmocksignature"),
  signMessage: jest.fn().mockResolvedValue("0xmocksignature"),
  ...overrides,
});

export const createMockUser = (overrides?: Partial<MockUser>): MockUser => ({
  id: "user-123",
  email: { address: "test@example.com" },
  wallet: { address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0" },
  ...overrides,
});

export const createMockContact = (
  overrides?: Partial<MockContact>
): MockContact => ({
  id: `contact-${Date.now()}`,
  ownerAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
  contactAddress: "0xaaaa567890123456789012345678901234567890",
  name: "Test Contact",
  email: "contact@example.com",
  phone: "+12345678900",
  isFavorite: false,
  lastPayment: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const createMockPaymentLink = (
  overrides?: Partial<MockPaymentLink>
): MockPaymentLink => ({
  id: `link-${Date.now()}`,
  creatorAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
  amount: 10.0,
  currency: "USD",
  status: "active",
  createdAt: new Date().toISOString(),
  url: `https://app.plenmo.com/pay/link-${Date.now()}`,
  ...overrides,
});

// ============================================================================
// Mock API Response Helpers
// ============================================================================

export const mockFetchSuccess = <T,>(data: T) => {
  return jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  });
};

export const mockFetchError = (status: number, error: string) => {
  return jest.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve({ error }),
  });
};

// ============================================================================
// Mock Privy Hook Helpers
// ============================================================================

export const createPrivyMocks = (config: {
  authenticated?: boolean;
  ready?: boolean;
  user?: MockUser | null;
  wallet?: MockWallet | null;
}) => {
  const {
    authenticated = false,
    ready = true,
    user = null,
    wallet = null,
  } = config;

  return {
    usePrivy: jest.fn(() => ({
      ready,
      authenticated,
      user,
      login: jest.fn(),
      logout: jest.fn(),
      linkEmail: jest.fn(),
      linkPhone: jest.fn(),
    })),
    useWallets: jest.fn(() => ({
      wallets: wallet ? [wallet] : [],
    })),
    PrivyProvider: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
  };
};

// ============================================================================
// Test Wrapper Components
// ============================================================================

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export const renderWithProviders = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) => render(ui, { wrapper: AllTheProviders, ...options });

// ============================================================================
// Wait Helpers
// ============================================================================

export const waitForCondition = async (
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await condition()) return;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error("Condition not met within timeout");
};

// ============================================================================
// EIP-3009 Test Helpers
// ============================================================================

export const mockEIP3009Signature = {
  v: 28,
  r: "0x" + "a".repeat(64),
  s: "0x" + "b".repeat(64),
};

export const createMockTransferParams = (overrides?: {
  from?: string;
  to?: string;
  value?: string;
}) => ({
  from: overrides?.from ?? "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
  to: overrides?.to ?? "0xaaaa567890123456789012345678901234567890",
  value: overrides?.value ?? "10000000", // 10 USDT (6 decimals)
  validAfter: 0,
  validBefore: Math.floor(Date.now() / 1000) + 3600,
  nonce: "0x" + "c".repeat(64),
});

// ============================================================================
// Storage Helpers
// ============================================================================

export const mockLocalStorage = () => {
  const store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach((k) => delete store[k]);
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((i: number) => Object.keys(store)[i] || null),
  };
};

export const mockSessionStorage = () => mockLocalStorage();

// ============================================================================
// Test Constants
// ============================================================================

export const TEST_ADDRESSES = {
  VALID_ADDRESS: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
  RECIPIENT_ADDRESS: "0xaaaa567890123456789012345678901234567890",
  INVALID_ADDRESS: "0xinvalid",
  ZERO_ADDRESS: "0x0000000000000000000000000000000000000000",
};

export const TEST_AMOUNTS = {
  VALID_SMALL: "5.00",
  VALID_MEDIUM: "100.00",
  VALID_LARGE: "1000.00",
  BELOW_MINIMUM: "0.001",
  ABOVE_MAXIMUM: "10001.00",
  INSUFFICIENT: "999999.00",
};

export const TEST_EMAILS = {
  VALID: "test@example.com",
  INVALID: "invalid-email",
  UNREGISTERED: "unregistered@example.com",
};

export const TEST_PHONES = {
  VALID: "+12345678900",
  INVALID: "123",
  UNREGISTERED: "+19999999999",
};
