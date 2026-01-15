/**
 * Tests for Cancel Subscription functionality
 * 
 * SUB-004: Implement subscription cancellation via email
 * Tests for cancellation email generation and tracking
 */

import type { Subscription } from '../../src/types';
import {
  generateCancellationEmailTemplate,
  trackCancellationAttempt,
  getCancellationStatus,
  getCancellationAttempts,
} from '../../src/lib/cancellation-email';

// Helper to create test subscription
function createTestSubscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: 'test-sub-1',
    name: 'Netflix',
    sender: 'netflix.com',
    email: 'support@netflix.com',
    estimatedCost: 15.49,
    frequency: 'monthly',
    category: 'streaming',
    lastSeen: new Date(),
    firstSeen: new Date(),
    emailCount: 5,
    status: 'active',
    ...overrides,
  };
}

describe('Cancel Subscription API Logic', () => {
  describe('Email Template Generation', () => {
    it('should generate email template with all required fields', async () => {
      const subscription = createTestSubscription();

      const template = await generateCancellationEmailTemplate(subscription);

      expect(template.to).toBe('support@netflix.com');
      expect(template.subject).toContain('Cancellation');
      expect(template.subject).toContain('Netflix');
      expect(template.body).toContain('Netflix');
    });

    it('should include cost information in email body', async () => {
      const subscription = createTestSubscription({
        estimatedCost: 15.49,
        frequency: 'monthly',
      });

      const template = await generateCancellationEmailTemplate(subscription);

      expect(template.body).toMatch(/\$15\.49|15.49 per month/);
    });

    it('should generate appropriate content for different categories', async () => {
      const streamingSub = createTestSubscription({ category: 'streaming' });
      const softwareSub = createTestSubscription({ category: 'software', name: 'Adobe' });
      const fitnessSub = createTestSubscription({ category: 'fitness', name: 'Peloton' });

      const streamingTemplate = await generateCancellationEmailTemplate(streamingSub);
      const softwareTemplate = await generateCancellationEmailTemplate(softwareSub);
      const fitnessTemplate = await generateCancellationEmailTemplate(fitnessSub);

      expect(streamingTemplate.body.toLowerCase()).toContain('content');
      expect(softwareTemplate.body.toLowerCase()).toContain('software');
      expect(fitnessTemplate.body.toLowerCase()).toMatch(/fitness|motivation/);
    });

    it('should request cancellation confirmation', async () => {
      const subscription = createTestSubscription();

      const template = await generateCancellationEmailTemplate(subscription);

      expect(template.body.toLowerCase()).toContain('confirm');
    });

    it('should be polite and professional', async () => {
      const subscription = createTestSubscription();

      const template = await generateCancellationEmailTemplate(subscription);

      expect(template.body.toLowerCase()).toMatch(/thank you|please|appreciate/);
      expect(template.body).toMatch(/Dear|Best regards/);
    });
  });

  describe('Cancellation Tracking', () => {
    const validWalletAddress = '0x1234567890123456789012345678901234567890';

    it('should track new cancellation attempt', async () => {
      const subscription = createTestSubscription({ id: 'track-test-1' });

      const attempt = await trackCancellationAttempt(
        validWalletAddress,
        subscription,
        'email_sent'
      );

      expect(attempt).toBeDefined();
      expect(attempt.subscriptionId).toBe('track-test-1');
      expect(attempt.subscriptionName).toBe('Netflix');
      expect(attempt.status).toBe('email_sent');
      expect(attempt.walletAddress).toBe(validWalletAddress.toLowerCase());
    });

    it('should track different statuses', async () => {
      const walletAddress = '0x2234567890123456789012345678901234567890';

      const pendingSub = createTestSubscription({ id: 'pending-sub' });
      const copiedSub = createTestSubscription({ id: 'copied-sub' });
      const sentSub = createTestSubscription({ id: 'sent-sub' });

      const pendingAttempt = await trackCancellationAttempt(walletAddress, pendingSub, 'pending');
      const copiedAttempt = await trackCancellationAttempt(walletAddress, copiedSub, 'copied');
      const sentAttempt = await trackCancellationAttempt(walletAddress, sentSub, 'email_sent');

      expect(pendingAttempt.status).toBe('pending');
      expect(copiedAttempt.status).toBe('copied');
      expect(sentAttempt.status).toBe('email_sent');
    });

    it('should update existing attempt status', async () => {
      const walletAddress = '0x3234567890123456789012345678901234567890';
      const subscription = createTestSubscription({ id: 'update-test' });

      // First create pending
      const pendingAttempt = await trackCancellationAttempt(walletAddress, subscription, 'pending');
      const originalId = pendingAttempt.id;

      // Update to sent
      const sentAttempt = await trackCancellationAttempt(walletAddress, subscription, 'email_sent');

      expect(sentAttempt.id).toBe(originalId);
      expect(sentAttempt.status).toBe('email_sent');
    });

    it('should reject invalid wallet addresses', async () => {
      const subscription = createTestSubscription();

      await expect(
        trackCancellationAttempt('invalid-address', subscription, 'pending')
      ).rejects.toThrow('Invalid wallet address');
    });

    it('should normalize wallet addresses to lowercase', async () => {
      const subscription = createTestSubscription({ id: 'case-test' });
      const mixedCaseAddress = '0xABCD567890123456789012345678901234567890';

      const attempt = await trackCancellationAttempt(mixedCaseAddress, subscription, 'pending');

      expect(attempt.walletAddress).toBe('0xabcd567890123456789012345678901234567890');
    });
  });

  describe('Cancellation Status Retrieval', () => {
    it('should retrieve status for existing cancellation', async () => {
      const walletAddress = '0x4234567890123456789012345678901234567890';
      const subscription = createTestSubscription({ id: 'status-test' });

      // Create attempt
      await trackCancellationAttempt(walletAddress, subscription, 'email_sent');

      // Retrieve status
      const status = await getCancellationStatus(walletAddress, 'status-test');

      expect(status).not.toBeNull();
      expect(status?.subscriptionId).toBe('status-test');
      expect(status?.status).toBe('email_sent');
    });

    it('should return null for non-existent cancellation', async () => {
      const walletAddress = '0x5234567890123456789012345678901234567890';

      const status = await getCancellationStatus(walletAddress, 'non-existent');

      expect(status).toBeNull();
    });

    it('should get all attempts for a wallet', async () => {
      const walletAddress = '0x6234567890123456789012345678901234567890';
      const sub1 = createTestSubscription({ id: 'all-test-1' });
      const sub2 = createTestSubscription({ id: 'all-test-2', name: 'Spotify' });

      await trackCancellationAttempt(walletAddress, sub1, 'email_sent');
      await trackCancellationAttempt(walletAddress, sub2, 'copied');

      const attempts = await getCancellationAttempts(walletAddress);

      expect(attempts.length).toBeGreaterThanOrEqual(2);
      expect(attempts.some(a => a.subscriptionId === 'all-test-1')).toBe(true);
      expect(attempts.some(a => a.subscriptionId === 'all-test-2')).toBe(true);
    });

    it('should return attempts sorted by most recent first', async () => {
      const walletAddress = '0x7234567890123456789012345678901234567890';
      const sub1 = createTestSubscription({ id: 'sort-test-1' });
      const sub2 = createTestSubscription({ id: 'sort-test-2' });

      await trackCancellationAttempt(walletAddress, sub1, 'pending');
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      await trackCancellationAttempt(walletAddress, sub2, 'email_sent');

      const attempts = await getCancellationAttempts(walletAddress);
      const sortTestAttempts = attempts.filter(a => a.subscriptionId.startsWith('sort-test'));

      expect(sortTestAttempts.length).toBe(2);
      // Most recent should be first
      expect(sortTestAttempts[0].subscriptionId).toBe('sort-test-2');
    });
  });
});
