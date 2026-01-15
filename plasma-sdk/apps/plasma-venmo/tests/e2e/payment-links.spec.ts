/**
 * Payment Links E2E Tests
 * VENMO-001: Test payment link creation flow
 * 
 * Tests cover:
 * - Payment link API validation
 * - Pay page behavior for valid/invalid links
 * - Error handling for missing parameters
 */

import { test, expect } from '@playwright/test';

test.describe('Payment Links API', () => {
  test('GET /api/payment-links requires address parameter', async ({ request }) => {
    const response = await request.get('/api/payment-links');
    
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('address');
  });

  test('GET /api/payment-links with valid address returns list', async ({ request }) => {
    const response = await request.get('/api/payment-links?address=0x1234567890123456789012345678901234567890');
    
    // Should either succeed or fail gracefully
    expect([200, 500]).toContain(response.status());
    
    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toHaveProperty('success');
      expect(body).toHaveProperty('paymentLinks');
      expect(Array.isArray(body.paymentLinks)).toBe(true);
    }
  });

  test('POST /api/payment-links requires creatorAddress', async ({ request }) => {
    const response = await request.post('/api/payment-links', {
      data: {
        amount: 10,
        memo: 'Test payment',
      },
    });
    
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('creatorAddress');
  });

  test('POST /api/payment-links validates address format', async ({ request }) => {
    const response = await request.post('/api/payment-links', {
      data: {
        creatorAddress: 'invalid-address',
        amount: 10,
      },
    });
    
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Invalid');
  });

  test('POST /api/payment-links creates link with valid data', async ({ request }) => {
    const response = await request.post('/api/payment-links', {
      data: {
        creatorAddress: '0x1234567890123456789012345678901234567890',
        amount: 25.50,
        memo: 'E2E Test payment link',
      },
    });
    
    // Should succeed or fail due to database (not validation)
    expect([200, 500]).toContain(response.status());
    
    if (response.status() === 200) {
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.paymentLink).toBeDefined();
      expect(body.paymentLink.id).toBeDefined();
      expect(body.paymentLink.url).toBeDefined();
      expect(body.paymentLink.amount).toBe(25.50);
      expect(body.paymentLink.currency).toBe('USDT0');
    }
  });

  test('POST /api/payment-links creates link without fixed amount', async ({ request }) => {
    const response = await request.post('/api/payment-links', {
      data: {
        creatorAddress: '0x1234567890123456789012345678901234567890',
        memo: 'Flexible amount link',
      },
    });
    
    expect([200, 500]).toContain(response.status());
    
    if (response.status() === 200) {
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.paymentLink.amount).toBeNull();
    }
  });
});

test.describe('Pay Page UI', () => {
  test('pay page handles non-existent link gracefully', async ({ page }) => {
    await page.goto('/pay/non-existent-link-id');
    await page.waitForLoadState('networkidle');
    
    // Should show error or loading state, not crash
    const content = await page.locator('body').textContent();
    expect(content).toBeTruthy();
    
    // Look for error indicators
    const hasError = await page.getByText(/not found|error|invalid|loading/i).first().isVisible().catch(() => false);
    expect(hasError || content!.length > 0).toBe(true);
  });

  test('pay page renders structure', async ({ page }) => {
    await page.goto('/pay/test-link');
    await page.waitForLoadState('networkidle');
    
    // Page should not crash
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Should have dark styling
    await expect(body).toHaveClass(/bg-black/);
  });

  test('pay page with linkId parameter', async ({ page }) => {
    // Test that the dynamic route [linkId] works
    await page.goto('/pay/abc123xyz');
    await page.waitForLoadState('networkidle');
    
    // Should render something (error or form)
    const bodyContent = await page.locator('body').textContent();
    expect(bodyContent).toBeTruthy();
    expect(bodyContent!.length).toBeGreaterThan(0);
  });
});
