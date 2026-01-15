/**
 * Tests for AI Categorizer utility
 * 
 * SUB-010: Add unit tests for ai-categorizer.ts
 * - Test categorization with mocked OpenAI
 * - Test fallback behavior when OpenAI is unavailable
 * - Test cancellation email generation
 */

import type { Subscription } from '../../src/types';

// Store the original env
const originalEnv = process.env.OPENAI_API_KEY;

// Mock OpenAI module before importing
const mockCreate = jest.fn();
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  }));
});

// Import after mocking
import { categorizeWithAI, generateCancellationEmail } from '../../src/lib/ai-categorizer';

describe('AI Categorizer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set API key for tests
    process.env.OPENAI_API_KEY = 'test-api-key';
  });

  afterAll(() => {
    // Restore original env
    process.env.OPENAI_API_KEY = originalEnv;
  });

  describe('categorizeWithAI', () => {
    it('should return subscriptions with defaults when OpenAI API key is not set', async () => {
      // Remove API key to test fallback
      delete process.env.OPENAI_API_KEY;

      // Re-import to get new instance without API key
      jest.resetModules();
      const { categorizeWithAI: categorizeWithoutKey } = require('../../src/lib/ai-categorizer');

      const subscriptions = [
        createPartialSubscription('Netflix', 'netflix.com'),
        createPartialSubscription('Spotify', 'spotify.com'),
      ];

      const result = await categorizeWithoutKey(subscriptions);

      expect(result.length).toBe(2);
      expect(result[0].name).toBe('Netflix');
      expect(result[0].category).toBe('other'); // Default when no AI
    });

    it('should call OpenAI with correct prompt structure', async () => {
      // Reset modules to pick up the mocked OpenAI with API key
      jest.resetModules();
      process.env.OPENAI_API_KEY = 'test-api-key';
      
      // Re-import with mocks
      jest.mock('openai', () => {
        return jest.fn().mockImplementation(() => ({
          chat: {
            completions: {
              create: mockCreate,
            },
          },
        }));
      });
      const { categorizeWithAI: categorize } = require('../../src/lib/ai-categorizer');

      mockCreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              subscriptions: [
                { name: 'Netflix', category: 'streaming', estimatedCost: 15.49, confidence: 0.95 },
              ],
            }),
          },
        }],
      });

      const subscriptions = [createPartialSubscription('Netflix', 'netflix.com')];

      await categorize(subscriptions);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          temperature: 0.3,
        })
      );
    });

    it('should enhance subscriptions with AI categorization results', async () => {
      jest.resetModules();
      process.env.OPENAI_API_KEY = 'test-api-key';
      
      jest.mock('openai', () => {
        return jest.fn().mockImplementation(() => ({
          chat: {
            completions: {
              create: mockCreate,
            },
          },
        }));
      });
      const { categorizeWithAI: categorize } = require('../../src/lib/ai-categorizer');

      mockCreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              subscriptions: [
                { name: 'Netflix Premium', category: 'streaming', estimatedCost: 22.99, confidence: 0.9 },
                { name: 'Spotify Premium', category: 'streaming', estimatedCost: 10.99, confidence: 0.95 },
              ],
            }),
          },
        }],
      });

      const subscriptions = [
        createPartialSubscription('Netflix', 'netflix.com'),
        createPartialSubscription('Spotify', 'spotify.com'),
      ];

      const result = await categorize(subscriptions);

      expect(result[0].name).toBe('Netflix Premium');
      expect(result[0].category).toBe('streaming');
      expect(result[0].estimatedCost).toBe(22.99);
      expect(result[1].name).toBe('Spotify Premium');
    });

    it('should handle API errors gracefully and return defaults', async () => {
      jest.resetModules();
      process.env.OPENAI_API_KEY = 'test-api-key';
      
      jest.mock('openai', () => {
        return jest.fn().mockImplementation(() => ({
          chat: {
            completions: {
              create: mockCreate,
            },
          },
        }));
      });
      const { categorizeWithAI: categorize } = require('../../src/lib/ai-categorizer');

      mockCreate.mockRejectedValueOnce(new Error('API rate limit exceeded'));

      const subscriptions = [createPartialSubscription('Netflix', 'netflix.com')];

      const result = await categorize(subscriptions);

      // Should still return subscriptions with defaults on error
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Netflix');
      expect(result[0].category).toBe('other');
    });

    it('should handle empty response from AI', async () => {
      jest.resetModules();
      process.env.OPENAI_API_KEY = 'test-api-key';
      
      jest.mock('openai', () => {
        return jest.fn().mockImplementation(() => ({
          chat: {
            completions: {
              create: mockCreate,
            },
          },
        }));
      });
      const { categorizeWithAI: categorize } = require('../../src/lib/ai-categorizer');

      mockCreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: null,
          },
        }],
      });

      const subscriptions = [createPartialSubscription('Netflix', 'netflix.com')];

      const result = await categorize(subscriptions);

      expect(result.length).toBe(1);
      expect(result[0].category).toBe('other');
    });

    it('should preserve original subscription data when AI enhancement is partial', async () => {
      jest.resetModules();
      process.env.OPENAI_API_KEY = 'test-api-key';
      
      jest.mock('openai', () => {
        return jest.fn().mockImplementation(() => ({
          chat: {
            completions: {
              create: mockCreate,
            },
          },
        }));
      });
      const { categorizeWithAI: categorize } = require('../../src/lib/ai-categorizer');

      mockCreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              subscriptions: [
                { name: 'Netflix', category: 'streaming' }, // No cost or confidence
              ],
            }),
          },
        }],
      });

      const subscriptions = [
        { ...createPartialSubscription('Netflix', 'netflix.com'), estimatedCost: 15.49 },
      ];

      const result = await categorize(subscriptions);

      expect(result[0].estimatedCost).toBe(15.49); // Original cost preserved
      expect(result[0].category).toBe('streaming'); // AI category applied
    });
  });

  describe('generateCancellationEmail', () => {
    it('should generate a fallback email when OpenAI is not configured', async () => {
      delete process.env.OPENAI_API_KEY;
      
      jest.resetModules();
      const { generateCancellationEmail: generate } = require('../../src/lib/ai-categorizer');

      const subscription = createFullSubscription('Netflix', 'netflix.com', 'streaming', 15.49);

      const email = await generate(subscription);

      expect(email).toContain('Netflix');
      expect(email).toContain('cancel');
      expect(email.toLowerCase()).toContain('subscription');
    });

    it('should call OpenAI to generate personalized cancellation email', async () => {
      jest.resetModules();
      process.env.OPENAI_API_KEY = 'test-api-key';
      
      jest.mock('openai', () => {
        return jest.fn().mockImplementation(() => ({
          chat: {
            completions: {
              create: mockCreate,
            },
          },
        }));
      });
      const { generateCancellationEmail: generate } = require('../../src/lib/ai-categorizer');

      mockCreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: 'Dear Netflix Support,\n\nI would like to cancel my subscription immediately.\n\nThank you.',
          },
        }],
      });

      const subscription = createFullSubscription('Netflix', 'netflix.com', 'streaming', 15.49);

      const email = await generate(subscription);

      expect(email).toContain('Netflix');
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o-mini',
          temperature: 0.7,
        })
      );
    });

    it('should include proper request to cancel in the prompt', async () => {
      jest.resetModules();
      process.env.OPENAI_API_KEY = 'test-api-key';
      
      jest.mock('openai', () => {
        return jest.fn().mockImplementation(() => ({
          chat: {
            completions: {
              create: mockCreate,
            },
          },
        }));
      });
      const { generateCancellationEmail: generate } = require('../../src/lib/ai-categorizer');

      mockCreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: 'Cancellation email content',
          },
        }],
      });

      const subscription = createFullSubscription('Spotify', 'spotify.com', 'streaming', 10.99);

      await generate(subscription);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('Spotify'),
            }),
          ]),
        })
      );
    });

    it('should handle API errors in email generation', async () => {
      jest.resetModules();
      process.env.OPENAI_API_KEY = 'test-api-key';
      
      jest.mock('openai', () => {
        return jest.fn().mockImplementation(() => ({
          chat: {
            completions: {
              create: mockCreate,
            },
          },
        }));
      });
      const { generateCancellationEmail: generate } = require('../../src/lib/ai-categorizer');

      mockCreate.mockRejectedValueOnce(new Error('API error'));

      const subscription = createFullSubscription('Netflix', 'netflix.com', 'streaming', 15.49);

      // Should throw or return empty string based on implementation
      await expect(generate(subscription)).rejects.toThrow();
    });
  });
});

// Helper function to create partial subscription
function createPartialSubscription(name: string, sender: string): Partial<Subscription> {
  return {
    id: sender,
    name,
    sender,
    email: `noreply@${sender}`,
    emailCount: 5,
    frequency: 'monthly',
    category: 'other',
    lastSeen: new Date(),
    firstSeen: new Date(),
  };
}

// Helper function to create full subscription
function createFullSubscription(
  name: string,
  sender: string,
  category: Subscription['category'],
  estimatedCost: number
): Subscription {
  return {
    id: sender,
    name,
    sender,
    email: `noreply@${sender}`,
    emailCount: 5,
    frequency: 'monthly',
    category,
    estimatedCost,
    lastSeen: new Date(),
    firstSeen: new Date(),
    status: 'active',
  };
}
