import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Login page object
 */
export class LoginPage extends BasePage {
  // Form elements
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly forgotPasswordLink: Locator;
  readonly registerLink: Locator;
  readonly googleButton: Locator;

  // Validation messages
  readonly emailError: Locator;
  readonly passwordError: Locator;
  readonly formError: Locator;

  // Password visibility toggle
  readonly passwordToggle: Locator;

  constructor(page: Page) {
    super(page);

    // Form inputs
    this.emailInput = page.locator(
      'input[name="email"], ' +
        'input[type="email"], ' +
        'input[placeholder*="email" i], ' +
        '[data-testid="email-input"]'
    );
    this.passwordInput = page.locator(
      'input[name="password"], ' +
        'input[type="password"], ' +
        '[data-testid="password-input"]'
    );
    this.submitButton = page.locator(
      'button[type="submit"], ' +
        'button:has-text("Log in"), ' +
        'button:has-text("Login"), ' +
        'button:has-text("Sign in"), ' +
        '[data-testid="login-button"]'
    );

    // Links
    this.forgotPasswordLink = page.locator(
      'a[href*="forgot"], ' +
        'a:has-text("Forgot"), ' +
        'a:has-text("Reset password"), ' +
        '[data-testid="forgot-password-link"]'
    );
    this.registerLink = page.locator(
      'a[href*="register"], ' +
        'a[href*="signup"], ' +
        'a:has-text("Sign up"), ' +
        'a:has-text("Create account"), ' +
        '[data-testid="register-link"]'
    );

    // Google OAuth
    this.googleButton = page.locator(
      'button:has-text("Google"), ' +
        '[data-testid="google-login"], ' +
        '.google-login-button'
    );

    // Error messages
    this.emailError = page.locator(
      '[data-testid="email-error"], ' +
        'input[name="email"] ~ .error, ' +
        '#email-error'
    );
    this.passwordError = page.locator(
      '[data-testid="password-error"], ' +
        'input[name="password"] ~ .error, ' +
        '#password-error'
    );
    this.formError = page.locator(
      '[data-testid="form-error"], ' +
        '.form-error, ' +
        '[role="alert"]:not(.toast)'
    );

    // Password toggle
    this.passwordToggle = page.locator(
      'button[aria-label*="password" i], ' +
        '[data-testid="password-toggle"], ' +
        '.password-toggle'
    );
  }

  /**
   * Navigate to login page
   */
  async goto(): Promise<void> {
    await super.goto('/login');
    await this.waitForLoad();
  }

  /**
   * Fill login form
   */
  async fillForm(email: string, password: string): Promise<void> {
    await this.fillField(this.emailInput, email);
    await this.fillField(this.passwordInput, password);
  }

  /**
   * Submit login form
   */
  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  /**
   * Perform complete login
   */
  async login(email: string, password: string): Promise<void> {
    await this.fillForm(email, password);
    await this.submit();
  }

  /**
   * Login and wait for redirect to dashboard
   */
  async loginAndWaitForDashboard(email: string, password: string): Promise<void> {
    await this.login(email, password);
    await this.page.waitForURL(/.*dashboard.*|.*shops.*/, { timeout: 15000 });
    await this.waitForLoadingComplete();
  }

  /**
   * Check if login was successful (redirected away from login page)
   */
  async isLoginSuccessful(): Promise<boolean> {
    try {
      await this.page.waitForURL(/.*dashboard.*|.*shops.*/, { timeout: 10000 });
      return true;
    } catch {
      return false;
    }
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
   * Get email validation error
   */
  async getEmailError(): Promise<string | null> {
    try {
      await expect(this.emailError.first()).toBeVisible({ timeout: 3000 });
      return await this.emailError.first().textContent();
    } catch {
      return null;
    }
  }

  /**
   * Get password validation error
   */
  async getPasswordError(): Promise<string | null> {
    try {
      await expect(this.passwordError.first()).toBeVisible({ timeout: 3000 });
      return await this.passwordError.first().textContent();
    } catch {
      return null;
    }
  }

  /**
   * Toggle password visibility
   */
  async togglePasswordVisibility(): Promise<void> {
    await this.passwordToggle.click();
  }

  /**
   * Check if password is visible (input type is text)
   */
  async isPasswordVisible(): Promise<boolean> {
    const type = await this.passwordInput.getAttribute('type');
    return type === 'text';
  }

  /**
   * Navigate to forgot password page
   */
  async gotoForgotPassword(): Promise<void> {
    await this.forgotPasswordLink.click();
    await this.page.waitForURL(/.*forgot.*|.*reset.*/);
  }

  /**
   * Navigate to register page
   */
  async gotoRegister(): Promise<void> {
    await this.registerLink.click();
    await this.page.waitForURL(/.*register.*|.*signup.*/);
  }

  /**
   * Click Google login button
   */
  async clickGoogleLogin(): Promise<void> {
    await this.googleButton.click();
  }

  /**
   * Verify login page is displayed
   */
  async expectLoginPage(): Promise<void> {
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }

  /**
   * Verify error for invalid credentials
   */
  async expectInvalidCredentialsError(): Promise<void> {
    const error = await this.getFormError();
    expect(error).toBeTruthy();
    expect(error?.toLowerCase()).toMatch(/invalid|incorrect|wrong|not found/);
  }
}
