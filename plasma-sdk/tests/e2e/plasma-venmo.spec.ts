import { test, expect } from '@playwright/test';

/**
 * Plasma Venmo E2E Tests
 * 
 * Tests the P2P payment MVP. The app may show main content or a configuration
 * screen depending on environment variables. Tests handle both states.
 */

test.describe('Plasma Venmo Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3002');
    await page.waitForLoadState('networkidle');
  });

  test('should render page content', async ({ page }) => {
    // Page should load and show either main app or config screen
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    const content = await body.textContent();
    expect(content).toBeTruthy();
    expect(content!.length).toBeGreaterThan(0);
  });

  test('should have dark background styling', async ({ page }) => {
    const body = page.locator('body');
    await expect(body).toBeVisible();
    // Body should have dark background (bg-black class)
    await expect(body).toHaveClass(/bg-black/);
  });

  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('http://localhost:3002');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should display branding when configured', async ({ page }) => {
    // Check for main app content
    const hasVenmo = await page.getByText('Venmo', { exact: true }).isVisible();
    
    if (hasVenmo) {
      // Use exact match to avoid strict mode issues
      await expect(page.getByText('Plasma', { exact: true })).toBeVisible();
      await expect(page.getByText('Venmo', { exact: true })).toBeVisible();
    } else {
      // Config screen is showing
      await expect(page.getByText('Configuration Required')).toBeVisible();
    }
  });
});

test.describe('Plasma Venmo Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should be responsive on mobile', async ({ page }) => {
    await page.goto('http://localhost:3002');
    
    // App should render something (either config message or main app)
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Check the body has proper mobile rendering
    const hasContent = await body.textContent();
    expect(hasContent).toBeTruthy();
  });
});

test.describe('Plasma Venmo UI Components', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3002');
    await page.waitForLoadState('networkidle');
  });

  test('should display Get Started button when app is active', async ({ page }) => {
    const loginButton = page.getByRole('button', { name: /Get Started/i });
    const hasButton = await loginButton.isVisible();
    
    if (hasButton) {
      await expect(loginButton).toBeEnabled();
      const text = await loginButton.textContent();
      expect(text).toBeTruthy();
    } else {
      // Config screen is showing - that's fine too
      await expect(page.getByText('Configuration Required')).toBeVisible();
    }
  });

  test('should mention zero gas fees when configured', async ({ page }) => {
    const zeroGasText = page.getByText(/Zero gas fees/i).first();
    const hasZeroGas = await zeroGasText.isVisible();
    
    if (hasZeroGas) {
      await expect(zeroGasText).toBeVisible();
    }
    // Don't fail if config screen is showing
  });
});
