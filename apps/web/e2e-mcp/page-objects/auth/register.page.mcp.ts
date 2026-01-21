import { BasePageMCP } from '../base.page.mcp.js';
import { PageAdapter } from '../../adapters/browser.adapter.js';
import { expect } from '../../adapters/assertion.adapter.js';
import type { ElementSelector } from '../../adapters/types.js';

/**
 * Register page object (MCP version)
 *
 * Handles multi-step registration flow:
 * 1. Start - Enter email
 * 2. Verify - Enter verification code
 * 3. Password - Set password
 * 4. Complete - Enter profile info (name)
 */
export class RegisterPageMCP extends BasePageMCP {
  constructor(pageAdapter: PageAdapter) {
    super(pageAdapter);
  }

  /**
   * Navigate to register page
   */
  async goto(): Promise<void> {
    await super.goto('/register');
  }

  // ========== Step 1: Email Input Selectors ==========

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
   * Get start/continue button selector with text fallbacks
   */
  private async getStartButtonSelector(): Promise<ElementSelector> {
    const snapshot = await this.snapshotAdapter.takeSnapshot(this.pageAdapter.pageId);

    const textVariations = [
      'Continue',
      'Next',
      'Start',
      'Get started',
      /continue|next|start/i,
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

  // ========== Step 2: Verification Code Selectors ==========

  /**
   * Get verification code input selector
   */
  private getVerificationCodeInputSelector(): ElementSelector {
    return {
      role: 'textbox',
      name: /code|verification/i,
    };
  }

  /**
   * Get verify button selector with text fallbacks
   */
  private async getVerifyButtonSelector(): Promise<ElementSelector> {
    const snapshot = await this.snapshotAdapter.takeSnapshot(this.pageAdapter.pageId);

    const textVariations = [
      'Verify',
      'Confirm',
      'Submit',
      /verify|confirm/i,
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

  // ========== Step 3: Password Selectors ==========

  /**
   * Get password input selector (first password field)
   */
  private async getPasswordInputSelector(): Promise<ElementSelector> {
    const snapshot = await this.snapshotAdapter.takeSnapshot(this.pageAdapter.pageId);

    // Find first password input
    const passwordInputs = this.snapshotAdapter.findElements(snapshot, {
      role: 'textbox',
      name: /password/i,
    });

    if (passwordInputs.length > 0) {
      return {
        role: 'textbox',
        name: /^password$/i,  // Exact match for "password"
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
   * Get set password button selector with text fallbacks
   */
  private async getSetPasswordButtonSelector(): Promise<ElementSelector> {
    const snapshot = await this.snapshotAdapter.takeSnapshot(this.pageAdapter.pageId);

    const textVariations = [
      'Set password',
      'Continue',
      'Next',
      /set.*password|continue|next/i,
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

  // ========== Step 4: Profile Selectors ==========

  /**
   * Get first name input selector
   */
  private getFirstNameInputSelector(): ElementSelector {
    return {
      role: 'textbox',
      name: /first.*name|given.*name/i,
    };
  }

  /**
   * Get last name/surname input selector
   */
  private getLastNameInputSelector(): ElementSelector {
    return {
      role: 'textbox',
      name: /last.*name|surname|family.*name/i,
    };
  }

  /**
   * Get complete button selector with text fallbacks
   */
  private async getCompleteButtonSelector(): Promise<ElementSelector> {
    const snapshot = await this.snapshotAdapter.takeSnapshot(this.pageAdapter.pageId);

    const textVariations = [
      'Complete',
      'Finish',
      'Create account',
      'Submit',
      /complete|finish|create/i,
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
   * Get back button selector
   */
  private getBackButtonSelector(): ElementSelector {
    return {
      role: 'button',
      text: /back/i,
    };
  }

  /**
   * Get login link selector
   */
  private getLoginLinkSelector(): ElementSelector {
    return {
      role: 'link',
      text: /log.*in|sign.*in/i,
    };
  }

  // ========== Step 1: Email Actions ==========

  /**
   * Step 1: Enter email and continue
   * @param email - Email address
   */
  async startRegistration(email: string): Promise<void> {
    await this.elementAdapter.fill(this.getEmailInputSelector(), email);

    const startButton = await this.getStartButtonSelector();
    await this.elementAdapter.click(startButton);
  }

  // ========== Step 2: Verification Actions ==========

  /**
   * Step 2: Enter verification code
   * @param code - Verification code
   */
  async verifyEmail(code: string): Promise<void> {
    // Wait for verification code input to appear
    await expect(
      this.getVerificationCodeInputSelector(),
      this.elementAdapter
    ).toBeVisible({ timeout: 10000 });

    await this.elementAdapter.fill(this.getVerificationCodeInputSelector(), code);

    const verifyButton = await this.getVerifyButtonSelector();
    await this.elementAdapter.click(verifyButton);
  }

  /**
   * Click resend code button
   */
  async resendCode(): Promise<void> {
    await this.elementAdapter.click(this.getResendCodeSelector());
  }

  // ========== Step 3: Password Actions ==========

  /**
   * Step 3: Set password
   * @param password - Password
   * @param confirmPassword - Confirm password (defaults to same as password)
   */
  async setPassword(password: string, confirmPassword?: string): Promise<void> {
    // Wait for password input to appear
    const passwordSelector = await this.getPasswordInputSelector();
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

    const setPasswordButton = await this.getSetPasswordButtonSelector();
    await this.elementAdapter.click(setPasswordButton);
  }

  // ========== Step 4: Profile Actions ==========

  /**
   * Step 4: Complete profile
   * @param firstName - First name
   * @param surname - Last name/surname
   */
  async completeProfile(firstName: string, surname: string): Promise<void> {
    // Wait for name inputs to appear
    await this.sleep(1000);

    // Fill first name if visible
    const hasFirstName = await this.isVisible(this.getFirstNameInputSelector(), 2000);
    if (hasFirstName) {
      await this.elementAdapter.fill(this.getFirstNameInputSelector(), firstName);
    }

    // Fill last name/surname if visible
    const hasLastName = await this.isVisible(this.getLastNameInputSelector(), 2000);
    if (hasLastName) {
      await this.elementAdapter.fill(this.getLastNameInputSelector(), surname);
    }

    const completeButton = await this.getCompleteButtonSelector();
    await this.elementAdapter.click(completeButton);
  }

  // ========== Complete Flow ==========

  /**
   * Complete full registration flow (all steps)
   * Note: In real tests, you'll need to get the verification code
   * from an email service or use a test bypass
   *
   * @param email - Email address
   * @param verificationCode - Verification code
   * @param password - Password
   * @param firstName - First name
   * @param surname - Last name/surname
   */
  async completeRegistration(
    email: string,
    verificationCode: string,
    password: string,
    firstName: string,
    surname: string
  ): Promise<void> {
    // Step 1: Email
    await this.startRegistration(email);
    await this.waitForLoadingComplete();

    // Step 2: Verification
    await this.verifyEmail(verificationCode);
    await this.waitForLoadingComplete();

    // Step 3: Password
    await this.setPassword(password);
    await this.waitForLoadingComplete();

    // Step 4: Profile
    await this.completeProfile(firstName, surname);
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
    return await this.isVisible(this.getVerificationCodeInputSelector(), 2000);
  }

  /**
   * Check if on password step
   * @returns True if on password step
   */
  async isOnPasswordStep(): Promise<boolean> {
    const passwordSelector = await this.getPasswordInputSelector();
    const passwordVisible = await this.isVisible(passwordSelector, 2000);
    const emailNotVisible = !(await this.isVisible(this.getEmailInputSelector(), 1000));
    return passwordVisible && emailNotVisible;
  }

  /**
   * Check if on profile step
   * @returns True if on profile step
   */
  async isOnProfileStep(): Promise<boolean> {
    const hasFirstName = await this.isVisible(this.getFirstNameInputSelector(), 2000);
    const hasLastName = await this.isVisible(this.getLastNameInputSelector(), 2000);
    return hasFirstName || hasLastName;
  }

  // ========== Navigation ==========

  /**
   * Go back to previous step
   */
  async goBack(): Promise<void> {
    await this.elementAdapter.click(this.getBackButtonSelector());
  }

  /**
   * Navigate to login page
   */
  async gotoLogin(): Promise<void> {
    await this.clickAndNavigate(this.getLoginLinkSelector());
    await this.expectUrl(/login/);
  }

  /**
   * Click Google register button
   */
  async clickGoogleRegister(): Promise<void> {
    const googleButtonSelector: ElementSelector = {
      role: 'button',
      text: /google/i,
    };
    await this.elementAdapter.click(googleButtonSelector);
  }

  /**
   * Check if Google register button is visible
   */
  async hasGoogleRegister(): Promise<boolean> {
    const googleButtonSelector: ElementSelector = {
      role: 'button',
      text: /google/i,
    };
    return await this.isVisible(googleButtonSelector, 2000);
  }

  // ========== Error Messages ==========

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

  // ========== Assertions ==========

  /**
   * Assert we're on the register page (email step)
   */
  async expectRegisterPage(): Promise<void> {
    await expect(this.getEmailInputSelector(), this.elementAdapter).toBeVisible();

    const startButton = await this.getStartButtonSelector();
    await expect(startButton, this.elementAdapter).toBeVisible();
  }

  /**
   * Assert moved to verification step
   */
  async expectVerificationStep(): Promise<void> {
    await expect(
      this.getVerificationCodeInputSelector(),
      this.elementAdapter
    ).toBeVisible({ timeout: 10000 });

    const verifyButton = await this.getVerifyButtonSelector();
    await expect(verifyButton, this.elementAdapter).toBeVisible();
  }

  /**
   * Assert moved to password step
   */
  async expectPasswordStep(): Promise<void> {
    const passwordSelector = await this.getPasswordInputSelector();
    await expect(passwordSelector, this.elementAdapter).toBeVisible({
      timeout: 10000,
    });
  }

  /**
   * Assert moved to profile step
   */
  async expectProfileStep(): Promise<void> {
    // Either first name or last name should be visible
    const hasFirstName = await this.isVisible(this.getFirstNameInputSelector(), 10000);
    const hasLastName = await this.isVisible(this.getLastNameInputSelector(), 10000);

    if (!hasFirstName && !hasLastName) {
      throw new Error('Neither first name nor last name input is visible on profile step');
    }
  }

  /**
   * Assert registration complete (redirected)
   */
  async expectRegistrationComplete(): Promise<void> {
    const timeout = 15000;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const url = await this.getCurrentUrl();
      if (
        url.includes('dashboard') ||
        url.includes('shops') ||
        url.includes('onboarding')
      ) {
        return;
      }
      await this.sleep(100);
    }

    throw new Error('Registration did not redirect to dashboard/shops/onboarding');
  }
}
