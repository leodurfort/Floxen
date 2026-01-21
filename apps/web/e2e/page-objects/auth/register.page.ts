import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Register page object
 * Handles multi-step registration flow:
 * 1. Start - Enter email
 * 2. Verify - Enter verification code
 * 3. Password - Set password
 * 4. Complete - Enter profile info (name)
 */
export class RegisterPage extends BasePage {
  // Step 1: Email
  readonly emailInput: Locator;
  readonly startButton: Locator;

  // Step 2: Verification
  readonly verificationCodeInput: Locator;
  readonly verifyButton: Locator;
  readonly resendCodeButton: Locator;

  // Step 3: Password
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly setPasswordButton: Locator;

  // Step 4: Profile
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly surnameInput: Locator;
  readonly completeButton: Locator;

  // Common elements
  readonly backButton: Locator;
  readonly loginLink: Locator;
  readonly googleButton: Locator;
  readonly formError: Locator;
  readonly stepIndicator: Locator;

  // Password requirements
  readonly passwordStrength: Locator;
  readonly passwordRequirements: Locator;

  constructor(page: Page) {
    super(page);

    // Step 1: Email input
    this.emailInput = page.locator(
      'input[name="email"], ' +
        'input[type="email"], ' +
        '[data-testid="email-input"]'
    );
    this.startButton = page.locator(
      'button[type="submit"]:has-text("Continue"), ' +
        'button[type="submit"]:has-text("Next"), ' +
        'button[type="submit"]:has-text("Start"), ' +
        '[data-testid="start-button"]'
    );

    // Step 2: Verification code
    this.verificationCodeInput = page.locator(
      'input[name="code"], ' +
        'input[name="verificationCode"], ' +
        'input[placeholder*="code" i], ' +
        '[data-testid="verification-code-input"]'
    );
    this.verifyButton = page.locator(
      'button[type="submit"]:has-text("Verify"), ' +
        'button[type="submit"]:has-text("Confirm"), ' +
        '[data-testid="verify-button"]'
    );
    this.resendCodeButton = page.locator(
      'button:has-text("Resend"), ' +
        'a:has-text("Resend"), ' +
        '[data-testid="resend-code"]'
    );

    // Step 3: Password
    this.passwordInput = page.locator(
      'input[name="password"]:not([name="confirmPassword"]), ' +
        'input[type="password"]:first-of-type, ' +
        '[data-testid="password-input"]'
    );
    this.confirmPasswordInput = page.locator(
      'input[name="confirmPassword"], ' +
        'input[type="password"]:last-of-type, ' +
        '[data-testid="confirm-password-input"]'
    );
    this.setPasswordButton = page.locator(
      'button[type="submit"]:has-text("Set password"), ' +
        'button[type="submit"]:has-text("Continue"), ' +
        '[data-testid="set-password-button"]'
    );

    // Step 4: Profile
    this.firstNameInput = page.locator(
      'input[name="firstName"], ' +
        'input[placeholder*="first name" i], ' +
        '[data-testid="first-name-input"]'
    );
    this.lastNameInput = page.locator(
      'input[name="lastName"], ' +
        'input[placeholder*="last name" i], ' +
        '[data-testid="last-name-input"]'
    );
    this.surnameInput = page.locator(
      'input[name="surname"], ' +
        'input[placeholder*="surname" i], ' +
        '[data-testid="surname-input"]'
    );
    this.completeButton = page.locator(
      'button[type="submit"]:has-text("Complete"), ' +
        'button[type="submit"]:has-text("Finish"), ' +
        'button[type="submit"]:has-text("Create account"), ' +
        '[data-testid="complete-button"]'
    );

    // Common elements
    this.backButton = page.locator(
      'button:has-text("Back"), ' +
        'a:has-text("Back"), ' +
        '[data-testid="back-button"]'
    );
    this.loginLink = page.locator(
      'a[href*="login"], ' +
        'a:has-text("Log in"), ' +
        'a:has-text("Sign in"), ' +
        '[data-testid="login-link"]'
    );
    this.googleButton = page.locator(
      'button:has-text("Google"), ' +
        '[data-testid="google-register"]'
    );
    this.formError = page.locator(
      '[data-testid="form-error"], ' +
        '.form-error, ' +
        '[role="alert"]'
    );
    this.stepIndicator = page.locator(
      '[data-testid="step-indicator"], ' +
        '.step-indicator, ' +
        '.progress-steps'
    );

    // Password strength/requirements
    this.passwordStrength = page.locator(
      '[data-testid="password-strength"], ' +
        '.password-strength'
    );
    this.passwordRequirements = page.locator(
      '[data-testid="password-requirements"], ' +
        '.password-requirements'
    );
  }

  /**
   * Navigate to register page
   */
  async goto(): Promise<void> {
    await super.goto('/register');
    await this.waitForLoad();
  }

  /**
   * Step 1: Enter email and continue
   */
  async startRegistration(email: string): Promise<void> {
    await this.fillField(this.emailInput, email);
    await this.startButton.click();
  }

  /**
   * Step 2: Enter verification code
   */
  async verifyEmail(code: string): Promise<void> {
    await expect(this.verificationCodeInput).toBeVisible({ timeout: 10000 });
    await this.fillField(this.verificationCodeInput, code);
    await this.verifyButton.click();
  }

  /**
   * Step 3: Set password
   */
  async setPassword(password: string, confirmPassword?: string): Promise<void> {
    await expect(this.passwordInput).toBeVisible({ timeout: 10000 });
    await this.fillField(this.passwordInput, password);

    // Use same password for confirmation if not provided
    if (this.confirmPasswordInput) {
      await this.fillField(this.confirmPasswordInput, confirmPassword || password);
    }

    await this.setPasswordButton.click();
  }

  /**
   * Step 4: Complete profile
   */
  async completeProfile(firstName: string, surname: string): Promise<void> {
    await expect(this.firstNameInput.or(this.lastNameInput.or(this.surnameInput))).toBeVisible({
      timeout: 10000,
    });

    // Fill available name fields
    if (await this.firstNameInput.isVisible().catch(() => false)) {
      await this.fillField(this.firstNameInput, firstName);
    }

    if (await this.lastNameInput.isVisible().catch(() => false)) {
      await this.fillField(this.lastNameInput, surname);
    } else if (await this.surnameInput.isVisible().catch(() => false)) {
      await this.fillField(this.surnameInput, surname);
    }

    await this.completeButton.click();
  }

  /**
   * Complete full registration flow (all steps)
   * Note: In real tests, you'll need to get the verification code
   * from an email service or use a test bypass
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
    return await this.isVisible(this.verificationCodeInput);
  }

  /**
   * Check if on password step
   */
  async isOnPasswordStep(): Promise<boolean> {
    const passwordVisible = await this.isVisible(this.passwordInput);
    const emailNotVisible = !(await this.isVisible(this.emailInput));
    return passwordVisible && emailNotVisible;
  }

  /**
   * Check if on profile step
   */
  async isOnProfileStep(): Promise<boolean> {
    return (
      (await this.isVisible(this.firstNameInput)) ||
      (await this.isVisible(this.surnameInput))
    );
  }

  /**
   * Click resend code button
   */
  async resendCode(): Promise<void> {
    await this.resendCodeButton.click();
  }

  /**
   * Go back to previous step
   */
  async goBack(): Promise<void> {
    await this.backButton.click();
  }

  /**
   * Navigate to login page
   */
  async gotoLogin(): Promise<void> {
    await this.loginLink.click();
    await this.page.waitForURL(/.*login.*/);
  }

  /**
   * Click Google register button
   */
  async clickGoogleRegister(): Promise<void> {
    await this.googleButton.click();
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
   * Verify registration page is displayed
   */
  async expectRegisterPage(): Promise<void> {
    // Should be on email step initially
    await expect(this.emailInput).toBeVisible();
    await expect(this.startButton).toBeVisible();
  }

  /**
   * Verify moved to verification step
   */
  async expectVerificationStep(): Promise<void> {
    await expect(this.verificationCodeInput).toBeVisible({ timeout: 10000 });
    await expect(this.verifyButton).toBeVisible();
  }

  /**
   * Verify moved to password step
   */
  async expectPasswordStep(): Promise<void> {
    await expect(this.passwordInput).toBeVisible({ timeout: 10000 });
  }

  /**
   * Verify moved to profile step
   */
  async expectProfileStep(): Promise<void> {
    await expect(this.firstNameInput.or(this.surnameInput)).toBeVisible({
      timeout: 10000,
    });
  }

  /**
   * Verify registration complete (redirected)
   */
  async expectRegistrationComplete(): Promise<void> {
    await this.page.waitForURL(/.*dashboard.*|.*shops.*|.*onboarding.*/, {
      timeout: 15000,
    });
  }
}
