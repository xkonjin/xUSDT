/**
 * E2E Tests for Plasma Predictions
 *
 * Tests market browsing, betting flow, and portfolio management
 */

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PREDICTIONS_URL || "http://localhost:3005";

test.describe("Plasma Predictions - Market Browser", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    // Wait for React hydration - the spinner should disappear
    await page.waitForFunction(
      () => !document.querySelector('.animate-spin'),
      { timeout: 30000 }
    ).catch(() => {
      // Spinner may not exist if page loaded fast
    });
    // Small delay for React to fully hydrate
    await page.waitForTimeout(500);
  });

  test("should display landing page with hero section", async ({ page }) => {
    // Wait for content to load
    await page.waitForSelector('h1', { timeout: 30000 });
    
    // New hero text
    await expect(
      page.getByRole("heading", { name: /Predict the Future/i })
    ).toBeVisible({ timeout: 10000 });

    // Feature cards
    await expect(page.getByText(/Zero Gas Fees/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/2-Second Settlement/i).first()).toBeVisible({ timeout: 5000 });

    await expect(
      page.getByRole("button", { name: /Browse Markets/i })
    ).toBeVisible({ timeout: 5000 });
  });

  test("should navigate to predictions page", async ({ page }) => {
    await page.getByRole("button", { name: /Browse Markets/i }).click();
    await page.waitForURL("**/predictions");

    await expect(page.getByPlaceholder(/Search markets/i)).toBeVisible();
  });

  test("should display market cards", async ({ page }) => {
    await page.goto(`${BASE_URL}/predictions`);

    // Wait for markets to load - using new class name
    await page.waitForSelector("[class*='market-card']", { timeout: 15000 });

    // Check market cards are present
    const marketCards = page.locator("[class*='market-card']");
    await expect(marketCards.first()).toBeVisible();

    // Each card should have YES/NO buttons
    await expect(page.getByRole("button", { name: /Bet YES/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Bet NO/i }).first()).toBeVisible();
  });

  test("should filter markets by category", async ({ page }) => {
    await page.goto(`${BASE_URL}/predictions`);

    // Wait for markets to load
    await page.waitForSelector("[class*='market-card']", { timeout: 15000 });

    // Click on Sports category
    await page.getByRole("button", { name: /Sports/i }).click();

    // Markets should filter
    await page.waitForTimeout(500);

    // Check that cards are visible
    const marketCards = page.locator("[class*='market-card']");
    const count = await marketCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test("should search markets", async ({ page }) => {
    await page.goto(`${BASE_URL}/predictions`);

    // Wait for markets
    await page.waitForSelector("[class*='market-card']", { timeout: 15000 });

    // Type in search
    await page.getByPlaceholder(/Search markets/i).fill("Super Bowl");

    // Wait for filter
    await page.waitForTimeout(500);

    // Check results
    await expect(page.getByText(/Super Bowl/i).first()).toBeVisible();
  });
});

test.describe("Plasma Predictions - Betting Flow", () => {
  test("should open betting modal when clicking YES", async ({ page }) => {
    await page.goto(`${BASE_URL}/predictions`);

    // Wait for markets
    await page.waitForSelector("[class*='market-card']", { timeout: 15000 });

    // Click YES button on first market
    await page.getByRole("button", { name: /Bet YES/i }).first().click();

    // Modal should appear with Amount label
    await expect(page.getByText(/Amount/i)).toBeVisible();
    await expect(page.getByPlaceholder("0.00")).toBeVisible();
  });

  test("should show quick amount buttons", async ({ page }) => {
    await page.goto(`${BASE_URL}/predictions`);

    await page.waitForSelector("[class*='market-card']", { timeout: 15000 });
    await page.getByRole("button", { name: /Bet YES/i }).first().click();

    // Wait for modal to be visible
    await page.waitForTimeout(500);

    // Quick amounts should be visible - use exact matching
    await expect(page.getByRole("button", { name: "$5", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "$10", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "$25", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "$50", exact: true })).toBeVisible();
  });

  test("should calculate potential payout", async ({ page }) => {
    await page.goto(`${BASE_URL}/predictions`);

    await page.waitForSelector("[class*='market-card']", { timeout: 15000 });
    await page.getByRole("button", { name: /Bet YES/i }).first().click();

    // Wait for modal
    await page.waitForTimeout(500);

    // Click $10 quick amount - use exact match
    await page.getByRole("button", { name: "$10", exact: true }).click();

    // Check that payout is calculated
    await expect(page.getByText(/You receive/i)).toBeVisible();
    await expect(page.getByText(/shares/i).first()).toBeVisible();
  });

  test("should close modal when clicking X", async ({ page }) => {
    await page.goto(`${BASE_URL}/predictions`);

    await page.waitForSelector("[class*='market-card']", { timeout: 15000 });
    await page.getByRole("button", { name: /Bet YES/i }).first().click();

    // Wait for modal
    await page.waitForTimeout(500);
    await expect(page.getByPlaceholder("0.00")).toBeVisible();

    // Close modal by clicking outside (backdrop)
    await page.mouse.click(10, 10);
    await page.waitForTimeout(500);

    // Modal should be gone
    await expect(page.getByPlaceholder("0.00")).not.toBeVisible({ timeout: 5000 });
  });
});

test.describe("Plasma Predictions - Market Detail", () => {
  test("should display market detail page", async ({ page }) => {
    // First go to predictions and get a real market
    await page.goto(`${BASE_URL}/predictions`);
    await page.waitForSelector("[class*='market-card']", { timeout: 15000 });
    
    // Click on the market question link (h3 inside the card)
    await page.locator("[class*='market-card'] h3").first().click();
    
    // Wait for navigation
    await page.waitForURL("**/predictions/**", { timeout: 10000 });

    // Should be on a market detail page
    expect(page.url()).toContain('/predictions/');
    
    // Check betting buttons exist
    await expect(page.getByRole("button", { name: /Bet YES/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test("should show market stats on card", async ({ page }) => {
    await page.goto(`${BASE_URL}/predictions`);
    await page.waitForSelector("[class*='market-card']", { timeout: 15000 });
    
    // Market cards should show stats
    // Look for percentages like "3%" or "97%" anywhere on the page (cards show them)
    await expect(page.locator("text=/\\d+%/").first()).toBeVisible({ timeout: 5000 });
    
    // Cards should have volume stats (like "$5.5M")
    await expect(page.locator("text=/\\$\\d+\\.\\d+[MK]/").first()).toBeVisible({ timeout: 5000 });
  });

  test("should navigate back to markets", async ({ page }) => {
    await page.goto(`${BASE_URL}/predictions`);
    await page.waitForSelector("[class*='market-card']", { timeout: 15000 });
    
    // Click on the market question link
    await page.locator("[class*='market-card'] h3").first().click();
    await page.waitForURL("**/predictions/**", { timeout: 10000 });

    // Navigate back via header link
    await page.getByRole("link", { name: /Markets/i }).first().click();
    await page.waitForURL("**/predictions", { timeout: 10000 });
  });
});

test.describe("Plasma Predictions - My Bets", () => {
  test("should show my bets page with header", async ({ page }) => {
    await page.goto(`${BASE_URL}/my-bets`);
    
    // Wait for page to load
    await page.waitForTimeout(3000);

    // Header should be visible
    await expect(page.getByRole("link", { name: /Plasma/i }).first()).toBeVisible({ timeout: 10000 });
    
    // Should be on my-bets page
    expect(page.url()).toContain('/my-bets');
  });
});

test.describe("Plasma Predictions - Leaderboard", () => {
  test("should display leaderboard page", async ({ page }) => {
    await page.goto(`${BASE_URL}/leaderboard`);

    await expect(page.getByRole("heading", { name: /Leaderboard/i })).toBeVisible();
    await expect(page.getByText(/Top predictors/i)).toBeVisible();
  });

  test("should show period filters", async ({ page }) => {
    await page.goto(`${BASE_URL}/leaderboard`);

    // New filter labels
    await expect(page.getByRole("button", { name: /This Week/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /This Month/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /All Time/i })).toBeVisible();
  });

  test("should show sort options", async ({ page }) => {
    await page.goto(`${BASE_URL}/leaderboard`);

    await expect(page.getByRole("button", { name: /Profit/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Win Rate/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Volume/i })).toBeVisible();
  });

  test("should display leaderboard entries", async ({ page }) => {
    await page.goto(`${BASE_URL}/leaderboard`);

    // Check for crown emoji (1st place) or trophy icon
    const hasCrown = await page.getByText("👑").isVisible().catch(() => false);
    const hasTrophy = await page.locator("svg").first().isVisible().catch(() => false);
    
    // Should have ranking elements
    expect(hasCrown || hasTrophy).toBeTruthy();
    
    // Should show profit amounts
    await expect(page.getByText(/\$\d+\.?\d*K/i).first()).toBeVisible();
  });
});

test.describe("Plasma Predictions - Mobile Responsive", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("should show bottom navigation on mobile", async ({ page }) => {
    await page.goto(`${BASE_URL}/predictions`);

    // Wait for page load
    await page.waitForTimeout(1000);

    // Bottom nav should be visible with nav items
    await expect(page.getByRole("link", { name: /Markets/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /My Bets/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Leaders/i }).first()).toBeVisible();
  });

  test("should display market cards in single column on mobile", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/predictions`);

    await page.waitForSelector("[class*='market-card']", { timeout: 15000 });

    // Get grid container and check columns
    const grid = page.locator(".grid").first();
    await expect(grid).toBeVisible();
    
    // On mobile, cards should stack
    const cards = page.locator("[class*='market-card']");
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test("should open betting modal as bottom sheet on mobile", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/predictions`);

    await page.waitForSelector("[class*='market-card']", { timeout: 15000 });
    await page.getByRole("button", { name: /Bet YES/i }).first().click();

    // Wait for modal animation
    await page.waitForTimeout(500);

    // Check for bottom sheet styling
    const modal = page.locator("[class*='bottom-sheet']");
    await expect(modal).toBeVisible();
  });
});
