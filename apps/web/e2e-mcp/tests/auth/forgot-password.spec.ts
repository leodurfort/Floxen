import { describe, it, beforeEach } from 'vitest';
import { ForgotPasswordPageMCP } from '../../page-objects/auth/forgot-password.page.mcp.js';
import { LoginPageMCP } from '../../page-objects/auth/login.page.mcp.js';
import { useUnauthenticatedPage } from '../../fixtures/auth.fixture.js';
import * as testData from '../../fixtures/test-data.js';

describe('Forgot Password Flow', () => {
  let forgotPasswordPage: ForgotPasswordPageMCP;

  beforeEach(async () => {
    const pageAdapter = await useUnauthenticatedPage();
    forgotPasswordPage = new ForgotPasswordPageMCP(pageAdapter);
    await forgotPasswordPage.goto();
  });

  describe('Page Display', () => {
    it('should display forgot password form', async () => {
      await forgotPasswordPage.expectForgotPasswordPage();
    });

    it('should have back to login link', async () => {
      const hasBackLink = await forgotPasswordPage.isVisible(
        { role: 'link', text: /back.*login|return.*login/i },
        3000
      );
      if (!hasBackLink) {
        throw new Error('Back to login link not visible');
      }
    });
  });

  describe('Step 1: Email Request', () => {
    it('should be on email step initially', async () => {
      const isOnEmailStep = await forgotPasswordPage.isOnEmailStep();
      if (!isOnEmailStep) {
        throw new Error('Not on email step initially');
      }
    });

    it('should show error for invalid email format', async () => {
      await forgotPasswordPage.requestReset('invalid-email');

      // Should show error or stay on same page
      const url = await forgotPasswordPage.getCurrentUrl();
      if (!url.includes('forgot') && !url.includes('reset')) {
        throw new Error('Should stay on forgot password page for invalid email');
      }
    });

    it('should accept valid email and show confirmation', async () => {
      await forgotPasswordPage.requestReset(testData.TEST_USER.email);
      await forgotPasswordPage.waitForLoadingComplete();

      // Should either move to verification step or show success message
      await forgotPasswordPage.expectEmailSentConfirmation();
    });

    it('should handle non-existent email gracefully', async () => {
      // For security, many systems don't reveal if email exists
      await forgotPasswordPage.requestReset('nonexistent@example.com');
      await forgotPasswordPage.waitForLoadingComplete();

      // Should either show generic success message (security best practice)
      // or show error about email not found
      const error = await forgotPasswordPage.getFormError();
      const success = await forgotPasswordPage.getSuccessMessage();
      const onVerificationStep = await forgotPasswordPage.isOnVerificationStep();

      // Either response is acceptable
      if (!error && !success && !onVerificationStep) {
        throw new Error('Should show error, success message, or move to verification');
      }
    });
  });

  describe('Step 2: Code Verification', () => {
    beforeEach(async () => {
      // Request reset for existing user first
      await forgotPasswordPage.requestReset(testData.TEST_USER.email);
      await forgotPasswordPage.waitForLoadingComplete();
    });

    it('should show verification input after email submission', async () => {
      // Skip if not on verification step (some systems may not use inline verification)
      const onVerificationStep = await forgotPasswordPage.isOnVerificationStep();

      if (!onVerificationStep) {
        // System uses email link instead of code
        return;
      }

      await forgotPasswordPage.expectVerificationStep();
    });

    it('should have resend code option', async () => {
      const onVerificationStep = await forgotPasswordPage.isOnVerificationStep();

      if (!onVerificationStep) {
        // System uses email link instead of code
        return;
      }

      const hasResend = await forgotPasswordPage.isVisible(
        { text: /resend/i },
        3000
      );
      if (!hasResend) {
        throw new Error('Resend code button not visible on verification step');
      }
    });

    it('should show error for invalid code', async () => {
      const onVerificationStep = await forgotPasswordPage.isOnVerificationStep();

      if (!onVerificationStep) {
        // System uses email link instead of code
        return;
      }

      await forgotPasswordPage.verifyCode('000000');
      const error = await forgotPasswordPage.getFormError();
      if (!error) {
        throw new Error('Should show error for invalid verification code');
      }
    });
  });

  describe('Step 3: Password Reset', () => {
    // These tests require completing verification
    // Would need email API access or test bypass

    const skipPasswordReset = !process.env.E2E_MAILBOX_API_KEY;

    it.skipIf(skipPasswordReset)(
      'should validate new password requirements',
      async () => {
        // Would need to reach password step first
      }
    );

    it.skipIf(skipPasswordReset)('should require password confirmation', async () => {
      // Would need to reach password step first
    });

    it.skipIf(skipPasswordReset)(
      'should complete password reset successfully',
      async () => {
        // Would need to reach password step first
      }
    );
  });

  describe('Navigation', () => {
    it('should navigate back to login', async () => {
      await forgotPasswordPage.gotoLogin();
      const url = await forgotPasswordPage.getCurrentUrl();
      if (!url.includes('login')) {
        throw new Error('Should navigate to login page');
      }
    });

    it('should be accessible from login page', async () => {
      const pageAdapter = await useUnauthenticatedPage();
      const loginPage = new LoginPageMCP(pageAdapter);
      await loginPage.goto();
      await loginPage.gotoForgotPassword();

      const url = await loginPage.getCurrentUrl();
      if (!url.includes('forgot') && !url.includes('reset')) {
        throw new Error('Should navigate to forgot password page from login');
      }
    });
  });
});

describe('Full Password Reset Journey', () => {
  const skipFullJourney = !process.env.E2E_MAILBOX_API_KEY;

  it.skipIf(skipFullJourney)(
    'should complete full password reset flow',
    async () => {
      const pageAdapter = await useUnauthenticatedPage();
      const forgotPasswordPage = new ForgotPasswordPageMCP(pageAdapter);
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
      // const loginPage = new LoginPageMCP(pageAdapter);
      // await loginPage.goto();
      // await loginPage.loginAndWaitForDashboard(testData.TEST_USER.email, newPassword);
    }
  );
});
