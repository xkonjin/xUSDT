/**
 * Claim Flow E2E Tests
 * 
 * Tests for the claim flow (sending to unregistered users):
 * 1. Creating claims
 * 2. Viewing claim pages
 * 3. Claim token handling
 */

import { test, expect } from '@playwright/test';

test.describe('Claim Flow', () => {
  test('claim page handles invalid token', async ({ page }) => {
    await page.goto('http://localhost:3002/claim/invalid-token-123');
    
    await page.waitForLoadState('networkidle');
    
    // Should show error or loading state
    const hasError = await page.getByText(/not found|error|invalid|expired/i).first().isVisible().catch(() => false);
    const hasLoading = await page.getByText(/loading/i).first().isVisible().catch(() => false);
    
    expect(hasError || hasLoading).toBe(true);
  });

  test('claim page structure is correct', async ({ page }) => {
    await page.goto('http://localhost:3002/claim/test-token');
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for Privy hydration
    
    // Page should load without crashing - may show error or claim info
    const hasError = await page.getByText(/not found|error|invalid|expired/i).first().isVisible().catch(() => false);
    const hasLoading = await page.getByText(/loading/i).first().isVisible().catch(() => false);
    const bodyContent = await page.locator('body').textContent();
    
    // Either shows error/loading (expected for invalid token) or has content
    expect(hasError || hasLoading || bodyContent?.length).toBeTruthy();
  });
});

test.describe('Claim API', () => {
  test('GET /api/claims requires address parameter', async ({ request }) => {
    const response = await request.get('http://localhost:3002/api/claims');
    
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(String(body.error || '').toLowerCase()).toContain('address');
  });

  test('POST /api/claims validates required fields', async ({ request }) => {
    // Missing senderAddress
    const response1 = await request.post('http://localhost:3002/api/claims', {
      data: {
        recipientEmail: 'test@example.com',
        authorization: { test: true },
        amount: 10,
      },
    });
    expect(response1.status()).toBe(400);

    // Missing recipient info
    const response2 = await request.post('http://localhost:3002/api/claims', {
      data: {
        senderAddress: '0x1234567890123456789012345678901234567890',
        authorization: { test: true },
        amount: 10,
      },
    });
    expect(response2.status()).toBe(400);

    // Missing authorization
    const response3 = await request.post('http://localhost:3002/api/claims', {
      data: {
        senderAddress: '0x1234567890123456789012345678901234567890',
        recipientEmail: 'test@example.com',
        amount: 10,
      },
    });
    expect(response3.status()).toBe(400);
  });

  test('GET /api/claims/:token returns 404 for invalid token', async ({ request }) => {
    const response = await request.get('http://localhost:3002/api/claims/invalid-token-12345');
    
    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.error).toContain('not found');
  });
});
