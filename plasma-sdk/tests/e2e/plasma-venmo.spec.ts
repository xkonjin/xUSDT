import { test, expect } from '@playwright/test';

/**
 * Plasma Venmo E2E Tests
 * Tests the P2P payment MVP
 */

test.describe('Plasma Venmo Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3002');
  });

  test('should display branding', async ({ page }) => {
    await expect(page.locator('text=Plasma')).toBeVisible();
    await expect(page.locator('text=Venmo')).toBeVisible();
  });

  test('should display value proposition', async ({ page }) => {
    await expect(page.locator('text=Send money to anyone')).toBeVisible();
    await expect(page.locator('text=Zero gas fees')).toBeVisible();
  });

  test('should have login button when not authenticated', async ({ page }) => {
    const loginButton = page.locator('button:has-text("Get Started")');
    await expect(loginButton).toBeVisible();
    await expect(loginButton).toBeEnabled();
  });

  test('should display Plasma chain branding', async ({ page }) => {
    await expect(page.locator('text=Powered by Plasma')).toBeVisible();
    await expect(page.locator('text=USDT0')).toBeVisible();
  });
});

test.describe('Plasma Venmo Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should be responsive on mobile', async ({ page }) => {
    await page.goto('http://localhost:3002');
    
    // Check main content is visible
    await expect(page.locator('text=Plasma')).toBeVisible();
    
    // Check CTA is visible
    const loginButton = page.locator('button:has-text("Get Started")');
    await expect(loginButton).toBeVisible();
  });
});

test.describe('Plasma Venmo UI Components', () => {
  test('should have proper styling', async ({ page }) => {
    await page.goto('http://localhost:3002');
    
    // Check for dark mode styling (bg-black or similar)
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Check button has plasma colors
    const button = page.locator('button:has-text("Get Started")');
    await expect(button).toHaveClass(/plasma/);
  });
});

test.describe('Plasma Venmo Performance', () => {
  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('http://localhost:3002');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });
});

test.describe('Plasma Venmo Accessibility', () => {
  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('http://localhost:3002');
    
    // Tab to the button
    await page.keyboard.press('Tab');
    
    // Check button is focused
    const button = page.locator('button:has-text("Get Started")');
    await expect(button).toBeFocused();
  });

  test('should have accessible button labels', async ({ page }) => {
    await page.goto('http://localhost:3002');
    
    // Check button has accessible text
    const button = page.locator('button:has-text("Get Started")');
    const text = await button.textContent();
    expect(text).toBeTruthy();
    expect(text!.length).toBeGreaterThan(0);
  });
});
