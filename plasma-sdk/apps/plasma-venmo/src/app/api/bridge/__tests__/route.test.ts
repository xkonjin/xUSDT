/**
 * Bridge API Route Tests
 * 
 * Tests for /api/bridge/quote, /api/bridge/transaction, and /api/bridge/status
 * 
 * Note: These tests use a simplified mock approach since testing Next.js App Router
 * API routes requires the proper Next.js test environment.
 */

// Mock NextResponse for testing
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      status: init?.status || 200,
      json: () => Promise.resolve(data),
      headers: new Headers(init?.headers || {}),
    })),
  },
}));

// Mock the aggregator module
jest.mock('@plasma-pay/aggregator', () => ({
  getBestBridgeQuote: jest.fn(),
  getBridgeTransaction: jest.fn(),
  getBridgeStatus: jest.fn(),
  POPULAR_SOURCE_CHAINS: [
    { chainId: 1, name: 'Ethereum', shortName: 'ETH' },
    { chainId: 42161, name: 'Arbitrum One', shortName: 'ARB' },
  ],
  POPULAR_TOKENS: {
    1: [
      { chainId: 1, address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', symbol: 'ETH', decimals: 18 },
      { chainId: 1, address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', decimals: 6 },
    ],
  },
}));

// Mock rate limiter
jest.mock('@/lib/api-utils', () => ({
  checkRateLimit: jest.fn().mockReturnValue({ allowed: true, retryAfter: null }),
  rateLimitResponse: jest.fn().mockReturnValue({ status: 429 }),
}));

jest.mock('@/lib/rate-limiter', () => ({
  RATE_LIMIT_CONFIGS: {
    bridge: { maxRequests: 30, windowMs: 60000 },
    payment: { maxRequests: 10, windowMs: 60000 },
    read: { maxRequests: 100, windowMs: 60000 },
  },
}));

// Import after mocks
import { POST as quotePost, GET as quoteGet } from '../quote/route';
import { POST as transactionPost } from '../transaction/route';
import { GET as statusGet } from '../status/route';
import { getBestBridgeQuote, getBridgeTransaction, getBridgeStatus } from '@plasma-pay/aggregator';
import { NextResponse } from 'next/server';

describe('Bridge Quote API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/bridge/quote', () => {
    const validBody = {
      fromChainId: 1,
      fromToken: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
      fromAmount: '1000000000000000000',
      recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7',
    };

    it('returns quotes for valid request', async () => {
      const mockResult = {
        best: {
          provider: 'lifi',
          toAmount: '3200000000',
          toAmountMin: '3100000000',
          gasUsd: '5.00',
          estimatedTime: 120,
        },
        all: [],
        errors: [],
      };
      
      (getBestBridgeQuote as jest.Mock).mockResolvedValueOnce(mockResult);
      
      const request = new Request('http://localhost/api/bridge/quote', {
        method: 'POST',
        body: JSON.stringify(validBody),
        headers: { 'Content-Type': 'application/json' },
      });
      
      await quotePost(request);
      
      expect(getBestBridgeQuote).toHaveBeenCalledWith({
        fromChainId: validBody.fromChainId,
        fromToken: validBody.fromToken,
        fromAmount: validBody.fromAmount,
        userAddress: validBody.recipientAddress,
        recipientAddress: validBody.recipientAddress,
      });
      
      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          best: mockResult.best,
          timestamp: expect.any(String),
        })
      );
    });

    it('returns 400 for missing required fields', async () => {
      const request = new Request('http://localhost/api/bridge/quote', {
        method: 'POST',
        body: JSON.stringify({ fromChainId: 1 }),
        headers: { 'Content-Type': 'application/json' },
      });
      
      await quotePost(request);
      
      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('Missing required fields') }),
        expect.objectContaining({ status: 400 })
      );
    });

    it('returns 400 for unsupported chain', async () => {
      const request = new Request('http://localhost/api/bridge/quote', {
        method: 'POST',
        body: JSON.stringify({ ...validBody, fromChainId: 999 }),
        headers: { 'Content-Type': 'application/json' },
      });
      
      await quotePost(request);
      
      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('not supported') }),
        expect.objectContaining({ status: 400 })
      );
    });

    it('returns 400 for invalid address format', async () => {
      const request = new Request('http://localhost/api/bridge/quote', {
        method: 'POST',
        body: JSON.stringify({ ...validBody, recipientAddress: 'invalid' }),
        headers: { 'Content-Type': 'application/json' },
      });
      
      await quotePost(request);
      
      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('Invalid recipient address') }),
        expect.objectContaining({ status: 400 })
      );
    });

    it('handles aggregator errors gracefully', async () => {
      (getBestBridgeQuote as jest.Mock).mockRejectedValueOnce(new Error('Provider timeout'));
      
      const request = new Request('http://localhost/api/bridge/quote', {
        method: 'POST',
        body: JSON.stringify(validBody),
        headers: { 'Content-Type': 'application/json' },
      });
      
      await quotePost(request);
      
      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Provider timeout' }),
        expect.objectContaining({ status: 500 })
      );
    });
  });

  describe('GET /api/bridge/quote', () => {
    it('returns supported chains and tokens', async () => {
      await quoteGet();
      
      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          chains: expect.any(Array),
          tokens: expect.any(Object),
        })
      );
    });
  });
});

describe('Bridge Transaction API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/bridge/transaction', () => {
    const validBody = {
      provider: 'lifi',
      fromChainId: 1,
      fromToken: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
      fromAmount: '1000000000000000000',
      recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7',
    };

    it('returns transaction data for valid request', async () => {
      const mockTx = {
        to: '0x1234567890123456789012345678901234567890',
        data: '0xabcd',
        value: '0x0',
        gasLimit: '300000',
        chainId: 1,
        routeId: 'route-123',
      };
      
      (getBridgeTransaction as jest.Mock).mockResolvedValueOnce(mockTx);
      
      const request = new Request('http://localhost/api/bridge/transaction', {
        method: 'POST',
        body: JSON.stringify(validBody),
        headers: { 'Content-Type': 'application/json' },
      });
      
      await transactionPost(request);
      
      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'lifi',
          transaction: mockTx,
        })
      );
    });

    it('returns 400 for invalid provider', async () => {
      const request = new Request('http://localhost/api/bridge/transaction', {
        method: 'POST',
        body: JSON.stringify({ ...validBody, provider: 'invalid' }),
        headers: { 'Content-Type': 'application/json' },
      });
      
      await transactionPost(request);
      
      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('Invalid provider') }),
        expect.objectContaining({ status: 400 })
      );
    });

    it('returns 404 when no transaction available', async () => {
      (getBridgeTransaction as jest.Mock).mockResolvedValueOnce(null);
      
      const request = new Request('http://localhost/api/bridge/transaction', {
        method: 'POST',
        body: JSON.stringify(validBody),
        headers: { 'Content-Type': 'application/json' },
      });
      
      await transactionPost(request);
      
      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('No transaction available') }),
        expect.objectContaining({ status: 404 })
      );
    });
  });
});

describe('Bridge Status API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/bridge/status', () => {
    it('returns status for valid LI.FI request', async () => {
      const mockStatus = {
        status: 'completed',
        destTxHash: '0xabc123',
      };
      
      (getBridgeStatus as jest.Mock).mockResolvedValueOnce(mockStatus);
      
      const url = new URL('http://localhost/api/bridge/status');
      url.searchParams.set('provider', 'lifi');
      url.searchParams.set('txHash', '0x123456789');
      url.searchParams.set('fromChainId', '1');
      url.searchParams.set('toChainId', '9745');
      
      const request = new Request(url.toString());
      await statusGet(request);
      
      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'lifi',
          status: 'completed',
        })
      );
    });

    it('returns 400 for invalid provider', async () => {
      const url = new URL('http://localhost/api/bridge/status');
      url.searchParams.set('provider', 'invalid');
      
      const request = new Request(url.toString());
      await statusGet(request);
      
      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('Invalid provider') }),
        expect.objectContaining({ status: 400 })
      );
    });

    it('returns 400 when txHash missing for lifi', async () => {
      const url = new URL('http://localhost/api/bridge/status');
      url.searchParams.set('provider', 'lifi');
      
      const request = new Request(url.toString());
      await statusGet(request);
      
      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('txHash is required') }),
        expect.objectContaining({ status: 400 })
      );
    });

    it('returns 400 when orderId missing for debridge', async () => {
      const url = new URL('http://localhost/api/bridge/status');
      url.searchParams.set('provider', 'debridge');
      
      const request = new Request(url.toString());
      await statusGet(request);
      
      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('orderId is required') }),
        expect.objectContaining({ status: 400 })
      );
    });
  });
});
