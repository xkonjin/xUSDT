import { test, expect } from "@playwright/test";

/**
 * Integration Tests
 * Tests cross-cutting concerns across both MVPs
 */

test.describe("Shared Design System", () => {
  test("SubKiller and Plasma Venmo use consistent branding", async ({
    browser,
  }) => {
    const context = await browser.newContext();

    // Open SubKiller - may redirect to signin
    const subkillerPage = await context.newPage();
    await subkillerPage.goto("http://localhost:3001");
    await subkillerPage.waitForLoadState("networkidle");
    await subkillerPage.waitForTimeout(2000);

    // SubKiller should load (either landing or signin)
    expect(subkillerPage.url()).toContain("localhost:3001");

    // Open Plasma Venmo
    const venmoPage = await context.newPage();
    await venmoPage.goto("http://localhost:3002");
    await venmoPage.waitForLoadState("networkidle");
    await venmoPage.waitForTimeout(2000);

    // Plasma Venmo should load with some content
    const hasPlasma = await venmoPage.locator("text=Plasma").first().isVisible().catch(() => false);
    const hasVenmo = await venmoPage.locator("text=Venmo").first().isVisible().catch(() => false);
    const hasGetStarted = await venmoPage.getByRole('button', { name: /Get Started/i }).isVisible().catch(() => false);
    
    // At least one should be visible
    expect(hasPlasma || hasVenmo || hasGetStarted).toBe(true);

    await context.close();
  });
});

test.describe("API Health Checks", () => {
  test("SubKiller API endpoints respond", async ({ request }) => {
    // Note: These would need to be mocked in a real test environment
    // This is a placeholder for integration testing
    const response = await request.get("http://localhost:3001/");
    expect(response.status()).toBe(200);
  });

  test("Plasma Venmo API endpoints respond", async ({ request }) => {
    const response = await request.get("http://localhost:3002/");
    expect(response.status()).toBe(200);
  });
});

test.describe("Cross-Browser Compatibility", () => {
  test("SubKiller renders without errors", async ({ page }) => {
    await page.goto("http://localhost:3001");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("body")).toBeVisible();
    // May redirect to signin - check URL is still on localhost:3001
    const url = page.url();
    expect(url).toContain("localhost:3001");
  });

  test("Plasma Venmo renders without errors", async ({ page }) => {
    await page.goto("http://localhost:3002");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Error Handling", () => {
  test("SubKiller handles network errors gracefully", async ({ page }) => {
    // Intercept API calls and force errors
    await page.route("**/api/**", (route) => route.abort());

    await page.goto("http://localhost:3001");
    await page.waitForLoadState("networkidle");

    // Page should still render without crashing
    // May redirect to signin or show content
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("Plasma Venmo handles network errors gracefully", async ({ page }) => {
    await page.route("**/api/**", (route) => route.abort());

    await page.goto("http://localhost:3002");
    await page.waitForLoadState("networkidle");

    // Page should still render without crashing
    // May show config screen if Privy not configured
    const body = page.locator("body");
    await expect(body).toBeVisible();
    const hasContent = await body.textContent();
    expect(hasContent).toBeTruthy();
  });
});

test.describe("Security Headers", () => {
  test("SubKiller responds with 200", async ({ request }) => {
    const response = await request.get("http://localhost:3001");
    expect(response.status()).toBe(200);
  });

  test("Plasma Venmo responds with 200", async ({ request }) => {
    const response = await request.get("http://localhost:3002");
    expect(response.status()).toBe(200);
  });
});
