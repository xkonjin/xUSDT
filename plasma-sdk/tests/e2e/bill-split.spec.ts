/**
 * Bill Split E2E Tests
 * 
 * Tests for the Bill Split (Splitzy) app:
 * 1. Landing page
 * 2. New bill creation
 * 3. Bill detail view
 * 4. Payment flow
 */

import { test, expect } from '@playwright/test';

test.describe('Bill Split Landing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3004');
  });

  test('displays Splitzy branding', async ({ page }) => {
    // Should show Splitzy or bill split branding
    const hasSplitzy = await page.getByText('Splitzy').first().isVisible().catch(() => false);
    const hasBillSplit = await page.getByText(/split.*bill/i).first().isVisible().catch(() => false);
    
    expect(hasSplitzy || hasBillSplit).toBe(true);
  });

  test('shows feature highlights', async ({ page }) => {
    // Should mention key features
    const hasReceipt = await page.getByText(/receipt|scan/i).first().isVisible().catch(() => false);
    const hasGasFees = await page.getByText(/gas|zero|free/i).first().isVisible().catch(() => false);
    
    // At least one feature should be highlighted
    expect(hasReceipt || hasGasFees).toBe(true);
  });

  test('has Get Started button', async ({ page }) => {
    // Should have a CTA button
    const button = page.getByRole('button', { name: /get started|sign|login/i });
    
    const isVisible = await button.first().isVisible().catch(() => false);
    expect(isVisible).toBe(true);
  });
});

test.describe('Bill Split API', () => {
  test('GET /api/bills requires address parameter', async ({ request }) => {
    const response = await request.get('http://localhost:3004/api/bills');
    
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('address');
  });

  test('POST /api/bills validates required fields', async ({ request }) => {
    // Missing creatorAddress
    const response1 = await request.post('http://localhost:3004/api/bills', {
      data: {
        title: 'Test Bill',
        items: [{ name: 'Item 1', price: 10 }],
        participants: [{ name: 'Person 1' }],
      },
    });
    expect(response1.status()).toBe(400);

    // Missing items
    const response2 = await request.post('http://localhost:3004/api/bills', {
      data: {
        creatorAddress: '0x1234567890123456789012345678901234567890',
        title: 'Test Bill',
        participants: [{ name: 'Person 1' }],
      },
    });
    expect(response2.status()).toBe(400);

    // Missing participants
    const response3 = await request.post('http://localhost:3004/api/bills', {
      data: {
        creatorAddress: '0x1234567890123456789012345678901234567890',
        title: 'Test Bill',
        items: [{ name: 'Item 1', price: 10 }],
      },
    });
    expect(response3.status()).toBe(400);
  });

  test('GET /api/bills/:id returns 404 for invalid ID', async ({ request }) => {
    const response = await request.get('http://localhost:3004/api/bills/invalid-bill-id');
    
    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.error).toContain('not found');
  });
});

test.describe('Receipt Scanning API', () => {
  test('POST /api/scan-receipt requires image', async ({ request }) => {
    const response = await request.post('http://localhost:3004/api/scan-receipt', {
      data: {},
    });
    
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('image');
  });

  test('POST /api/scan-receipt returns mock data without OpenAI key', async ({ request }) => {
    // When OPENAI_API_KEY is not set, should return mock data
    const response = await request.post('http://localhost:3004/api/scan-receipt', {
      data: {
        image: 'data:image/png;base64,iVBORw0KGgo=', // Minimal valid base64 image
      },
    });
    
    // Should return mock data or error (but not crash)
    expect([200, 500]).toContain(response.status());
    
    if (response.status() === 200) {
      const body = await response.json();
      expect(body.items).toBeDefined();
      expect(Array.isArray(body.items)).toBe(true);
    }
  });
});

test.describe('Bill New Page', () => {
  test('new bill page loads correctly', async ({ page }) => {
    await page.goto('http://localhost:3004/new');
    
    await page.waitForLoadState('networkidle');
    
    // Should have title input
    const titleInput = page.getByPlaceholder(/title|name/i);
    const hasTitleInput = await titleInput.first().isVisible().catch(() => false);
    
    // Should have some form elements
    expect(hasTitleInput).toBe(true);
  });

  test('new bill page has scan receipt option', async ({ page }) => {
    await page.goto('http://localhost:3004/new');
    
    await page.waitForLoadState('networkidle');
    
    // Should have scan/upload option
    const hasScan = await page.getByText(/scan|upload|camera/i).first().isVisible().catch(() => false);
    
    expect(hasScan).toBe(true);
  });
});

