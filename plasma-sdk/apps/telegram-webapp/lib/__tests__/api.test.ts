/**
 * Tests for Telegram WebApp API Client
 *
 * Tests the API client functions for interacting with Plasma Pay backend.
 */

import api from '../api';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('TelegramAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserSettings', () => {
    it('should fetch user settings for an address', async () => {
      const mockSettings = {
        settings: {
          referralCode: 'ABC123',
          displayName: 'John Doe',
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

      await api.createReferral('0xreferrer', '0xreferee');
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/referrals'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            referrerAddress: '0xreferrer',
            refereeAddress: '0xreferee',
            source: 'telegram',
          }),
        })
      );
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

  describe('resolveRecipient', () => {
    it('should resolve an identifier to an address', async () => {
      const mockResponse = {
        address: '0xresolved',
        type: 'ens',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await api.resolveRecipient('vitalik.eth');
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/resolve-recipient'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ identifier: 'vitalik.eth' }),
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('createPaymentRequest', () => {
    it('should create a payment request', async () => {
      const mockRequest = {
        request: {
          id: 'req_123',
          fromAddress: '0xrequester',
          toIdentifier: '0xpayer',
          amount: 100,
          memo: 'Lunch',
          status: 'pending',
          expiresAt: new Date().toISOString(),
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRequest),
      });

      const result = await api.createPaymentRequest({
        fromAddress: '0xrequester',
        toIdentifier: '0xpayer',
        amount: 100,
        memo: 'Lunch',
      });
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/requests'),
        expect.objectContaining({
          method: 'POST',
        })
      );
      expect(result).toEqual(mockRequest);
    });
  });

  describe('getPaymentRequests', () => {
    it('should fetch payment requests for an address', async () => {
      const mockRequests = {
        requests: [
          { id: 'req_1', amount: 50 },
          { id: 'req_2', amount: 100 },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRequests),
      });

      const result = await api.getPaymentRequests('0x123');
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/requests?address=0x123'),
        expect.any(Object)
      );
      expect(result.requests).toHaveLength(2);
    });
  });

  describe('getStreams', () => {
    it('should fetch sending streams', async () => {
      const mockStreams = {
        streams: [
          {
            id: 'stream_1',
            sender: '0xsender',
            recipient: '0xrecipient',
            depositAmount: '1000',
            withdrawnAmount: '200',
            startTime: 1000,
            endTime: 2000,
            active: true,
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStreams),
      });

      const result = await api.getStreams('0xsender', 'sending');
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/streams?address=0xsender&role=sending'),
        expect.any(Object)
      );
      expect(result.streams).toHaveLength(1);
      expect(result.streams[0].active).toBe(true);
    });

    it('should fetch receiving streams', async () => {
      const mockStreams = { streams: [] };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStreams),
      });

      await api.getStreams('0xrecipient', 'receiving');
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('role=receiving'),
        expect.any(Object)
      );
    });
  });

  describe('withdrawFromStream', () => {
    it('should withdraw from a stream', async () => {
      const mockResponse = {
        txHash: '0xwithdraw123',
        amount: '500',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await api.withdrawFromStream('stream_1', '0xrecipient');
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/streams/withdraw'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            streamId: 'stream_1',
            recipientAddress: '0xrecipient',
          }),
        })
      );
      expect(result.txHash).toBe('0xwithdraw123');
    });
  });

  describe('getTransactions', () => {
    it('should fetch transaction history', async () => {
      const mockTransactions = {
        transactions: [
          { id: 'tx_1', amount: '100', type: 'sent' },
          { id: 'tx_2', amount: '50', type: 'received' },
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
    });
  });

  describe('getBalance', () => {
    it('should return default balance', async () => {
      const result = await api.getBalance('0x123');
      
      expect(result).toEqual({
        balance: '0',
        formatted: '0.00',
      });
    });
  });

  describe('createShareLink', () => {
    it('should create a share link', async () => {
      const mockResponse = {
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
        channel: 'telegram',
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
