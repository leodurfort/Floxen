import { BasePageMCP } from '../base.page.mcp.js';
import { PageAdapter } from '../../adapters/browser.adapter.js';
import { expect } from '../../adapters/assertion.adapter.js';
import type { ElementSelector } from '../../adapters/types.js';

/**
 * Login page object (MCP version)
 *
 * Handles:
 * - Login form interactions
 * - Form validation errors
 * - Navigation to register/forgot password
 * - Password visibility toggle
 * - Google OAuth (if available)
 */
export class LoginPageMCP extends BasePageMCP {
  constructor(pageAdapter: PageAdapter) {
    super(pageAdapter);
  }

  /**
   * Navigate to login page
   */
  async goto(): Promise<void> {
    await super.goto('/login');
  }

  // ========== Form Input Selectors ==========

  /**
   * Get email input selector with fallbacks
   * @returns Element selector for email input
   */
  private getEmailInputSelector(): ElementSelector {
    return {
      role: 'textbox',
      name: /email/i,
    };
  }

  /**
   * Get password input selector with fallbacks
   * @returns Element selector for password input
   */
  private getPasswordInputSelector(): ElementSelector {
    return {
      role: 'textbox',
      name: /password/i,
    };
  }

  /**
   * Get submit button selector with text fallbacks
   * @returns Element selector for submit button
   */
  private async getSubmitButtonSelector(): Promise<ElementSelector> {
    const snapshot = await this.snapshotAdapter.takeSnapshot(this.pageAdapter.pageId);

    // Try multiple text variations
    const textVariations = [
      'Log in',
      'Login',
      'Sign in',
      'Sign In',
      /log.*in/i,
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

    // Fallback: submit button
    return { role: 'button', attribute: { key: 'type', value: 'submit' } };
  }

  // ========== Form Actions ==========

  /**
   * Fill email field
   * @param email - Email address
   */
  async fillEmail(email: string): Promise<void> {
    const selector = this.getEmailInputSelector();
    await this.elementAdapter.fill(selector, email);
  }

  /**
   * Fill password field
   * @param password - Password
   */
  async fillPassword(password: string): Promise<void> {
    const selector = this.getPasswordInputSelector();
    await this.elementAdapter.fill(selector, password);
  }

  /**
   * Fill complete login form
   * @param email - Email address
   * @param password - Password
   */
  async fillForm(email: string, password: string): Promise<void> {
    await this.fillEmail(email);
    await this.fillPassword(password);
  }

  /**
   * Submit login form
   */
  async submit(): Promise<void> {
    const selector = await this.getSubmitButtonSelector();
    await this.elementAdapter.click(selector);
  }

  /**
   * Perform complete login
   * @param email - Email address
   * @param password - Password
   */
  async login(email: string, password: string): Promise<void> {
    await this.fillForm(email, password);
    await this.submit();
  }

  /**
   * Login and wait for redirect to dashboard/shops
   * @param email - Email address
   * @param password - Password
   */
  async loginAndWaitForDashboard(email: string, password: string): Promise<void> {
    await this.login(email, password);

    // Wait for URL change (either dashboard or shops)
    const timeout = 15000;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const url = await this.getCurrentUrl();
      if (url.includes('dashboard') || url.includes('shops')) {
        await this.waitForLoadingComplete();
        return;
      }
      await this.sleep(100);
    }

    throw new Error('Did not redirect to dashboard/shops after login');
  }

  /**
   * Check if login was successful (redirected away from login page)
   * @returns True if redirected to dashboard or shops
   */
  async isLoginSuccessful(): Promise<boolean> {
    try {
      const timeout = 10000;
      const startTime = Date.now();

      while (Date.now() - startTime < timeout) {
        const url = await this.getCurrentUrl();
        if (url.includes('dashboard') || url.includes('shops')) {
          return true;
        }
        await this.sleep(100);
      }

      return false;
    } catch {
      return false;
    }
  }

  // ========== Error Messages ==========

  /**
   * Get form-level error message
   * @returns Error message or null
   */
  async getFormError(): Promise<string | null> {
    try {
      // Try to find alert role (form error)
      const errorSelector: ElementSelector = {
        role: 'alert',
      };

      const isVisible = await this.isVisible(errorSelector, 5000);
      if (!isVisible) return null;

      return await this.elementAdapter.getText(errorSelector);
    } catch {
      return null;
    }
  }

  /**
   * Get email field validation error
   * @returns Error message or null
   */
  async getEmailError(): Promise<string | null> {
    try {
      const snapshot = await this.snapshotAdapter.takeSnapshot(this.pageAdapter.pageId);

      // Look for error text near email field
      const errorTexts = [
        /email.*required/i,
        /email.*invalid/i,
        /enter.*email/i,
        /valid.*email/i,
      ];

      for (const pattern of errorTexts) {
        const uid = this.snapshotAdapter.findElement(snapshot, {
          text: pattern,
        });

        if (uid) {
          return await this.elementAdapter.getText({ text: pattern });
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get password field validation error
   * @returns Error message or null
   */
  async getPasswordError(): Promise<string | null> {
    try {
      const snapshot = await this.snapshotAdapter.takeSnapshot(this.pageAdapter.pageId);

      // Look for error text near password field
      const errorTexts = [
        /password.*required/i,
        /password.*invalid/i,
        /enter.*password/i,
        /password.*short/i,
      ];

      for (const pattern of errorTexts) {
        const uid = this.snapshotAdapter.findElement(snapshot, {
          text: pattern,
        });

        if (uid) {
          return await this.elementAdapter.getText({ text: pattern });
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  // ========== Password Visibility Toggle ==========

  /**
   * Toggle password visibility
   */
  async togglePasswordVisibility(): Promise<void> {
    const toggleSelector: ElementSelector = {
      role: 'button',
      name: /show.*password|hide.*password|toggle.*password/i,
    };

    await this.elementAdapter.click(toggleSelector);
  }

  /**
   * Check if password is visible
   * @returns True if password input type is 'text'
   */
  async isPasswordVisible(): Promise<boolean> {
    // Use evaluate_script to check input type attribute
    // @ts-ignore - MCP tools are provided globally
    const result = await mcp__chrome_devtools__evaluate_script({
      function: `() => {
        const passwordInputs = Array.from(document.querySelectorAll('input'));
        const passwordInput = passwordInputs.find(input =>
          input.name === 'password' ||
          input.type === 'password' ||
          input.type === 'text' && input.getAttribute('aria-label')?.toLowerCase().includes('password')
        );
        return passwordInput ? passwordInput.type : null;
      }`,
    });

    return result === 'text';
  }

  // ========== Navigation Links ==========

  /**
   * Navigate to forgot password page
   */
  async gotoForgotPassword(): Promise<void> {
    const linkSelector: ElementSelector = {
      role: 'link',
      text: /forgot.*password|reset.*password/i,
    };

    await this.clickAndNavigate(linkSelector);

    // Wait for URL to contain 'forgot' or 'reset'
    await this.expectUrl(/forgot|reset/);
  }

  /**
   * Navigate to register page
   */
  async gotoRegister(): Promise<void> {
    const linkSelector: ElementSelector = {
      role: 'link',
      text: /sign up|register|create.*account/i,
    };

    await this.clickAndNavigate(linkSelector);

    // Wait for URL to contain 'register' or 'signup'
    await this.expectUrl(/register|signup/);
  }

  // ========== OAuth ==========

  /**
   * Click Google login button
   */
  async clickGoogleLogin(): Promise<void> {
    const googleButtonSelector: ElementSelector = {
      role: 'button',
      text: /google/i,
    };

    await this.elementAdapter.click(googleButtonSelector);
  }

  /**
   * Check if Google login button is visible
   * @returns True if Google login button is present
   */
  async hasGoogleLogin(): Promise<boolean> {
    const googleButtonSelector: ElementSelector = {
      role: 'button',
      text: /google/i,
    };

    return await this.isVisible(googleButtonSelector, 2000);
  }

  // ========== Assertions ==========

  /**
   * Assert we're on the login page
   */
  async expectLoginPage(): Promise<void> {
    // Check for email input
    await expect(this.getEmailInputSelector(), this.elementAdapter).toBeVisible();

    // Check for password input
    await expect(this.getPasswordInputSelector(), this.elementAdapter).toBeVisible();

    // Check for submit button
    const submitSelector = await this.getSubmitButtonSelector();
    await expect(submitSelector, this.elementAdapter).toBeVisible();
  }

  /**
   * Assert invalid credentials error is shown
   */
  async expectInvalidCredentialsError(): Promise<void> {
    const error = await this.getFormError();

    if (!error) {
      throw new Error('No form error found');
    }

    const errorLower = error.toLowerCase();
    const hasInvalidMessage =
      errorLower.includes('invalid') ||
      errorLower.includes('incorrect') ||
      errorLower.includes('wrong') ||
      errorLower.includes('not found') ||
      errorLower.includes('failed');

    if (!hasInvalidMessage) {
      throw new Error(
        `Error message does not indicate invalid credentials: "${error}"`
      );
    }
  }

  /**
   * Assert email validation error is shown
   */
  async expectEmailError(): Promise<void> {
    const error = await this.getEmailError();

    if (!error) {
      throw new Error('No email validation error found');
    }
  }

  /**
   * Assert password validation error is shown
   */
  async expectPasswordError(): Promise<void> {
    const error = await this.getPasswordError();

    if (!error) {
      throw new Error('No password validation error found');
    }
  }

  /**
   * Assert successful login (redirected to dashboard/shops)
   */
  async expectSuccessfulLogin(): Promise<void> {
    const url = await this.getCurrentUrl();
    const isRedirected = url.includes('dashboard') || url.includes('shops');

    if (!isRedirected) {
      throw new Error(`Not redirected to dashboard/shops. Current URL: ${url}`);
    }
  }
}
