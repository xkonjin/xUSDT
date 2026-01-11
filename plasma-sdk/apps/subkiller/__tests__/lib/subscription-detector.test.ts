/**
 * Tests for Subscription Detector utility
 * 
 * SUB-009: Add unit tests for subscription-detector.ts
 * - Test pattern matching for sender domains
 * - Test sender name extraction
 * - Test email grouping by sender
 * - Test subscription detection from emails
 * - Test frequency calculation
 * - Test cost estimation
 */

import {
  extractSenderDomain,
  extractSenderName,
  groupEmailsBySender,
  detectSubscriptions,
  calculateTotals,
} from '../../src/lib/subscription-detector';
import type { GmailMessage, Subscription } from '../../src/types';

describe('Subscription Detector', () => {
  describe('extractSenderDomain', () => {
    it('should extract domain from standard email format', () => {
      const result = extractSenderDomain('Netflix <noreply@netflix.com>');
      expect(result).toBe('netflix.com');
    });

    it('should extract domain from plain email address', () => {
      const result = extractSenderDomain('noreply@spotify.com');
      expect(result).toBe('spotify.com');
    });

    it('should handle quoted sender names', () => {
      const result = extractSenderDomain('"Spotify Support" <support@spotify.com>');
      expect(result).toBe('spotify.com');
    });

    it('should return input when no valid email found', () => {
      const result = extractSenderDomain('invalid-email-format');
      expect(result).toBe('invalid-email-format');
    });

    it('should handle subdomains', () => {
      const result = extractSenderDomain('Amazon <email@notifications.amazon.com>');
      expect(result).toBe('notifications.amazon.com');
    });
  });

  describe('extractSenderName', () => {
    it('should extract name from standard email format', () => {
      const result = extractSenderName('Netflix <noreply@netflix.com>');
      expect(result).toBe('Netflix');
    });

    it('should remove quotes from name', () => {
      const result = extractSenderName('"Spotify Support" <support@spotify.com>');
      expect(result).toBe('Spotify Support');
    });

    it('should extract domain first part when no name present', () => {
      const result = extractSenderName('noreply@hulu.com');
      expect(result).toBe('hulu');
    });

    it('should handle empty strings gracefully', () => {
      const result = extractSenderName('');
      expect(result).toBeDefined();
    });
  });

  describe('groupEmailsBySender', () => {
    it('should group emails by sender domain', () => {
      const messages: GmailMessage[] = [
        createMockEmail('Netflix <noreply@netflix.com>', 'Your receipt'),
        createMockEmail('Netflix <billing@netflix.com>', 'Payment processed'),
        createMockEmail('Spotify <noreply@spotify.com>', 'Your weekly discovery'),
      ];

      const groups = groupEmailsBySender(messages);

      expect(groups.size).toBe(2);
      expect(groups.get('netflix.com')?.length).toBe(2);
      expect(groups.get('spotify.com')?.length).toBe(1);
    });

    it('should handle empty message list', () => {
      const groups = groupEmailsBySender([]);
      expect(groups.size).toBe(0);
    });

    it('should handle single sender', () => {
      const messages: GmailMessage[] = [
        createMockEmail('Netflix <noreply@netflix.com>', 'Email 1'),
        createMockEmail('Netflix <noreply@netflix.com>', 'Email 2'),
      ];

      const groups = groupEmailsBySender(messages);
      expect(groups.size).toBe(1);
      expect(groups.get('netflix.com')?.length).toBe(2);
    });
  });

  describe('detectSubscriptions', () => {
    it('should detect subscriptions with 2+ emails from same sender', () => {
      const messages: GmailMessage[] = [
        createMockEmail('Netflix <noreply@netflix.com>', 'Receipt 1', new Date('2024-01-01')),
        createMockEmail('Netflix <noreply@netflix.com>', 'Receipt 2', new Date('2024-02-01')),
      ];

      const subscriptions = detectSubscriptions(messages);

      expect(subscriptions.length).toBe(1);
      expect(subscriptions[0].name).toBe('Netflix');
    });

    it('should not detect subscription with only 1 email', () => {
      const messages: GmailMessage[] = [
        createMockEmail('Netflix <noreply@netflix.com>', 'Single email'),
      ];

      const subscriptions = detectSubscriptions(messages);
      expect(subscriptions.length).toBe(0);
    });

    it('should use known service data for recognized services', () => {
      const messages: GmailMessage[] = [
        createMockEmail('Netflix <noreply@netflix.com>', 'Receipt 1', new Date('2024-01-01')),
        createMockEmail('Netflix <noreply@netflix.com>', 'Receipt 2', new Date('2024-02-01')),
      ];

      const subscriptions = detectSubscriptions(messages);

      expect(subscriptions[0].estimatedCost).toBe(15.49); // Known Netflix price
      expect(subscriptions[0].category).toBe('streaming');
    });

    it('should extract unsubscribe URL from List-Unsubscribe header', () => {
      const messages: GmailMessage[] = [
        { 
          ...createMockEmail('Spotify <noreply@spotify.com>', 'Email 1'),
          listUnsubscribe: '<https://spotify.com/unsubscribe?id=123>',
        },
        { 
          ...createMockEmail('Spotify <noreply@spotify.com>', 'Email 2'),
          listUnsubscribe: '<https://spotify.com/unsubscribe?id=456>',
        },
      ];

      const subscriptions = detectSubscriptions(messages);
      expect(subscriptions[0].unsubscribeUrl).toBe('https://spotify.com/unsubscribe?id=123');
    });

    it('should sort subscriptions by estimated cost (highest first)', () => {
      const messages: GmailMessage[] = [
        createMockEmail('Spotify <noreply@spotify.com>', 'Email 1'),
        createMockEmail('Spotify <noreply@spotify.com>', 'Email 2'),
        createMockEmail('Adobe <noreply@adobe.com>', 'Email 1'),
        createMockEmail('Adobe <noreply@adobe.com>', 'Email 2'),
      ];

      const subscriptions = detectSubscriptions(messages);

      expect(subscriptions[0].name).toBe('Adobe Creative Cloud'); // $54.99/mo
      expect(subscriptions[1].name).toBe('Spotify'); // $10.99/mo
    });

    it('should detect multiple subscriptions from different services', () => {
      const messages: GmailMessage[] = [
        createMockEmail('Netflix <noreply@netflix.com>', 'Receipt 1'),
        createMockEmail('Netflix <noreply@netflix.com>', 'Receipt 2'),
        createMockEmail('Spotify <noreply@spotify.com>', 'Weekly discovery'),
        createMockEmail('Spotify <noreply@spotify.com>', 'Your wrapped'),
        createMockEmail('Hulu <noreply@hulu.com>', 'New shows'),
        createMockEmail('Hulu <noreply@hulu.com>', 'Billing'),
      ];

      const subscriptions = detectSubscriptions(messages);
      expect(subscriptions.length).toBe(3);
    });

    it('should calculate frequency based on email intervals', () => {
      // Weekly emails (7 day intervals)
      const weeklyMessages: GmailMessage[] = [
        createMockEmail('Weekly <noreply@weekly.com>', 'Week 1', new Date('2024-01-01')),
        createMockEmail('Weekly <noreply@weekly.com>', 'Week 2', new Date('2024-01-08')),
        createMockEmail('Weekly <noreply@weekly.com>', 'Week 3', new Date('2024-01-15')),
      ];

      const weeklySubs = detectSubscriptions(weeklyMessages);
      expect(weeklySubs[0].frequency).toBe('weekly');

      // Monthly emails (30 day intervals)
      const monthlyMessages: GmailMessage[] = [
        createMockEmail('Monthly <noreply@monthly.com>', 'Month 1', new Date('2024-01-01')),
        createMockEmail('Monthly <noreply@monthly.com>', 'Month 2', new Date('2024-02-01')),
        createMockEmail('Monthly <noreply@monthly.com>', 'Month 3', new Date('2024-03-01')),
      ];

      const monthlySubs = detectSubscriptions(monthlyMessages);
      expect(monthlySubs[0].frequency).toBe('monthly');

      // Yearly emails (365 day intervals)
      const yearlyMessages: GmailMessage[] = [
        createMockEmail('Yearly <noreply@yearly.com>', 'Year 1', new Date('2022-01-01')),
        createMockEmail('Yearly <noreply@yearly.com>', 'Year 2', new Date('2023-01-01')),
        createMockEmail('Yearly <noreply@yearly.com>', 'Year 3', new Date('2024-01-01')),
      ];

      const yearlySubs = detectSubscriptions(yearlyMessages);
      expect(yearlySubs[0].frequency).toBe('yearly');
    });
  });

  describe('calculateTotals', () => {
    it('should calculate monthly and yearly totals for monthly subscriptions', () => {
      const subscriptions: Partial<Subscription>[] = [
        { estimatedCost: 15.49, frequency: 'monthly' },
        { estimatedCost: 10.99, frequency: 'monthly' },
      ];

      const totals = calculateTotals(subscriptions);

      expect(totals.monthly).toBe(26.48);
      expect(totals.yearly).toBe(317.76);
    });

    it('should handle yearly subscription costs', () => {
      const subscriptions: Partial<Subscription>[] = [
        { estimatedCost: 120, frequency: 'yearly' },
      ];

      const totals = calculateTotals(subscriptions);

      expect(totals.monthly).toBe(10); // 120/12
      expect(totals.yearly).toBe(120);
    });

    it('should handle weekly subscription costs', () => {
      const subscriptions: Partial<Subscription>[] = [
        { estimatedCost: 5, frequency: 'weekly' },
      ];

      const totals = calculateTotals(subscriptions);

      expect(totals.monthly).toBe(20); // 5*4
      expect(totals.yearly).toBe(260); // 5*52
    });

    it('should handle mixed frequency subscriptions', () => {
      const subscriptions: Partial<Subscription>[] = [
        { estimatedCost: 10, frequency: 'monthly' }, // 10/mo, 120/yr
        { estimatedCost: 120, frequency: 'yearly' }, // 10/mo, 120/yr
        { estimatedCost: 5, frequency: 'weekly' }, // 20/mo, 260/yr
      ];

      const totals = calculateTotals(subscriptions);

      expect(totals.monthly).toBe(40);
      expect(totals.yearly).toBe(500);
    });

    it('should treat unknown frequency as monthly', () => {
      const subscriptions: Partial<Subscription>[] = [
        { estimatedCost: 10, frequency: 'unknown' },
      ];

      const totals = calculateTotals(subscriptions);

      expect(totals.monthly).toBe(10);
      expect(totals.yearly).toBe(120);
    });

    it('should handle empty subscription list', () => {
      const totals = calculateTotals([]);

      expect(totals.monthly).toBe(0);
      expect(totals.yearly).toBe(0);
    });

    it('should handle subscriptions with no cost', () => {
      const subscriptions: Partial<Subscription>[] = [
        { estimatedCost: 0, frequency: 'monthly' },
        { frequency: 'monthly' }, // no estimatedCost
      ];

      const totals = calculateTotals(subscriptions);

      expect(totals.monthly).toBe(0);
      expect(totals.yearly).toBe(0);
    });
  });
});

// Helper function to create mock GmailMessage
function createMockEmail(
  from: string,
  subject: string,
  date: Date = new Date()
): GmailMessage {
  return {
    id: `msg-${Math.random().toString(36).substr(2, 9)}`,
    threadId: `thread-${Math.random().toString(36).substr(2, 9)}`,
    from,
    subject,
    date,
    snippet: `Snippet for ${subject}`,
  };
}
