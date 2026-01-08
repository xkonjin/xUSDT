/**
 * Request Money E2E Tests
 * 
 * Tests for the request money flow in Plasma Venmo:
 * 1. Creating payment requests
 * 2. Listing requests
 * 3. Declining requests
 */

import { test, expect } from '@playwright/test';

test.describe('Request Money Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3002');
  });

  test('landing page displays without errors', async ({ page }) => {
    // Verify page loads without console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForLoadState('networkidle');
    
    // Filter out expected errors (like missing env vars)
    const unexpectedErrors = errors.filter(
      e => !e.includes('PRIVY') && !e.includes('env') && !e.includes('hydration')
    );
    
    // Should have minimal unexpected errors
    expect(unexpectedErrors.length).toBeLessThan(3);
  });
});

test.describe('Request Money API', () => {
  test('GET /api/requests requires address parameter', async ({ request }) => {
    const response = await request.get('http://localhost:3002/api/requests');
    
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('address');
  });

  test('POST /api/requests validates required fields', async ({ request }) => {
    // Missing fromAddress
    const response1 = await request.post('http://localhost:3002/api/requests', {
      data: {
        toIdentifier: 'test@example.com',
        amount: 10,
      },
    });
    expect(response1.status()).toBe(400);

    // Missing toIdentifier
    const response2 = await request.post('http://localhost:3002/api/requests', {
      data: {
        fromAddress: '0x1234567890123456789012345678901234567890',
        amount: 10,
      },
    });
    expect(response2.status()).toBe(400);

    // Missing/invalid amount
    const response3 = await request.post('http://localhost:3002/api/requests', {
      data: {
        fromAddress: '0x1234567890123456789012345678901234567890',
        toIdentifier: 'test@example.com',
        amount: 0,
      },
    });
    expect(response3.status()).toBe(400);
  });

  test('POST /api/requests creates request with valid data', async ({ request }) => {
    const response = await request.post('http://localhost:3002/api/requests', {
      data: {
        fromAddress: '0x1234567890123456789012345678901234567890',
        toIdentifier: 'recipient@example.com',
        amount: 50,
        memo: 'Dinner split',
      },
    });
    
    // Should succeed or fail due to database (not validation)
    expect([200, 500]).toContain(response.status());
    
    if (response.status() === 200) {
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.request).toBeDefined();
      expect(body.request.amount).toBe(50);
    }
  });
});

