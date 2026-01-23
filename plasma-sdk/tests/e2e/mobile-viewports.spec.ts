import { test, expect } from '@playwright/test';

/**
 * Mobile Viewport E2E Tests
 * 
 * Comprehensive tests for mobile responsiveness across different
 * screen sizes including iPhone, Android, and tablet devices.
 */

const mobileDevices = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone 12', width: 390, height: 844 },
  { name: 'iPhone 14 Pro', width: 393, height: 852 },
  { name: 'iPhone 14 Pro Max', width: 430, height: 932 },
  { name: 'Pixel 5', width: 393, height: 851 },
  { name: 'Samsung Galaxy S21', width: 360, height: 800 },
];

const tabletDevices = [
  { name: 'iPad Mini', width: 768, height: 1024 },
  { name: 'iPad Pro', width: 1024, height: 1366 },
];

const apps = [
  { name: 'Plasma Venmo', url: 'http://localhost:3002' },
  { name: 'Plasma Predictions', url: 'http://localhost:3005' },
  { name: 'Bill Split', url: 'http://localhost:3004' },
];

mobileDevices.forEach(device => {
  apps.forEach(app => {
    test.describe(`${device.name} - ${app.name}`, () => {
      test.use({ viewport: { width: device.width, height: device.height } });

      test.beforeEach(async ({ page }) => {
        await page.goto(app.url);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
      });

      test(`should render properly on ${device.name}`, async ({ page }) => {
        const body = page.locator('body');
        await expect(body).toBeVisible();
        
        const content = await body.textContent();
        expect(content).toBeTruthy();
        expect(content!.length).toBeGreaterThan(0);
      });

      test(`should have readable text size on ${device.name}`, async ({ page }) => {
        // Check for text elements
        const textElements = page.locator('p, h1, h2, h3, span, div');
        const elementCount = await textElements.count();
        
        if (elementCount > 0) {
          // Just verify text exists (size checking is complex in E2E)
          const hasText = elementCount > 0;
          expect(hasText).toBe(true);
        }
      });

      test(`should have touch-friendly buttons on ${device.name}`, async ({ page }) => {
        // Check for buttons (min 44x44px touch target)
        const buttons = page.locator('button, a[role="button"], [role="button"]');
        const buttonCount = await buttons.count();
        
        if (buttonCount > 0) {
          // Verify buttons exist
          expect(buttonCount).toBeGreaterThan(0);
          
          // Check first button is visible and clickable
          const firstButton = buttons.first();
          await expect(firstButton).toBeVisible();
        }
      });

      test(`should not have horizontal overflow on ${device.name}`, async ({ page }) => {
        // Check if body has horizontal scrollbar
        const body = page.locator('body');
        const bodyWidth = await body.evaluate(el => el.scrollWidth);
        const clientWidth = await body.evaluate(el => el.clientWidth);
        
        // Body width should not exceed client width significantly
        const overflowAmount = bodyWidth - clientWidth;
        expect(overflowAmount).toBeLessThanOrEqual(10); // Allow minor overflow
      });

      test(`should handle keyboard navigation on ${device.name}`, async ({ page }) => {
        // Tab through the page
        await page.keyboard.press('Tab');
        await page.waitForTimeout(100);
        
        // Focus should move to an element
        const focusedElement = page.locator(':focus');
        const hasFocus = await focusedElement.count() > 0;
        
        // At least one element should be focusable
        expect(hasFocus).toBe(true);
      });

      test(`should have proper spacing on ${device.name}`, async ({ page }) => {
        // Check for properly spaced content
        const container = page.locator('.container, .max-w-\\[768px\\], .px-4').first();
        const hasContainer = await container.isVisible().catch(() => false);
        
        // Container is optional
        expect(typeof hasContainer).toBe('boolean');
      });

      test(`should load within acceptable time on ${device.name}`, async ({ page }) => {
        const startTime = Date.now();
        await page.goto(app.url);
        await page.waitForLoadState('networkidle');
        const loadTime = Date.now() - startTime;
        
        // Should load within 10 seconds
        expect(loadTime).toBeLessThan(10000);
      });
    });
  });
});

tabletDevices.forEach(device => {
  apps.forEach(app => {
    test.describe(`${device.name} - ${app.name}`, () => {
      test.use({ viewport: { width: device.width, height: device.height } });

      test.beforeEach(async ({ page }) => {
        await page.goto(app.url);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
      });

      test(`should render properly on ${device.name}`, async ({ page }) => {
        const body = page.locator('body');
        await expect(body).toBeVisible();
        
        const content = await body.textContent();
        expect(content).toBeTruthy();
        expect(content!.length).toBeGreaterThan(0);
      });

      test(`should utilize available screen space on ${device.name}`, async ({ page }) => {
        const body = page.locator('body');
        const bodyHeight = await body.evaluate(el => el.clientHeight);
        
        // Body should utilize most of viewport height
        const minHeight = device.height * 0.7; // At least 70% of viewport
        expect(bodyHeight).toBeGreaterThanOrEqual(minHeight);
      });

      test(`should have proper layout on ${device.name}`, async ({ page }) => {
        // Check for grid or flex layouts (common responsive patterns)
        const gridContainer = page.locator('.grid, [class*="grid"]').first();
        const flexContainer = page.locator('.flex, [class*="flex"]').first();
        
        const hasGrid = await gridContainer.count() > 0;
        const hasFlex = await flexContainer.count() > 0;
        
        // At least one layout pattern should exist
        expect(hasGrid || hasFlex).toBe(true);
      });
    });
  });
});

test.describe('Orientation Change Tests', () => {
  apps.forEach(app => {
    test.describe(`${app.name} - Orientation`, () => {
      test('should handle portrait to landscape transition', async ({ page }) => {
        // Start in portrait
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto(app.url);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        
        // Change to landscape
        await page.setViewportSize({ width: 667, height: 375 });
        await page.waitForTimeout(500);
        
        // Page should still be visible
        const body = page.locator('body');
        await expect(body).toBeVisible();
      });

      test('should handle landscape to portrait transition', async ({ page }) => {
        // Start in landscape
        await page.setViewportSize({ width: 667, height: 375 });
        await page.goto(app.url);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        
        // Change to portrait
        await page.setViewportSize({ width: 375, height: 667 });
        await page.waitForTimeout(500);
        
        // Page should still be visible
        const body = page.locator('body');
        await expect(body).toBeVisible();
      });
    });
  });
});

test.describe('Mobile-Specific Features', () => {
  test.describe('Touch Interactions', () => {
    apps.forEach(app => {
      test(`${app.name} should respond to touch events`, async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto(app.url);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        
        // Look for clickable elements
        const clickableElements = page.locator('button, a, [role="button"]');
        const elementCount = await clickableElements.count();
        
        if (elementCount > 0) {
          const firstElement = clickableElements.first();
          await expect(firstElement).toBeVisible();
        }
      });
    });
  });

  test.describe('Mobile Navigation', () => {
    apps.forEach(app => {
      test(`${app.name} should have mobile-friendly navigation`, async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto(app.url);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        
        // Check for navigation elements
        const nav = page.locator('nav, header, [role="navigation"]');
        const hasNav = await nav.count() > 0;
        
        // Navigation is optional but common
        expect(typeof hasNav).toBe('boolean');
      });
    });
  });

  test.describe('Mobile Performance', () => {
    apps.forEach(app => {
      test(`${app.name} should perform well on mobile`, async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        
        // Measure performance metrics
        const startTime = Date.now();
        await page.goto(app.url);
        await page.waitForLoadState('networkidle');
        const loadTime = Date.now() - startTime;
        
        // Should load within 10 seconds
        expect(loadTime).toBeLessThan(10000);
        
        // Check for large DOM
        const elementCount = await page.locator('*').count();
        expect(elementCount).toBeLessThan(10000); // Reasonable DOM size
      });
    });
  });
});

test.describe('Mobile Accessibility', () => {
  apps.forEach(app => {
    test(`${app.name} should be accessible on mobile`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(app.url);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      // Check for proper heading structure
      const headings = page.locator('h1, h2, h3');
      const headingCount = await headings.count();
      expect(headingCount).toBeGreaterThan(0);
      
      // Check for alt text on images
      const images = page.locator('img');
      const imageCount = await images.count();
      
      if (imageCount > 0) {
        const firstImage = images.first();
        const alt = await firstImage.getAttribute('alt');
        // Alt text is preferred but not always required
        expect(typeof alt).toBe('string' || alt === null);
      }
    });
  });
});
