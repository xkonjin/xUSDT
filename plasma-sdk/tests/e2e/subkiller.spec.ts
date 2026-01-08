import { test, expect } from '@playwright/test';

/**
 * SubKiller E2E Tests
 * Tests the subscription scanner MVP
 */

test.describe('SubKiller Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3001');
  });

  test('should display hero section with correct branding', async ({ page }) => {
    // Check title
    await expect(page.locator('h1')).toContainText('Kill Your');
    await expect(page.locator('h1')).toContainText('Subscriptions');
    
    // Check subtitle
    await expect(page.locator('text=Scan your email')).toBeVisible();
    
    // Check Plasma branding
    await expect(page.locator('text=Powered by Plasma')).toBeVisible();
  });

  test('should display pricing information', async ({ page }) => {
    await expect(page.locator('text=$0.99')).toBeVisible();
    await expect(page.locator('text=One-time payment')).toBeVisible();
  });

  test('should display features section', async ({ page }) => {
    await expect(page.locator('text=How It Works')).toBeVisible();
    await expect(page.locator('text=Connect Gmail')).toBeVisible();
    await expect(page.locator('text=AI Scans')).toBeVisible();
    await expect(page.locator('text=Cancel & Save')).toBeVisible();
  });

  test('should display trust indicators', async ({ page }) => {
    await expect(page.locator('text=Privacy First')).toBeVisible();
    await expect(page.locator('text=Zero Gas Fees')).toBeVisible();
  });

  test('should have CTA button', async ({ page }) => {
    const ctaButton = page.locator('button:has-text("Scan My Email")');
    await expect(ctaButton).toBeVisible();
    await expect(ctaButton).toBeEnabled();
  });

  test('should display average stats', async ({ page }) => {
    await expect(page.locator('text=$847')).toBeVisible();
    await expect(page.locator('text=Avg. yearly savings')).toBeVisible();
    await expect(page.locator('text=Avg. subscriptions found')).toBeVisible();
  });
});

test.describe('SubKiller Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should be responsive on mobile', async ({ page }) => {
    await page.goto('http://localhost:3001');
    
    // Check hero is visible
    await expect(page.locator('h1')).toBeVisible();
    
    // Check CTA is visible and tappable
    const ctaButton = page.locator('button:has-text("Scan My Email")');
    await expect(ctaButton).toBeVisible();
  });
});

test.describe('SubKiller SEO', () => {
  test('should have correct meta tags', async ({ page }) => {
    await page.goto('http://localhost:3001');
    
    // Check title
    const title = await page.title();
    expect(title).toContain('SubKiller');
    
    // Check meta description
    const metaDescription = await page.locator('meta[name="description"]').getAttribute('content');
    expect(metaDescription).toBeTruthy();
    expect(metaDescription).toContain('subscription');
  });
});

test.describe('SubKiller Performance', () => {
  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });
});
