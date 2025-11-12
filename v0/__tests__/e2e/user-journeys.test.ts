/**
 * End-to-End User Journey Tests
 * 
 * Tests complete user journeys from frontend perspective:
 * - New player onboarding
 * - Daily gameplay loop
 * - Toy collection and management
 * - Leaderboard competition
 */

import { describe, it, expect } from "@jest/globals";
import { chromium, Browser, Page } from "playwright";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

describe("E2E: New Player Onboarding", () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
  });

  afterEach(async () => {
    await page.close();
  });

  it("should complete onboarding flow", async () => {
    // Navigate to onboarding page
    await page.goto(`${BASE_URL}/onboard`);

    // Check page loads
    await expect(page.locator("h1")).toContainText("Welcome");

    // Mock wallet connection
    await page.evaluate(() => {
      (window as any).ethereum = {
        request: async ({ method }: any) => {
          if (method === "eth_requestAccounts") {
            return ["0x1234567890123456789012345678901234567890"];
          }
        },
      };
    });

    // Click connect wallet button
    await page.click('button:has-text("Connect")');

    // Wait for nickname step
    await page.waitForSelector('input[placeholder*="nickname"]');

    // Enter nickname
    await page.fill('input[placeholder*="nickname"]', "TestPlayer");

    // Submit registration
    await page.click('button:has-text("Continue")');

    // Should navigate to tutorial or play page
    await page.waitForURL(/\/play|\/onboard/, { timeout: 5000 });
  });
});

describe("E2E: Daily Gameplay Loop", () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
  });

  afterEach(async () => {
    await page.close();
  });

  it("should complete daily gameplay loop", async () => {
    // Navigate to play page
    await page.goto(`${BASE_URL}/play`);

    // Check page loads
    await expect(page.locator("h1")).toContainText("Play Games");

    // Check daily bonuses are displayed
    const bonusesSection = page.locator('text=Today\'s Bonuses');
    await expect(bonusesSection).toBeVisible();

    // Mock wallet connection
    await page.evaluate(() => {
      (window as any).ethereum = {
        request: async ({ method }: any) => {
          if (method === "eth_requestAccounts") {
            return ["0x1234567890123456789012345678901234567890"];
          }
        },
      };
    });

    // Click on a game card
    const gameCard = page.locator('text=Reaction Time').first();
    if (await gameCard.isVisible()) {
      await gameCard.click();

      // Should show game component
      await page.waitForSelector('text=Reaction Time', { timeout: 5000 });
    }
  });
});

describe("E2E: Toy Store and Inventory", () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
  });

  afterEach(async () => {
    await page.close();
  });

  it("should browse toy store", async () => {
    await page.goto(`${BASE_URL}/store`);

    // Check page loads
    await expect(page.locator("h1")).toContainText("Toy Store");

    // Check toys are displayed
    const toyCards = page.locator('[class*="Card"]');
    const count = await toyCards.count();
    expect(count).toBeGreaterThan(0);
  });

  it("should view inventory", async () => {
    await page.goto(`${BASE_URL}/inventory`);

    // Check page loads
    await expect(page.locator("h1")).toContainText("Inventory");

    // Should show wallet connection prompt or inventory
    const content = await page.textContent("body");
    expect(content).toMatch(/Connect|Inventory|Owned Toys/i);
  });
});

describe("E2E: Leaderboard", () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
  });

  afterEach(async () => {
    await page.close();
  });

  it("should display leaderboard", async () => {
    await page.goto(`${BASE_URL}/leaderboard`);

    // Check page loads
    await expect(page.locator("h1")).toContainText("Leaderboard");

    // Check period tabs exist
    await expect(page.locator('button:has-text("Weekly")')).toBeVisible();
    await expect(page.locator('button:has-text("Monthly")')).toBeVisible();
    await expect(page.locator('button:has-text("All Time")')).toBeVisible();

    // Click monthly tab
    await page.click('button:has-text("Monthly")');

    // Should show leaderboard table
    await page.waitForSelector("table, [class*='leaderboard']", { timeout: 3000 });
  });
});

