/**
 * Tests for Cancellation Email Templates
 * 
 * SUB-004: Implement subscription cancellation via email
 * - Test email template generation based on service type
 * - Test cancellation tracking functionality
 * - Test template customization
 */

import type { Subscription } from '../../src/types';

// Helper function to create a subscription for testing
function createTestSubscription(
  overrides: Partial<Subscription> = {}
): Subscription {
  return {
    id: 'test-id',
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

describe('Cancellation Email Templates', () => {
  // Dynamic import to allow tests to run before implementation
  let generateCancellationEmailTemplate: any;
  let getCancellationSupportEmail: any;
  let trackCancellationAttempt: any;
  let getCancellationStatus: any;

  beforeAll(async () => {
    try {
      const module = await import('../../src/lib/cancellation-email');
      generateCancellationEmailTemplate = module.generateCancellationEmailTemplate;
      getCancellationSupportEmail = module.getCancellationSupportEmail;
      trackCancellationAttempt = module.trackCancellationAttempt;
      getCancellationStatus = module.getCancellationStatus;
    } catch (e) {
      // Module doesn't exist yet - tests will fail and guide implementation
    }
  });

  describe('generateCancellationEmailTemplate', () => {
    it('should generate a professional cancellation email for streaming services', async () => {
      const subscription = createTestSubscription({
        name: 'Netflix',
        category: 'streaming',
        email: 'support@netflix.com',
      });

      const template = await generateCancellationEmailTemplate(subscription);

      expect(template).toBeDefined();
      expect(template.subject).toContain('Cancellation');
      expect(template.body).toContain('Netflix');
      expect(template.body).toContain('cancel');
      expect(template.to).toBe('support@netflix.com');
    });

    it('should generate appropriate email for software subscriptions', async () => {
      const subscription = createTestSubscription({
        name: 'Adobe Creative Cloud',
        category: 'software',
        email: 'support@adobe.com',
      });

      const template = await generateCancellationEmailTemplate(subscription);

      expect(template.subject).toContain('Cancellation');
      expect(template.body).toContain('Adobe Creative Cloud');
    });

    it('should generate appropriate email for fitness subscriptions', async () => {
      const subscription = createTestSubscription({
        name: 'Peloton',
        category: 'fitness',
        email: 'support@peloton.com',
      });

      const template = await generateCancellationEmailTemplate(subscription);

      expect(template.body).toContain('Peloton');
      expect(template.to).toBe('support@peloton.com');
    });

    it('should include estimated cost in email for transparency', async () => {
      const subscription = createTestSubscription({
        name: 'Spotify',
        estimatedCost: 10.99,
      });

      const template = await generateCancellationEmailTemplate(subscription);

      expect(template.body).toMatch(/\$10\.99|\$10.99 per month|monthly/i);
    });

    it('should request confirmation of cancellation', async () => {
      const subscription = createTestSubscription();

      const template = await generateCancellationEmailTemplate(subscription);

      expect(template.body.toLowerCase()).toContain('confirm');
    });

    it('should be polite but firm in cancellation request', async () => {
      const subscription = createTestSubscription();

      const template = await generateCancellationEmailTemplate(subscription);

      expect(template.body.toLowerCase()).toMatch(/please|thank you|appreciate/);
      expect(template.body.toLowerCase()).toContain('cancel');
    });

    it('should include account-related info request', async () => {
      const subscription = createTestSubscription();

      const template = await generateCancellationEmailTemplate(subscription);

      // Should mention they might need to provide account details
      expect(template.body.toLowerCase()).toMatch(/account|subscription|member/);
    });

    it('should handle subscriptions without email gracefully', async () => {
      const subscription = createTestSubscription({
        email: '',
      });

      const template = await generateCancellationEmailTemplate(subscription);

      expect(template).toBeDefined();
      // Should fallback to support email lookup when no email provided
      expect(template.to).toContain('@');
      expect(template.body).toBeTruthy();
    });
  });

  describe('getCancellationSupportEmail', () => {
    it('should return known support email for recognized services', async () => {
      const email = getCancellationSupportEmail('netflix.com');
      expect(email).toBeDefined();
      expect(email).toContain('@');
    });

    it('should return generic support email pattern for unknown services', async () => {
      const email = getCancellationSupportEmail('unknown-service.com');
      expect(email).toBe('support@unknown-service.com');
    });

    it('should handle subdomains correctly', async () => {
      const email = getCancellationSupportEmail('email.spotify.com');
      // Should still recognize it as Spotify
      expect(email).toContain('spotify');
    });
  });

  describe('trackCancellationAttempt', () => {
    it('should track a new cancellation attempt', async () => {
      const subscription = createTestSubscription();
      const walletAddress = '0x1234567890123456789012345678901234567890';

      const result = await trackCancellationAttempt(walletAddress, subscription, 'email_sent');

      expect(result).toBeDefined();
      expect(result.subscriptionId).toBe(subscription.id);
      expect(result.status).toBe('email_sent');
    });

    it('should update status to pending after email preview', async () => {
      const subscription = createTestSubscription();
      const walletAddress = '0x1234567890123456789012345678901234567890';

      const result = await trackCancellationAttempt(walletAddress, subscription, 'pending');

      expect(result.status).toBe('pending');
    });

    it('should track copy-to-clipboard action', async () => {
      const subscription = createTestSubscription();
      const walletAddress = '0x1234567890123456789012345678901234567890';

      const result = await trackCancellationAttempt(walletAddress, subscription, 'copied');

      expect(result.status).toBe('copied');
    });

    it('should validate wallet address format', async () => {
      const subscription = createTestSubscription();
      const invalidAddress = 'not-a-wallet';

      await expect(
        trackCancellationAttempt(invalidAddress, subscription, 'email_sent')
      ).rejects.toThrow();
    });
  });

  describe('getCancellationStatus', () => {
    it('should return cancellation status for a subscription', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';
      const subscriptionId = 'test-id';

      const status = await getCancellationStatus(walletAddress, subscriptionId);

      // Should return null or status object
      expect(status === null || typeof status === 'object').toBe(true);
    });

    it('should return null for non-tracked subscriptions', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';
      const nonExistentId = 'non-existent-id';

      const status = await getCancellationStatus(walletAddress, nonExistentId);

      expect(status).toBeNull();
    });
  });
});

describe('Email Template Structure', () => {
  let generateCancellationEmailTemplate: any;

  beforeAll(async () => {
    try {
      const module = await import('../../src/lib/cancellation-email');
      generateCancellationEmailTemplate = module.generateCancellationEmailTemplate;
    } catch (e) {
      // Module doesn't exist yet
    }
  });

  it('should return template with required fields', async () => {
    const subscription = createTestSubscription();
    const template = await generateCancellationEmailTemplate(subscription);

    expect(template).toHaveProperty('to');
    expect(template).toHaveProperty('subject');
    expect(template).toHaveProperty('body');
  });

  it('should have reasonable subject line length', async () => {
    const subscription = createTestSubscription();
    const template = await generateCancellationEmailTemplate(subscription);

    expect(template.subject.length).toBeLessThan(100);
    expect(template.subject.length).toBeGreaterThan(10);
  });

  it('should have complete body with greeting and signature', async () => {
    const subscription = createTestSubscription();
    const template = await generateCancellationEmailTemplate(subscription);

    expect(template.body).toMatch(/dear|hello|hi|to whom/i);
    expect(template.body).toMatch(/sincerely|regards|thank you|best/i);
  });
});
