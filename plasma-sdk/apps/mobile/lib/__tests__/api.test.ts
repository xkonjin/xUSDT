/**
 * Tests for Plasma Mobile API Client
 *
 * Tests the API client functions for interacting with Plasma Pay backend.
 */

import api from '../api';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('PlasmaAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserSettings', () => {
    it('should fetch user settings for an address', async () => {
      const mockSettings = {
        settings: {
          referralCode: 'ABC123',
          displayName: 'John Doe',
          email: 'john@example.com',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSettings),
      });

      const result = await api.getUserSettings('0x1234567890abcdef');
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/user-settings?address=0x1234567890abcdef'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result).toEqual(mockSettings);
    });

    it('should throw error on failed request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'User not found' }),
      });

      await expect(api.getUserSettings('0xinvalid')).rejects.toThrow('User not found');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      await expect(api.getUserSettings('0x123')).rejects.toThrow('Network error');
    });
  });

  describe('updateUserSettings', () => {
    it('should update user settings', async () => {
      const mockResponse = {
        settings: {
          referralCode: 'ABC123',
          displayName: 'Updated Name',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await api.updateUserSettings({
        walletAddress: '0x123',
        displayName: 'Updated Name',
      });
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/user-settings'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            walletAddress: '0x123',
            displayName: 'Updated Name',
          }),
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getReferralStats', () => {
    it('should fetch referral stats for an address', async () => {
      const mockStats = {
        stats: {
          totalReferred: 5,
          pendingRewards: 10,
          paidRewards: 20,
          totalEarned: 30,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStats),
      });

      const result = await api.getReferralStats('0x1234567890abcdef');
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/referrals?address=0x1234567890abcdef'),
        expect.any(Object)
      );
      expect(result).toEqual(mockStats);
    });
  });

  describe('createReferral', () => {
    it('should create a referral', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const result = await api.createReferral({
        referrerAddress: '0xreferrer',
        refereeAddress: '0xreferee',
        source: 'mobile',
      });
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/referrals'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            referrerAddress: '0xreferrer',
            refereeAddress: '0xreferee',
            source: 'mobile',
          }),
        })
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe('getTransactions', () => {
    it('should fetch transaction history', async () => {
      const mockTransactions = {
        transactions: [
          { id: 'tx_1', type: 'sent', amount: '100', counterparty: '0xabc', timestamp: 1234567890, txHash: '0x123' },
          { id: 'tx_2', type: 'received', amount: '50', counterparty: '0xdef', timestamp: 1234567891, txHash: '0x456' },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTransactions),
      });

      const result = await api.getTransactions('0x123');
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/history?address=0x123'),
        expect.any(Object)
      );
      expect(result.transactions).toHaveLength(2);
      expect(result.transactions[0].type).toBe('sent');
    });
  });

  describe('getClaim', () => {
    it('should fetch claim by token', async () => {
      const mockClaim = {
        claim: {
          id: 'claim_123',
          amount: '100',
          status: 'pending',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockClaim),
      });

      const result = await api.getClaim('abc123token');
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/claims/abc123token'),
        expect.any(Object)
      );
      expect(result.claim.id).toBe('claim_123');
    });
  });

  describe('executeClaim', () => {
    it('should execute a claim and return txHash', async () => {
      const mockResponse = { txHash: '0xclaim123' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await api.executeClaim('token123', '0xclaimer');
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/claims/token123'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ claimerAddress: '0xclaimer' }),
        })
      );
      expect(result.txHash).toBe('0xclaim123');
    });
  });

  describe('getPaymentLink', () => {
    it('should fetch payment link by id', async () => {
      const mockPaymentLink = {
        paymentLink: {
          id: 'link_123',
          amount: '50',
          recipient: '0xrecipient',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPaymentLink),
      });

      const result = await api.getPaymentLink('link_123');
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/payment-links/link_123'),
        expect.any(Object)
      );
      expect(result.paymentLink.amount).toBe('50');
    });
  });

  describe('payPaymentLink', () => {
    it('should pay a payment link and return txHash', async () => {
      const mockResponse = { txHash: '0xpay123' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await api.payPaymentLink('link_123', '0xpayer');
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/payment-links/link_123'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ payerAddress: '0xpayer' }),
        })
      );
      expect(result.txHash).toBe('0xpay123');
    });
  });

  describe('submitTransfer', () => {
    it('should submit a transfer and return txHash', async () => {
      const mockResponse = { txHash: '0xabc123' };
      const transferParams = {
        from: '0xsender',
        to: '0xrecipient',
        value: '1000000',
        validAfter: 0,
        validBefore: Math.floor(Date.now() / 1000) + 3600,
        nonce: '12345',
        v: 27,
        r: '0x123',
        s: '0x456',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await api.submitTransfer(transferParams);
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/relay'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(transferParams),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle transfer failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Insufficient balance' }),
      });

      await expect(api.submitTransfer({
        from: '0x',
        to: '0x',
        value: '0',
        validAfter: 0,
        validBefore: 0,
        nonce: '',
        v: 0,
        r: '',
        s: '',
      })).rejects.toThrow('Insufficient balance');
    });
  });

  describe('checkGasEligibility', () => {
    it('should check gas sponsorship eligibility', async () => {
      const mockResponse = {
        eligible: true,
        stats: {
          txCount: 3,
          txLimit: 10,
          remaining: 7,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await api.checkGasEligibility('0x123');
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/gas-sponsorship?address=0x123'),
        expect.any(Object)
      );
      expect(result.eligible).toBe(true);
      expect(result.stats.remaining).toBe(7);
    });

    it('should return ineligible when limit reached', async () => {
      const mockResponse = {
        eligible: false,
        stats: {
          txCount: 10,
          txLimit: 10,
          remaining: 0,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await api.checkGasEligibility('0x123');
      
      expect(result.eligible).toBe(false);
      expect(result.stats.remaining).toBe(0);
    });
  });

  describe('createShareLink', () => {
    it('should create a share link', async () => {
      const mockResponse = {
        link: { id: 'share_123' },
        shareUrl: 'https://example.com/share/abc123',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await api.createShareLink({
        creatorAddress: '0xcreator',
        type: 'payment',
        targetUrl: '/pay/123',
        targetData: { amount: 100 },
        channel: 'mobile',
      });
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/share-links'),
        expect.objectContaining({
          method: 'POST',
        })
      );
      expect(result.shareUrl).toContain('share');
    });
  });

  describe('error handling', () => {
    it('should handle HTTP error without JSON body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      await expect(api.getUserSettings('0x123')).rejects.toThrow('Request failed');
    });

    it('should handle HTTP error with status code', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () => Promise.resolve({}),
      });

      await expect(api.getUserSettings('0x123')).rejects.toThrow('HTTP 403');
    });
  });
});
