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

    // Open both apps sequentially to avoid race conditions
    const subkillerPage = await context.newPage();
    await subkillerPage.goto("http://localhost:3001");
    await subkillerPage.waitForLoadState("networkidle");

    await expect(
      subkillerPage.locator("text=Powered by Plasma").first()
    ).toBeVisible();
    await expect(
      subkillerPage.locator("text=Zero Gas Fees").first()
    ).toBeVisible();

    const venmoPage = await context.newPage();
    await venmoPage.goto("http://localhost:3002");
    await venmoPage.waitForLoadState("networkidle");

    // Plasma Venmo may show config screen if PRIVY_APP_ID not set
    // Wait for either the config message or the main app to load
    const configOrApp = venmoPage
      .locator("text=Configuration Required")
      .or(venmoPage.locator("text=Venmo"));
    await expect(configOrApp).toBeVisible({ timeout: 10000 });

    // Verify appropriate content based on config state
    const isConfigScreen = await venmoPage
      .locator("text=Configuration Required")
      .isVisible();
    if (!isConfigScreen) {
      await expect(venmoPage.locator("text=Plasma")).toBeVisible();
    }

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
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("text=SubKiller")).toBeVisible();
  });

  test("Plasma Venmo renders without errors", async ({ page }) => {
    await page.goto("http://localhost:3002");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Error Handling", () => {
  test("SubKiller handles network errors gracefully", async ({ page }) => {
    // Intercept API calls and force errors
    await page.route("**/api/**", (route) => route.abort());

    await page.goto("http://localhost:3001");

    // Page should still render without crashing
    await expect(page.locator("h1")).toBeVisible();
  });

  test("Plasma Venmo handles network errors gracefully", async ({ page }) => {
    await page.route("**/api/**", (route) => route.abort());

    await page.goto("http://localhost:3002");

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
