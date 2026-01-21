import { BasePageMCP } from '../base.page.mcp.js';
import { PageAdapter } from '../../adapters/browser.adapter.js';
import { expect } from '../../adapters/assertion.adapter.js';
import type { ElementSelector } from '../../adapters/types.js';

/**
 * Forgot password page object (MCP version)
 *
 * Handles password reset flow:
 * 1. Request - Enter email
 * 2. Verify - Enter reset code
 * 3. Reset - Set new password
 */
export class ForgotPasswordPageMCP extends BasePageMCP {
  constructor(pageAdapter: PageAdapter) {
    super(pageAdapter);
  }

  /**
   * Navigate to forgot password page
   */
  async goto(): Promise<void> {
    await super.goto('/forgot-password');
  }

  // ========== Step 1: Email Request Selectors ==========

  /**
   * Get email input selector
   */
  private getEmailInputSelector(): ElementSelector {
    return {
      role: 'textbox',
      name: /email/i,
    };
  }

  /**
   * Get request reset button selector with text fallbacks
   */
  private async getRequestButtonSelector(): Promise<ElementSelector> {
    const snapshot = await this.snapshotAdapter.takeSnapshot(this.pageAdapter.pageId);

    const textVariations = [
      'Send',
      'Request',
      'Reset',
      'Continue',
      'Send Reset Link',
      /send|request|reset|continue/i,
    ];

    for (const text of textVariations) {
      const uid = this.snapshotAdapter.findElement(snapshot, {
        role: 'button',
        text,
      });

      if (uid) {
        return { role: 'button', text };
      }
    }

    // Fallback to submit button
    return { role: 'button', attribute: { key: 'type', value: 'submit' } };
  }

  // ========== Step 2: Verification Selectors ==========

  /**
   * Get reset code input selector
   */
  private getResetCodeInputSelector(): ElementSelector {
    return {
      role: 'textbox',
      name: /code|reset/i,
    };
  }

  /**
   * Get verify code button selector with text fallbacks
   */
  private async getVerifyCodeButtonSelector(): Promise<ElementSelector> {
    const snapshot = await this.snapshotAdapter.takeSnapshot(this.pageAdapter.pageId);

    const textVariations = [
      'Verify',
      'Confirm',
      'Continue',
      'Submit',
      /verify|confirm|continue/i,
    ];

    for (const text of textVariations) {
      const uid = this.snapshotAdapter.findElement(snapshot, {
        role: 'button',
        text,
      });

      if (uid) {
        return { role: 'button', text };
      }
    }

    return { role: 'button', attribute: { key: 'type', value: 'submit' } };
  }

  /**
   * Get resend code button/link selector
   */
  private getResendCodeSelector(): ElementSelector {
    return {
      text: /resend/i,
    };
  }

  // ========== Step 3: New Password Selectors ==========

  /**
   * Get new password input selector (first password field)
   */
  private async getNewPasswordInputSelector(): Promise<ElementSelector> {
    const snapshot = await this.snapshotAdapter.takeSnapshot(this.pageAdapter.pageId);

    // Find first password input
    const passwordInputs = this.snapshotAdapter.findElements(snapshot, {
      role: 'textbox',
      name: /password/i,
    });

    if (passwordInputs.length > 0) {
      return {
        role: 'textbox',
        name: /^password$|new.*password/i,
      };
    }

    return {
      role: 'textbox',
      name: /password/i,
    };
  }

  /**
   * Get confirm password input selector (second password field)
   */
  private getConfirmPasswordInputSelector(): ElementSelector {
    return {
      role: 'textbox',
      name: /confirm.*password|password.*confirm/i,
    };
  }

  /**
   * Get reset password button selector with text fallbacks
   */
  private async getResetPasswordButtonSelector(): Promise<ElementSelector> {
    const snapshot = await this.snapshotAdapter.takeSnapshot(this.pageAdapter.pageId);

    const textVariations = [
      'Reset',
      'Reset Password',
      'Change Password',
      'Set Password',
      'Update Password',
      /reset|change|set|update/i,
    ];

    for (const text of textVariations) {
      const uid = this.snapshotAdapter.findElement(snapshot, {
        role: 'button',
        text,
      });

      if (uid) {
        return { role: 'button', text };
      }
    }

    return { role: 'button', attribute: { key: 'type', value: 'submit' } };
  }

  // ========== Common Element Selectors ==========

  /**
   * Get back to login link selector
   */
  private getBackToLoginLinkSelector(): ElementSelector {
    return {
      role: 'link',
      text: /back.*login|return.*login/i,
    };
  }

  // ========== Step 1: Email Request Actions ==========

  /**
   * Step 1: Request password reset
   * @param email - Email address
   */
  async requestReset(email: string): Promise<void> {
    await this.elementAdapter.fill(this.getEmailInputSelector(), email);

    const requestButton = await this.getRequestButtonSelector();
    await this.elementAdapter.click(requestButton);
  }

  // ========== Step 2: Verification Actions ==========

  /**
   * Step 2: Verify reset code
   * @param code - Reset code
   */
  async verifyCode(code: string): Promise<void> {
    // Wait for reset code input to appear
    await expect(
      this.getResetCodeInputSelector(),
      this.elementAdapter
    ).toBeVisible({ timeout: 10000 });

    await this.elementAdapter.fill(this.getResetCodeInputSelector(), code);

    const verifyButton = await this.getVerifyCodeButtonSelector();
    await this.elementAdapter.click(verifyButton);
  }

  /**
   * Click resend code button
   */
  async resendCode(): Promise<void> {
    await this.elementAdapter.click(this.getResendCodeSelector());
  }

  // ========== Step 3: New Password Actions ==========

  /**
   * Step 3: Set new password
   * @param password - New password
   * @param confirmPassword - Confirm password (defaults to same as password)
   */
  async setNewPassword(password: string, confirmPassword?: string): Promise<void> {
    // Wait for password input to appear
    const passwordSelector = await this.getNewPasswordInputSelector();
    await expect(passwordSelector, this.elementAdapter).toBeVisible({ timeout: 10000 });

    await this.elementAdapter.fill(passwordSelector, password);

    // Check if confirm password field exists
    const hasConfirmField = await this.isVisible(
      this.getConfirmPasswordInputSelector(),
      2000
    );

    if (hasConfirmField) {
      await this.elementAdapter.fill(
        this.getConfirmPasswordInputSelector(),
        confirmPassword || password
      );
    }

    const resetButton = await this.getResetPasswordButtonSelector();
    await this.elementAdapter.click(resetButton);
  }

  // ========== Complete Flow ==========

  /**
   * Complete full password reset flow (all steps)
   * Note: In real tests, you'll need to get the reset code
   * from an email service or use a test bypass
   *
   * @param email - Email address
   * @param resetCode - Reset code
   * @param newPassword - New password
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

  // ========== Step Detection ==========

  /**
   * Check if on email step
   * @returns True if on email step
   */
  async isOnEmailStep(): Promise<boolean> {
    return await this.isVisible(this.getEmailInputSelector(), 2000);
  }

  /**
   * Check if on verification step
   * @returns True if on verification step
   */
  async isOnVerificationStep(): Promise<boolean> {
    return await this.isVisible(this.getResetCodeInputSelector(), 2000);
  }

  /**
   * Check if on new password step
   * @returns True if on new password step
   */
  async isOnPasswordStep(): Promise<boolean> {
    const passwordSelector = await this.getNewPasswordInputSelector();
    const passwordVisible = await this.isVisible(passwordSelector, 2000);
    const codeNotVisible = !(await this.isVisible(this.getResetCodeInputSelector(), 1000));
    return passwordVisible && codeNotVisible;
  }

  // ========== Navigation ==========

  /**
   * Navigate back to login page
   */
  async gotoLogin(): Promise<void> {
    await this.clickAndNavigate(this.getBackToLoginLinkSelector());
    await this.expectUrl(/login/);
  }

  // ========== Error/Success Messages ==========

  /**
   * Get form error message
   * @returns Error message or null
   */
  async getFormError(): Promise<string | null> {
    try {
      const errorSelector: ElementSelector = { role: 'alert' };
      const isVisible = await this.isVisible(errorSelector, 5000);
      if (!isVisible) return null;

      return await this.elementAdapter.getText(errorSelector);
    } catch {
      return null;
    }
  }

  /**
   * Get success message
   * @returns Success message or null
   */
  async getSuccessMessage(): Promise<string | null> {
    try {
      const successSelector: ElementSelector = {
        text: /success|reset|changed|complete/i,
      };
      const isVisible = await this.isVisible(successSelector, 5000);
      if (!isVisible) return null;

      return await this.elementAdapter.getText(successSelector);
    } catch {
      return null;
    }
  }

  // ========== Assertions ==========

  /**
   * Assert we're on the forgot password page (email step)
   */
  async expectForgotPasswordPage(): Promise<void> {
    await expect(this.getEmailInputSelector(), this.elementAdapter).toBeVisible();

    const requestButton = await this.getRequestButtonSelector();
    await expect(requestButton, this.elementAdapter).toBeVisible();
  }

  /**
   * Assert moved to verification step
   */
  async expectVerificationStep(): Promise<void> {
    await expect(
      this.getResetCodeInputSelector(),
      this.elementAdapter
    ).toBeVisible({ timeout: 10000 });

    const verifyButton = await this.getVerifyCodeButtonSelector();
    await expect(verifyButton, this.elementAdapter).toBeVisible();
  }

  /**
   * Assert moved to new password step
   */
  async expectPasswordStep(): Promise<void> {
    const passwordSelector = await this.getNewPasswordInputSelector();
    await expect(passwordSelector, this.elementAdapter).toBeVisible({
      timeout: 10000,
    });
  }

  /**
   * Assert password reset complete
   */
  async expectResetComplete(): Promise<void> {
    const timeout = 15000;
    const startTime = Date.now();

    // Check for success message or redirect to login
    while (Date.now() - startTime < timeout) {
      // Try to get success message
      const success = await this.getSuccessMessage();
      if (success && /success|reset|changed|complete/i.test(success)) {
        return;
      }

      // Check if redirected to login
      const url = await this.getCurrentUrl();
      if (url.includes('login')) {
        return;
      }

      await this.sleep(100);
    }

    throw new Error('Password reset did not complete (no success message or login redirect)');
  }

  /**
   * Assert email sent confirmation
   */
  async expectEmailSentConfirmation(): Promise<void> {
    const timeout = 10000;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      // Check if moved to verification step
      const onVerificationStep = await this.isOnVerificationStep();
      if (onVerificationStep) {
        return;
      }

      // Check for success message
      const success = await this.getSuccessMessage();
      if (success) {
        return;
      }

      await this.sleep(100);
    }

    throw new Error('Email sent confirmation not shown (no verification step or success message)');
  }
}
