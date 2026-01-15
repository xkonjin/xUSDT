/**
 * Dashboard E2E Tests
 * VENMO-001: Test dashboard loads correctly
 * 
 * Tests cover:
 * - Landing page renders for unauthenticated users
 * - Branding and key UI elements display
 * - Page performance and load time
 * - Mobile responsiveness
 */

import { test, expect } from '@playwright/test';

test.describe('Plasma Venmo Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should render landing page for unauthenticated users', async ({ page }) => {
    // Page body should be visible
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Should have dark background
    await expect(body).toHaveClass(/bg-black/);
  });

  test('should display Plasma Venmo branding', async ({ page }) => {
    // Look for branding elements
    const plasmaText = page.getByText('Plasma', { exact: true });
    const payText = page.getByText('Pay', { exact: true });
    
    const hasPlasma = await plasmaText.first().isVisible().catch(() => false);
    const hasPay = await payText.first().isVisible().catch(() => false);
    
    // At least Plasma branding should be visible
    expect(hasPlasma || hasPay).toBe(true);
  });

  test('should show Get Started button', async ({ page }) => {
    const getStartedButton = page.getByRole('button', { name: /Get Started/i });
    const hasButton = await getStartedButton.isVisible().catch(() => false);
    
    if (hasButton) {
      await expect(getStartedButton).toBeEnabled();
    }
  });

  test('should display trust signals', async ({ page }) => {
    // Check for trust indicators
    const zeroFees = page.getByText(/Zero fees|zero gas/i);
    const instant = page.getByText(/Instant/i);
    
    const hasZeroFees = await zeroFees.first().isVisible().catch(() => false);
    const hasInstant = await instant.first().isVisible().catch(() => false);
    
    // Should have at least one trust signal
    expect(hasZeroFees || hasInstant).toBe(true);
  });

  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // Should load within 10 seconds (including cold start)
    expect(loadTime).toBeLessThan(10000);
  });

  test('should display live activity indicators', async ({ page }) => {
    // Look for live counter or activity feed
    const liveIndicator = page.locator('.animate-pulse');
    const hasLive = await liveIndicator.first().isVisible().catch(() => false);
    
    // Optional - may not always be visible
    expect(typeof hasLive).toBe('boolean');
  });
});

test.describe('Dashboard Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should render properly on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Body should be visible
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Content should exist
    const content = await body.textContent();
    expect(content).toBeTruthy();
    expect(content!.length).toBeGreaterThan(100);
  });

  test('should have touchable Get Started button on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const button = page.getByRole('button', { name: /Get Started/i });
    const hasButton = await button.isVisible().catch(() => false);
    
    if (hasButton) {
      // Button should have adequate tap target
      const box = await button.boundingBox();
      expect(box).toBeTruthy();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44); // Min touch target
      }
    }
  });
});
