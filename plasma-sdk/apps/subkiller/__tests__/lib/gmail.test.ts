/**
 * Tests for Gmail API Integration
 * 
 * Tests the Gmail email fetching functionality with mocked Google APIs.
 * - Test email fetching with subscription patterns
 * - Test message parsing and header extraction
 * - Test subscription keyword filtering
 * - Test batch fetching of messages
 */

// Create mocks at module level - these will be shared across tests
let mockList: jest.Mock;
let mockGet: jest.Mock;
let mockSetCredentials: jest.Mock;

// Mock googleapis before any imports
jest.mock('googleapis', () => {
  // Create mock functions inside the factory
  const list = jest.fn();
  const get = jest.fn();
  const setCredentials = jest.fn();
  
  return {
    google: {
      gmail: () => ({
        users: {
          messages: {
            list,
            get,
          },
        },
      }),
      auth: {
        OAuth2: jest.fn().mockImplementation(() => ({
          setCredentials,
        })),
      },
    },
    // Expose mocks for test access
    __getMocks: () => ({ list, get, setCredentials }),
  };
});

// Get mocks after module loads
const { __getMocks } = require('googleapis');

// Import after mocking
import { fetchSubscriptionEmails } from '../../src/lib/gmail';

describe('Gmail API Integration', () => {
  beforeAll(() => {
    // Get references to the mocks
    const mocks = __getMocks();
    mockList = mocks.list;
    mockGet = mocks.get;
    mockSetCredentials = mocks.setCredentials;
  });

  beforeEach(() => {
    mockList.mockReset();
    mockGet.mockReset();
    mockSetCredentials.mockReset();
  });

  describe('fetchSubscriptionEmails', () => {
    it('should set credentials with the access token', async () => {
      mockList.mockResolvedValueOnce({
        data: { messages: [] },
      });

      await fetchSubscriptionEmails('test-access-token', 10);

      expect(mockSetCredentials).toHaveBeenCalledWith({
        access_token: 'test-access-token',
      });
    });

    it('should search for subscription-related emails', async () => {
      mockList.mockResolvedValueOnce({
        data: { messages: [] },
      });

      await fetchSubscriptionEmails('test-token', 100);

      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'me',
          maxResults: 100,
          q: expect.stringMatching(/subject:/),
        })
      );
    });

    it('should fetch message details for each message ID', async () => {
      mockList.mockResolvedValueOnce({
        data: {
          messages: [
            { id: 'msg-1' },
            { id: 'msg-2' },
          ],
        },
      });

      mockGet.mockImplementation(({ id }: { id: string }) => 
        Promise.resolve({
          data: createMockGmailMessage(id, 'Netflix <noreply@netflix.com>', 'Your receipt'),
        })
      );

      const messages = await fetchSubscriptionEmails('test-token', 10);

      expect(mockGet).toHaveBeenCalledTimes(2);
      expect(mockGet).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'me',
          id: 'msg-1',
          format: 'metadata',
        })
      );
    });

    it('should extract email headers correctly', async () => {
      mockList.mockResolvedValueOnce({
        data: {
          messages: [{ id: 'msg-1' }],
        },
      });

      mockGet.mockResolvedValueOnce({
        data: createMockGmailMessage(
          'msg-1',
          'Netflix <noreply@netflix.com>',
          'Your subscription receipt',
          '<https://netflix.com/unsubscribe>'
        ),
      });

      const messages = await fetchSubscriptionEmails('test-token', 10);

      expect(messages.length).toBe(1);
      expect(messages[0].from).toBe('Netflix <noreply@netflix.com>');
      expect(messages[0].subject).toBe('Your subscription receipt');
      expect(messages[0].listUnsubscribe).toBe('<https://netflix.com/unsubscribe>');
    });

    it('should filter emails based on subscription patterns', async () => {
      mockList.mockResolvedValueOnce({
        data: {
          messages: [
            { id: 'sub-email' },
            { id: 'non-sub-email' },
          ],
        },
      });

      // First message - matches subscription pattern
      mockGet
        .mockResolvedValueOnce({
          data: createMockGmailMessage(
            'sub-email',
            'Netflix <noreply@netflix.com>',
            'Your subscription renewal'
          ),
        })
        // Second message - doesn't match
        .mockResolvedValueOnce({
          data: createMockGmailMessage(
            'non-sub-email',
            'John <john@personal.com>',
            'Hey friend!'
          ),
        });

      const messages = await fetchSubscriptionEmails('test-token', 10);

      // Only subscription email should be returned
      expect(messages.length).toBe(1);
      expect(messages[0].from).toBe('Netflix <noreply@netflix.com>');
    });

    it('should detect subscription by sender patterns (noreply, billing, etc.)', async () => {
      mockList.mockResolvedValueOnce({
        data: {
          messages: [{ id: 'msg-1' }, { id: 'msg-2' }, { id: 'msg-3' }],
        },
      });

      mockGet
        .mockResolvedValueOnce({
          data: createMockGmailMessage('msg-1', 'noreply@company.com', 'Update'),
        })
        .mockResolvedValueOnce({
          data: createMockGmailMessage('msg-2', 'billing@service.com', 'Invoice'),
        })
        .mockResolvedValueOnce({
          data: createMockGmailMessage('msg-3', 'notifications@app.com', 'Alert'),
        });

      const messages = await fetchSubscriptionEmails('test-token', 10);

      expect(messages.length).toBe(3);
    });

    it('should detect subscription by subject keywords (receipt, invoice, etc.)', async () => {
      mockList.mockResolvedValueOnce({
        data: {
          messages: [{ id: 'msg-1' }, { id: 'msg-2' }],
        },
      });

      mockGet
        .mockResolvedValueOnce({
          data: createMockGmailMessage('msg-1', 'sales@company.com', 'Your payment receipt'),
        })
        .mockResolvedValueOnce({
          data: createMockGmailMessage('msg-2', 'team@service.com', 'Monthly subscription renewal'),
        });

      const messages = await fetchSubscriptionEmails('test-token', 10);

      expect(messages.length).toBe(2);
    });

    it('should handle empty message list', async () => {
      mockList.mockResolvedValueOnce({
        data: { messages: [] },
      });

      const messages = await fetchSubscriptionEmails('test-token', 10);

      expect(messages).toEqual([]);
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('should handle null/undefined message list', async () => {
      mockList.mockResolvedValueOnce({
        data: { messages: null },
      });

      const messages = await fetchSubscriptionEmails('test-token', 10);

      expect(messages).toEqual([]);
    });

    it('should respect maxResults parameter', async () => {
      mockList.mockResolvedValueOnce({
        data: { messages: [] },
      });

      await fetchSubscriptionEmails('test-token', 250);

      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({
          maxResults: 250,
        })
      );
    });

    it('should parse date header correctly', async () => {
      mockList.mockResolvedValueOnce({
        data: { messages: [{ id: 'msg-1' }] },
      });

      mockGet.mockResolvedValueOnce({
        data: {
          id: 'msg-1',
          threadId: 'thread-1',
          snippet: 'Email snippet',
          payload: {
            headers: [
              { name: 'From', value: 'noreply@test.com' },
              { name: 'Subject', value: 'Test subscription' },
              { name: 'Date', value: 'Wed, 15 Jan 2025 10:00:00 GMT' },
            ],
          },
        },
      });

      const messages = await fetchSubscriptionEmails('test-token', 10);

      expect(messages.length).toBe(1);
      expect(messages[0].date instanceof Date).toBe(true);
    });

    it('should extract snippet from message', async () => {
      mockList.mockResolvedValueOnce({
        data: { messages: [{ id: 'msg-1' }] },
      });

      mockGet.mockResolvedValueOnce({
        data: createMockGmailMessage(
          'msg-1',
          'noreply@company.com',
          'Your receipt',
          undefined,
          'Your payment of $9.99 has been processed...'
        ),
      });

      const messages = await fetchSubscriptionEmails('test-token', 10);

      expect(messages[0].snippet).toBe('Your payment of $9.99 has been processed...');
    });

    it('should process messages in batches', async () => {
      // Create 100 message IDs to test batch processing
      const messageIds = Array.from({ length: 100 }, (_, i) => ({ id: `msg-${i}` }));

      mockList.mockResolvedValueOnce({
        data: { messages: messageIds },
      });

      mockGet.mockImplementation(({ id }: { id: string }) =>
        Promise.resolve({
          data: createMockGmailMessage(id, 'noreply@test.com', 'Subscription email'),
        })
      );

      const messages = await fetchSubscriptionEmails('test-token', 500);

      expect(messages.length).toBe(100);
      expect(mockGet).toHaveBeenCalledTimes(100);
    });
  });
});

// Helper function to create mock Gmail API response
function createMockGmailMessage(
  id: string,
  from: string,
  subject: string,
  listUnsubscribe?: string,
  snippet: string = 'Email snippet...'
) {
  const headers = [
    { name: 'From', value: from },
    { name: 'Subject', value: subject },
    { name: 'Date', value: new Date().toUTCString() },
  ];

  if (listUnsubscribe) {
    headers.push({ name: 'List-Unsubscribe', value: listUnsubscribe });
  }

  return {
    id,
    threadId: `thread-${id}`,
    snippet,
    payload: { headers },
  };
}
