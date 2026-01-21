import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Forgot password page object
 * Handles password reset flow:
 * 1. Request - Enter email
 * 2. Verify - Enter reset code
 * 3. Reset - Set new password
 */
export class ForgotPasswordPage extends BasePage {
  // Step 1: Email request
  readonly emailInput: Locator;
  readonly requestButton: Locator;

  // Step 2: Verification
  readonly resetCodeInput: Locator;
  readonly verifyCodeButton: Locator;
  readonly resendCodeButton: Locator;

  // Step 3: New password
  readonly newPasswordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly resetPasswordButton: Locator;

  // Common elements
  readonly backToLoginLink: Locator;
  readonly formError: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    super(page);

    // Step 1: Email
    this.emailInput = page.locator(
      'input[name="email"], ' +
        'input[type="email"], ' +
        '[data-testid="email-input"]'
    );
    this.requestButton = page.locator(
      'button[type="submit"]:has-text("Send"), ' +
        'button[type="submit"]:has-text("Request"), ' +
        'button[type="submit"]:has-text("Reset"), ' +
        'button[type="submit"]:has-text("Continue"), ' +
        '[data-testid="request-reset-button"]'
    );

    // Step 2: Verification
    this.resetCodeInput = page.locator(
      'input[name="code"], ' +
        'input[name="resetCode"], ' +
        'input[placeholder*="code" i], ' +
        '[data-testid="reset-code-input"]'
    );
    this.verifyCodeButton = page.locator(
      'button[type="submit"]:has-text("Verify"), ' +
        'button[type="submit"]:has-text("Continue"), ' +
        '[data-testid="verify-code-button"]'
    );
    this.resendCodeButton = page.locator(
      'button:has-text("Resend"), ' +
        'a:has-text("Resend"), ' +
        '[data-testid="resend-code"]'
    );

    // Step 3: New password
    this.newPasswordInput = page.locator(
      'input[name="password"], ' +
        'input[name="newPassword"], ' +
        'input[type="password"]:first-of-type, ' +
        '[data-testid="new-password-input"]'
    );
    this.confirmPasswordInput = page.locator(
      'input[name="confirmPassword"], ' +
        'input[type="password"]:last-of-type, ' +
        '[data-testid="confirm-password-input"]'
    );
    this.resetPasswordButton = page.locator(
      'button[type="submit"]:has-text("Reset"), ' +
        'button[type="submit"]:has-text("Change"), ' +
        'button[type="submit"]:has-text("Set"), ' +
        'button[type="submit"]:has-text("Update"), ' +
        '[data-testid="reset-password-button"]'
    );

    // Common
    this.backToLoginLink = page.locator(
      'a[href*="login"], ' +
        'a:has-text("Back to login"), ' +
        'a:has-text("Return to login"), ' +
        '[data-testid="back-to-login"]'
    );
    this.formError = page.locator(
      '[data-testid="form-error"], ' +
        '.form-error, ' +
        '[role="alert"]:not(.toast)'
    );
    this.successMessage = page.locator(
      '[data-testid="success-message"], ' +
        '.success-message, ' +
        '[role="status"]'
    );
  }

  /**
   * Navigate to forgot password page
   */
  async goto(): Promise<void> {
    await super.goto('/forgot-password');
    await this.waitForLoad();
  }

  /**
   * Step 1: Request password reset
   */
  async requestReset(email: string): Promise<void> {
    await this.fillField(this.emailInput, email);
    await this.requestButton.click();
  }

  /**
   * Step 2: Verify reset code
   */
  async verifyCode(code: string): Promise<void> {
    await expect(this.resetCodeInput).toBeVisible({ timeout: 10000 });
    await this.fillField(this.resetCodeInput, code);
    await this.verifyCodeButton.click();
  }

  /**
   * Step 3: Set new password
   */
  async setNewPassword(password: string, confirmPassword?: string): Promise<void> {
    await expect(this.newPasswordInput).toBeVisible({ timeout: 10000 });
    await this.fillField(this.newPasswordInput, password);

    if (this.confirmPasswordInput) {
      await this.fillField(this.confirmPasswordInput, confirmPassword || password);
    }

    await this.resetPasswordButton.click();
  }

  /**
   * Complete full password reset flow
   */
  async completePasswordReset(
    email: string,
    resetCode: string,
    newPassword: string
  ): Promise<void> {
    // Step 1: Request reset
    await this.requestReset(email);
    await this.waitForLoadingComplete();

    // Step 2: Verify code
    await this.verifyCode(resetCode);
    await this.waitForLoadingComplete();

    // Step 3: Set new password
    await this.setNewPassword(newPassword);
    await this.waitForLoadingComplete();
  }

  /**
   * Check if on email step
   */
  async isOnEmailStep(): Promise<boolean> {
    return await this.isVisible(this.emailInput);
  }

  /**
   * Check if on verification step
   */
  async isOnVerificationStep(): Promise<boolean> {
    return await this.isVisible(this.resetCodeInput);
  }

  /**
   * Check if on new password step
   */
  async isOnPasswordStep(): Promise<boolean> {
    const passwordVisible = await this.isVisible(this.newPasswordInput);
    const codeNotVisible = !(await this.isVisible(this.resetCodeInput, 1000));
    return passwordVisible && codeNotVisible;
  }

  /**
   * Click resend code
   */
  async resendCode(): Promise<void> {
    await this.resendCodeButton.click();
  }

  /**
   * Navigate back to login
   */
  async gotoLogin(): Promise<void> {
    await this.backToLoginLink.click();
    await this.page.waitForURL(/.*login.*/);
  }

  /**
   * Get form error message
   */
  async getFormError(): Promise<string | null> {
    try {
      await expect(this.formError.first()).toBeVisible({ timeout: 5000 });
      return await this.formError.first().textContent();
    } catch {
      return null;
    }
  }

  /**
   * Get success message
   */
  async getSuccessMessage(): Promise<string | null> {
    try {
      await expect(this.successMessage.first()).toBeVisible({ timeout: 5000 });
      return await this.successMessage.first().textContent();
    } catch {
      return null;
    }
  }

  /**
   * Verify on forgot password page
   */
  async expectForgotPasswordPage(): Promise<void> {
    await expect(this.emailInput).toBeVisible();
    await expect(this.requestButton).toBeVisible();
  }

  /**
   * Verify moved to verification step
   */
  async expectVerificationStep(): Promise<void> {
    await expect(this.resetCodeInput).toBeVisible({ timeout: 10000 });
  }

  /**
   * Verify moved to new password step
   */
  async expectPasswordStep(): Promise<void> {
    await expect(this.newPasswordInput).toBeVisible({ timeout: 10000 });
  }

  /**
   * Verify password reset complete
   */
  async expectResetComplete(): Promise<void> {
    // Should show success or redirect to login
    const success = await this.getSuccessMessage();
    if (success) {
      expect(success.toLowerCase()).toMatch(/success|reset|changed/);
    } else {
      // Redirected to login
      await this.page.waitForURL(/.*login.*/, { timeout: 10000 });
    }
  }

  /**
   * Verify email sent confirmation
   */
  async expectEmailSentConfirmation(): Promise<void> {
    // Either moved to verification step or shows success message
    const onVerificationStep = await this.isOnVerificationStep();
    if (!onVerificationStep) {
      const success = await this.getSuccessMessage();
      expect(success).toBeTruthy();
    }
  }
}
