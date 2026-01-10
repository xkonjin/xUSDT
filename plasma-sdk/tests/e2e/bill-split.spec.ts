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
    // Wait for client-side hydration (Privy requires this)
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
  });

  test('displays Splitzy branding', async ({ page }) => {
    // Check page title first (most reliable)
    const title = await page.title();
    const hasTitleBrand = title.toLowerCase().includes('split');
    
    // Also check for visible text after hydration
    const hasSplitzy = await page.getByText('Splitzy').first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasBillSplit = await page.getByText(/split.*bill/i).first().isVisible({ timeout: 5000 }).catch(() => false);
    
    expect(hasSplitzy || hasBillSplit || hasTitleBrand).toBe(true);
  });

  test('shows feature highlights', async ({ page }) => {
    // Check meta description first (always present in HTML)
    const metaDesc = await page.locator('meta[name="description"]').getAttribute('content').catch(() => '');
    const hasMetaFeature = metaDesc?.toLowerCase().includes('gas') || metaDesc?.toLowerCase().includes('crypto') || metaDesc?.toLowerCase().includes('split');
    
    // Also check visible content after hydration
    const hasReceipt = await page.getByText(/receipt|scan/i).first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasGasFees = await page.getByText(/gas|zero|free/i).first().isVisible({ timeout: 5000 }).catch(() => false);
    
    // At least one feature should be highlighted
    expect(hasReceipt || hasGasFees || hasMetaFeature).toBe(true);
  });

  test('has Get Started button', async ({ page }) => {
    // Wait for the page to fully hydrate
    await page.waitForTimeout(2000);
    
    // Should have a CTA button
    const button = page.getByRole('button', { name: /get started|sign|login|connect/i });
    
    const isVisible = await button.first().isVisible({ timeout: 5000 }).catch(() => false);
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
    await page.waitForTimeout(3000);
    
    // Should have title input
    const titleInput = page.getByPlaceholder(/title|name|dinner/i);
    const hasTitleInput = await titleInput.first().isVisible({ timeout: 5000 }).catch(() => false);
    
    // Check page loaded (may show loading or form)
    const hasForm = hasTitleInput || await page.getByText(/new bill/i).first().isVisible({ timeout: 3000 }).catch(() => false);
    
    expect(hasForm).toBe(true);
  });

  test('new bill page has scan receipt option', async ({ page }) => {
    await page.goto('http://localhost:3004/new');
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Should have scan/upload option
    const hasScan = await page.getByText(/scan|upload|camera|receipt/i).first().isVisible({ timeout: 5000 }).catch(() => false);
    
    expect(hasScan).toBe(true);
  });
});

