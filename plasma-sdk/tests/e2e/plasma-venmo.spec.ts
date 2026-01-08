import { test, expect } from "@playwright/test";

/**
 * Plasma Venmo E2E Tests
 *
 * Tests the P2P payment MVP. Note: When NEXT_PUBLIC_PRIVY_APP_ID is not configured,
 * the app shows a "Configuration Required" screen. This test suite handles both states.
 */

test.describe("Plasma Venmo - Without Privy Configuration", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3002");
    // Wait for hydration - page must have meaningful content
    await page.waitForLoadState("domcontentloaded");
  });

  test("should show configuration required message when no Privy app ID", async ({
    page,
  }) => {
    // When Privy is not configured, app should gracefully show a configuration message
    // Wait for either config message OR main app branding (handles both states)
    const configMessage = page.locator("text=Configuration Required");
    const plasmaText = page.locator("text=Plasma").first();

    // Wait for page to fully render (either state)
    await Promise.race([
      configMessage
        .waitFor({ state: "visible", timeout: 10000 })
        .catch(() => {}),
      plasmaText.waitFor({ state: "visible", timeout: 10000 }).catch(() => {}),
    ]);

    // Check which state we're in
    const isUnconfigured = await configMessage.isVisible().catch(() => false);

    if (isUnconfigured) {
      // Verify proper error messaging
      await expect(configMessage).toBeVisible();
      await expect(page.locator("text=NEXT_PUBLIC_PRIVY_APP_ID")).toBeVisible();
    } else {
      // If configured, should show main app
      await expect(plasmaText).toBeVisible();
    }
  });

  test("should have dark background styling", async ({ page }) => {
    const body = page.locator("body");
    await expect(body).toBeVisible();
    // Body should have dark background (bg-black class)
    await expect(body).toHaveClass(/bg-black/);
  });

  test("should load within acceptable time", async ({ page }) => {
    const startTime = Date.now();
    await page.goto("http://localhost:3002");
    await page.waitForLoadState("networkidle");
    const loadTime = Date.now() - startTime;

    // Should load within 5 seconds even in unconfigured state
    expect(loadTime).toBeLessThan(5000);
  });
});

test.describe("Plasma Venmo Mobile Responsiveness", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("should be responsive on mobile", async ({ page }) => {
    await page.goto("http://localhost:3002");

    // App should render something (either config message or main app)
    const body = page.locator("body");
    await expect(body).toBeVisible();

    // Check the body has proper mobile rendering
    const hasContent = await body.textContent();
    expect(hasContent).toBeTruthy();
  });
});

/**
 * Tests that require NEXT_PUBLIC_PRIVY_APP_ID to be set
 * These tests will skip if the app is not properly configured
 */
test.describe("Plasma Venmo - With Privy Configuration", () => {
  async function skipIfUnconfigured(page: import("@playwright/test").Page) {
    await page.goto("http://localhost:3002");
    await page.waitForLoadState("domcontentloaded");

    const configMessage = page.locator("text=Configuration Required");
    const plasmaText = page.locator("text=Plasma").first();

    await Promise.race([
      configMessage
        .waitFor({ state: "visible", timeout: 10000 })
        .catch(() => {}),
      plasmaText.waitFor({ state: "visible", timeout: 10000 }).catch(() => {}),
    ]);

    const isUnconfigured = await configMessage.isVisible().catch(() => false);
    if (isUnconfigured) {
      test.skip(true, "NEXT_PUBLIC_PRIVY_APP_ID not configured");
    }
  }

  test("should display branding", async ({ page }) => {
    await skipIfUnconfigured(page);
    await expect(page.locator("text=Plasma").first()).toBeVisible();
    await expect(page.locator("text=Venmo").first()).toBeVisible();
  });

  test("should display value proposition", async ({ page }) => {
    await skipIfUnconfigured(page);
    await expect(page.locator("text=Send money to anyone")).toBeVisible();
    await expect(page.locator("text=Zero gas fees").first()).toBeVisible();
  });

  test("should have login button when not authenticated", async ({ page }) => {
    await skipIfUnconfigured(page);
    const loginButton = page.locator('button:has-text("Get Started")');
    await expect(loginButton).toBeVisible();
    await expect(loginButton).toBeEnabled();
  });

  test("should display Plasma chain branding", async ({ page }) => {
    await skipIfUnconfigured(page);
    await expect(page.locator("text=Powered by Plasma")).toBeVisible();
    await expect(page.locator("text=USDT0")).toBeVisible();
  });

  test("should have accessible button labels", async ({ page }) => {
    await skipIfUnconfigured(page);
    const button = page.locator('button:has-text("Get Started")');
    const text = await button.textContent();
    expect(text).toBeTruthy();
    expect(text!.length).toBeGreaterThan(0);
  });
});
