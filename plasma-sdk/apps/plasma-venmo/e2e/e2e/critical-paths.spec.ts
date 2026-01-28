import { test, expect } from '@playwright/test';

/**
 * @file E2E tests for critical payment flows in the xUSDT/Plenmo application.
 * @description This file contains tests for sending money, receiving money, and claiming payment links.
 */

test.describe('Critical Payment Flows', () => {
  test('should allow a user to send money', async ({ page }) => {
    /**
     * @description
     * This test verifies that a user can successfully send money to another user.
     * It simulates the entire flow from login to transaction confirmation.
     */
    try {
      // Step 1: Log in the user
      await page.goto('/login');
      await page.fill('input[name="email"]', 'sender@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL('/dashboard');

      // Step 2: Navigate to the "Send Money" page
      await page.click('text=Send Money');
      await expect(page).toHaveURL('/send');

      // Step 3: Enter recipient and amount
      await page.fill('input[name="recipient"]', 'recipient@example.com');
      await page.fill('input[name="amount"]', '10.00');
      await page.click('button[type="submit"]');

      // Step 4: Confirm the transaction
      await expect(page.locator('text=Confirm Transaction')).toBeVisible();
      await page.click('button:has-text("Confirm")');

      // Step 5: Verify the transaction success message
      await expect(page.locator('text=Transaction Successful')).toBeVisible();
      
    } catch (error) {
      // In a real-world scenario, you would integrate with a logging service like Sentry.
      // Sentry.captureException(error);
      console.error('Error during send money E2E test:', error);
      throw error;
    }
  });

  test('should allow a user to see received money', async ({ page }) => {
    /**
     * @description
     * This test verifies that a user can see a received transaction in their history.
     * It simulates logging in as the recipient and checking the transaction list.
     */
    try {
      // Step 1: Log in the recipient
      await page.goto('/login');
      await page.fill('input[name="email"]', 'recipient@example.com');
      await page.fill('input[name="password"]', 'password456');
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL('/dashboard');

      // Step 2: Navigate to transaction history
      await page.click('text=History');
      await expect(page).toHaveURL('/history');

      // Step 3: Verify the received transaction is displayed
      await expect(page.locator('text=Received from sender@example.com')).toBeVisible();
      await expect(page.locator('text=+10.00 xUSDT')).toBeVisible();

    } catch (error) {
      // Sentry.captureException(error);
      console.error('Error during receive money E2E test:', error);
      throw error;
    }
  });

  test('should allow a user to create and claim a payment link', async ({ page, context }) => {
    /**
     * @description
     * This test covers the end-to-end flow of creating a payment link and having another user claim it.
     */
    try {
      // Step 1: User A creates a payment link
      await page.goto('/login');
      await page.fill('input[name="email"]', 'userA@example.com');
      await page.fill('input[name="password"]', 'passwordA');
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL('/dashboard');
      await page.click('text=Create Link');
      await page.fill('input[name="amount"]', '25.00');
      await page.click('button:has-text("Generate Link")');
      const paymentLink = await page.inputValue('input[id="payment-link"]');
      expect(paymentLink).toContain('/claim?token=');

      // Step 2: User B claims the payment link
      const userBPage = await context.newPage();
      await userBPage.goto(paymentLink);
      await expect(userBPage.locator('text=Claim Your xUSDT')).toBeVisible();
      // Log in User B to claim
      await userBPage.fill('input[name="email"]', 'userB@example.com');
      await userBPage.fill('input[name="password"]', 'passwordB');
      await userBPage.click('button:has-text("Log In & Claim")');
      
      // Step 3: Verify claim success
      await expect(userBPage.locator('text=Successfully Claimed!')).toBeVisible();
      await expect(userBPage.locator('text=25.00 xUSDT has been added to your account')).toBeVisible();

    } catch (error) {
      // Sentry.captureException(error);
      console.error('Error during claim link E2E test:', error);
      throw error;
    }
  });
});
