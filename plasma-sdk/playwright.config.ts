import { defineConfig, devices } from '@playwright/test';

/**
 * Plasma SDK E2E Test Configuration
 * Tests both SubKiller and Plasma Venmo MVPs
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  webServer: [
    {
      // Start SubKiller dev server on port 3001
      command: 'cd apps/subkiller && npm run dev',
      url: 'http://localhost:3001',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
    {
      // Start Plasma Venmo dev server on port 3002
      command: 'cd apps/plasma-venmo && npm run dev',
      url: 'http://localhost:3002',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
    {
      // Start Bill Split dev server on port 3004
      command: 'cd apps/bill-split && npm run dev',
      url: 'http://localhost:3004',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
  ],
});
