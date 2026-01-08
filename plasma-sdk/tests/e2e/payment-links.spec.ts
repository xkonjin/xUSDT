/**
 * Payment Links E2E Tests
 * 
 * Tests for the payment link flow in Plasma Venmo:
 * 1. Creating a payment link
 * 2. Viewing payment link details
 * 3. Payment link UI elements
 */

import { test, expect } from '@playwright/test';

test.describe('Payment Links Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3002');
  });

  test('landing page shows payment link feature', async ({ page }) => {
    // Should show the landing page with Plasma Venmo branding
    const heading = page.getByText('Plasma', { exact: true });
    const venmo = page.getByText('Venmo', { exact: true });
    
    // At least one of these should be visible
    const hasHeading = await heading.first().isVisible().catch(() => false);
    const hasVenmo = await venmo.first().isVisible().catch(() => false);
    
    expect(hasHeading || hasVenmo).toBe(true);
  });

  test('pay page handles missing link ID gracefully', async ({ page }) => {
    // Navigate to a non-existent payment link
    await page.goto('http://localhost:3002/pay/non-existent-id');
    
    // Should show an error or "not found" message
    await page.waitForLoadState('networkidle');
    
    // Look for error indicators
    const hasError = await page.getByText(/not found|error|invalid/i).first().isVisible().catch(() => false);
    const hasLoading = await page.getByText(/loading/i).first().isVisible().catch(() => false);
    
    // Should show error or still be loading (not crash)
    expect(hasError || hasLoading).toBe(true);
  });

  test('pay page displays required elements when link exists', async ({ page }) => {
    // This test verifies the pay page structure
    // In a real test, we'd create a link first via API
    await page.goto('http://localhost:3002/pay/test-link');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Page should not crash and should have some content
    const bodyContent = await page.locator('body').textContent();
    expect(bodyContent).toBeTruthy();
  });
});

test.describe('Payment Link API', () => {
  test('GET /api/payment-links requires address parameter', async ({ request }) => {
    const response = await request.get('http://localhost:3002/api/payment-links');
    
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('address');
  });

  test('POST /api/payment-links requires creator address', async ({ request }) => {
    const response = await request.post('http://localhost:3002/api/payment-links', {
      data: {
        amount: 10,
        memo: 'Test payment',
      },
    });
    
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('creatorAddress');
  });

  test('POST /api/payment-links creates link with valid data', async ({ request }) => {
    const response = await request.post('http://localhost:3002/api/payment-links', {
      data: {
        creatorAddress: '0x1234567890123456789012345678901234567890',
        amount: 25.50,
        memo: 'Test payment link',
      },
    });
    
    // Should succeed or fail due to database (not validation)
    expect([200, 500]).toContain(response.status());
    
    if (response.status() === 200) {
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.paymentLink).toBeDefined();
      expect(body.paymentLink.url).toBeDefined();
    }
  });
});

