import { test, expect } from '@playwright/test';

test.describe('Payment Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
  });

  test('should display homepage correctly', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Plenmo/);

    // Check main heading
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();

    // Check connect wallet button
    const connectButton = page.getByRole('button', { name: /connect/i });
    await expect(connectButton).toBeVisible();
  });

  test('should show wallet connection modal', async ({ page }) => {
    // Click connect wallet button
    const connectButton = page.getByRole('button', { name: /connect/i });
    await connectButton.click();

    // Check if Privy modal appears (or wallet selection)
    // Note: This might need adjustment based on actual implementation
    await expect(page.locator('[data-testid="wallet-modal"]')).toBeVisible({
      timeout: 5000,
    });
  });

  test('should validate send money form', async ({ page }) => {
    // Assuming user is already connected (mock or test wallet)
    // Navigate to send money page
    await page.goto('/pay');

    // Try to submit empty form
    const submitButton = page.getByRole('button', { name: /send|pay/i });
    await submitButton.click();

    // Check for validation errors
    const errorMessages = page.locator('[role="alert"]');
    await expect(errorMessages.first()).toBeVisible();
  });

  test('should show insufficient balance error', async ({ page }) => {
    // Navigate to send money page
    await page.goto('/pay');

    // Fill in amount greater than balance
    const amountInput = page.getByLabel(/amount/i);
    await amountInput.fill('999999');

    // Fill in recipient
    const recipientInput = page.getByLabel(/recipient|address/i);
    await recipientInput.fill('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb');

    // Submit form
    const submitButton = page.getByRole('button', { name: /send|pay/i });
    await submitButton.click();

    // Check for insufficient balance error
    await expect(page.getByText(/insufficient balance/i)).toBeVisible();
  });

  test('should navigate between pages', async ({ page }) => {
    // Check navigation links exist
    const homeLink = page.getByRole('link', { name: /home/i });
    const sendLink = page.getByRole('link', { name: /send/i });
    const requestLink = page.getByRole('link', { name: /request/i });

    await expect(homeLink).toBeVisible();
    await expect(sendLink).toBeVisible();
    await expect(requestLink).toBeVisible();

    // Navigate to send page
    await sendLink.click();
    await expect(page).toHaveURL(/\/pay/);

    // Navigate to request page
    await requestLink.click();
    await expect(page).toHaveURL(/\/request/);

    // Navigate back home
    await homeLink.click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('should display transaction history', async ({ page }) => {
    // Assuming user is logged in with transactions
    await page.goto('/');

    // Check for transaction history section
    const historySection = page.getByRole('region', { name: /transaction|history/i });
    
    // Should either show transactions or empty state
    const hasTransactions = await page.locator('.transaction-item').count() > 0;
    const hasEmptyState = await page.getByText(/no transactions/i).isVisible();

    expect(hasTransactions || hasEmptyState).toBeTruthy();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check page still loads correctly
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Check mobile menu works
    const mobileMenuButton = page.getByRole('button', { name: /menu/i });
    if (await mobileMenuButton.isVisible()) {
      await mobileMenuButton.click();
      // Check navigation appears
      await expect(page.getByRole('navigation')).toBeVisible();
    }
  });

  test('should handle keyboard navigation', async ({ page }) => {
    await page.goto('/pay');

    // Tab through form fields
    await page.keyboard.press('Tab');
    const firstFocusable = await page.evaluate(() => document.activeElement?.tagName);
    expect(['INPUT', 'BUTTON', 'A']).toContain(firstFocusable);

    // Continue tabbing
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Check focus is moving
    const secondFocusable = await page.evaluate(() => document.activeElement?.tagName);
    expect(['INPUT', 'BUTTON', 'A']).toContain(secondFocusable);
  });

  test('should have proper accessibility attributes', async ({ page }) => {
    await page.goto('/');

    // Check main landmark
    const main = page.getByRole('main');
    await expect(main).toBeVisible();

    // Check buttons have accessible names
    const buttons = page.getByRole('button');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const accessibleName = await button.getAttribute('aria-label') || await button.textContent();
      expect(accessibleName).toBeTruthy();
    }

    // Check form inputs have labels
    const inputs = page.getByRole('textbox');
    const inputCount = await inputs.count();
    
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const hasLabel = await input.getAttribute('aria-label') || 
                      await input.evaluate(el => !!document.querySelector(`label[for="${el.id}"]`));
      expect(hasLabel).toBeTruthy();
    }
  });
});
