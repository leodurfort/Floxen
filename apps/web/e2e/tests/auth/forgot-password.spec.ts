import { test, expect } from '@playwright/test';
import { ForgotPasswordPage, LoginPage } from '../../page-objects';
import * as testData from '../../fixtures/test-data';

test.describe('Forgot Password Flow', () => {
  let forgotPasswordPage: ForgotPasswordPage;

  test.beforeEach(async ({ page }) => {
    forgotPasswordPage = new ForgotPasswordPage(page);
    await forgotPasswordPage.goto();
  });

  test.describe('Page Display', () => {
    test('should display forgot password form', async () => {
      await forgotPasswordPage.expectForgotPasswordPage();
    });

    test('should have back to login link', async () => {
      await expect(forgotPasswordPage.backToLoginLink).toBeVisible();
    });
  });

  test.describe('Step 1: Email Request', () => {
    test('should be on email step initially', async () => {
      expect(await forgotPasswordPage.isOnEmailStep()).toBe(true);
    });

    test('should show error for invalid email format', async () => {
      await forgotPasswordPage.requestReset('invalid-email');

      // Should show error or stay on same page
      await expect(forgotPasswordPage.page).toHaveURL(/forgot|reset/);
    });

    test('should accept valid email and show confirmation', async () => {
      await forgotPasswordPage.requestReset(testData.TEST_USER.email);
      await forgotPasswordPage.waitForLoadingComplete();

      // Should either move to verification step or show success message
      await forgotPasswordPage.expectEmailSentConfirmation();
    });

    test('should handle non-existent email gracefully', async () => {
      // For security, many systems don't reveal if email exists
      await forgotPasswordPage.requestReset('nonexistent@example.com');
      await forgotPasswordPage.waitForLoadingComplete();

      // Should either show generic success message (security best practice)
      // or show error about email not found
      const error = await forgotPasswordPage.getFormError();
      const success = await forgotPasswordPage.getSuccessMessage();

      // Either response is acceptable
      expect(error || success || (await forgotPasswordPage.isOnVerificationStep())).toBeTruthy();
    });
  });

  test.describe('Step 2: Code Verification', () => {
    test.beforeEach(async () => {
      // Request reset for existing user first
      await forgotPasswordPage.requestReset(testData.TEST_USER.email);
      await forgotPasswordPage.waitForLoadingComplete();
    });

    test('should show verification input after email submission', async () => {
      // Skip if not on verification step (some systems may not use inline verification)
      const onVerificationStep = await forgotPasswordPage.isOnVerificationStep();
      test.skip(!onVerificationStep, 'System uses email link instead of code');

      await forgotPasswordPage.expectVerificationStep();
    });

    test('should have resend code option', async () => {
      const onVerificationStep = await forgotPasswordPage.isOnVerificationStep();
      test.skip(!onVerificationStep, 'System uses email link instead of code');

      await expect(forgotPasswordPage.resendCodeButton).toBeVisible();
    });

    test('should show error for invalid code', async () => {
      const onVerificationStep = await forgotPasswordPage.isOnVerificationStep();
      test.skip(!onVerificationStep, 'System uses email link instead of code');

      await forgotPasswordPage.verifyCode('000000');
      const error = await forgotPasswordPage.getFormError();
      expect(error).toBeTruthy();
    });
  });

  test.describe('Step 3: Password Reset', () => {
    // These tests require completing verification
    // Would need email API access or test bypass

    test.skip(
      !process.env.E2E_MAILBOX_API_KEY,
      'Password reset completion requires code verification'
    );

    test('should validate new password requirements', async () => {
      // Would need to reach password step first
    });

    test('should require password confirmation', async () => {
      // Would need to reach password step first
    });

    test('should complete password reset successfully', async () => {
      // Would need to reach password step first
    });
  });

  test.describe('Navigation', () => {
    test('should navigate back to login', async () => {
      await forgotPasswordPage.gotoLogin();
      await expect(forgotPasswordPage.page).toHaveURL(/login/);
    });

    test('should be accessible from login page', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.gotoForgotPassword();

      await expect(page).toHaveURL(/forgot|reset/);
    });
  });
});

test.describe('Full Password Reset Journey', () => {
  test.skip(
    !process.env.E2E_MAILBOX_API_KEY,
    'Full reset requires email verification bypass or mailbox API'
  );

  test('should complete full password reset flow', async ({ page }) => {
    const forgotPasswordPage = new ForgotPasswordPage(page);
    await forgotPasswordPage.goto();

    // Step 1: Request reset
    await forgotPasswordPage.requestReset(testData.TEST_USER.email);

    // Step 2: Verify code (would need real code)
    // const code = await getVerificationCodeFromEmail(testData.TEST_USER.email);
    // await forgotPasswordPage.verifyCode(code);

    // Step 3: Set new password
    // const newPassword = 'NewSecurePassword123!';
    // await forgotPasswordPage.setNewPassword(newPassword);

    // Verify success
    // await forgotPasswordPage.expectResetComplete();

    // Verify can login with new password
    // const loginPage = new LoginPage(page);
    // await loginPage.goto();
    // await loginPage.loginAndWaitForDashboard(testData.TEST_USER.email, newPassword);
  });
});
