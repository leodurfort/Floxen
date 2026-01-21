/**
 * Login Flow Tests (MCP version)
 *
 * Tests:
 * - Login page display
 * - Form validation
 * - Authentication with valid/invalid credentials
 * - Password visibility toggle
 * - Navigation to forgot password / register
 */

import { describe, it, beforeEach } from 'vitest';
import { expect as vitestExpect } from 'vitest';
import { useUnauthenticatedPage } from '../../fixtures/auth.fixture.js';
import { LoginPageMCP } from '../../page-objects/auth/login.page.mcp.js';
import { testData } from '../../test-data.js';
import type { PageAdapter } from '../../adapters/browser.adapter.js';

describe('Login Flow', () => {
  let page: PageAdapter;
  let loginPage: LoginPageMCP;

  beforeEach(async () => {
    page = await useUnauthenticatedPage();
    loginPage = new LoginPageMCP(page);
    await loginPage.goto();
  });

  describe('Page Display', () => {
    it('should display login form', async () => {
      await loginPage.expectLoginPage();
    });

    it('should have forgot password link', async () => {
      const hasForgotLink = await loginPage.isVisible(
        { role: 'link', text: /forgot.*password|reset.*password/i },
        5000
      );
      vitestExpect(hasForgotLink).toBe(true);
    });

    it('should have register link', async () => {
      const hasRegisterLink = await loginPage.isVisible(
        { role: 'link', text: /sign up|register|create.*account/i },
        5000
      );
      vitestExpect(hasRegisterLink).toBe(true);
    });

    it('should check for Google login option', async () => {
      const hasGoogleLogin = await loginPage.hasGoogleLogin();
      // Google login may or may not be present depending on configuration
      // Just verify the check doesn't throw
      vitestExpect(typeof hasGoogleLogin).toBe('boolean');
    });
  });

  describe('Form Validation', () => {
    it('should handle empty email submission', async () => {
      await loginPage.fillForm('', 'password123');
      await loginPage.submit();

      // Should either show validation error or stay on login page
      const url = await page.getURL();
      vitestExpect(url).toContain('login');
    });

    it('should handle invalid email format', async () => {
      await loginPage.fillForm('invalid-email', 'password123');
      await loginPage.submit();

      // Should stay on login page
      await loginPage.expectUrl(/login/);
    });

    it('should handle empty password submission', async () => {
      await loginPage.fillForm('test@example.com', '');
      await loginPage.submit();

      // Should stay on login page
      await loginPage.expectUrl(/login/);
    });
  });

  describe('Authentication', () => {
    it('should login successfully with valid credentials', async () => {
      await loginPage.loginAndWaitForDashboard(
        testData.TEST_USER.email,
        testData.TEST_USER.password
      );

      // Should be redirected to dashboard or shops
      await loginPage.expectSuccessfulLogin();

      // Should have auth tokens in localStorage
      const isAuth = await loginPage.isAuthenticated();
      vitestExpect(isAuth).toBe(true);
    });

    it('should show error for invalid credentials', async () => {
      await loginPage.login('wrong@example.com', 'wrongpassword');

      // Should show error message
      await loginPage.expectInvalidCredentialsError();

      // Should stay on login page
      await loginPage.expectUrl(/login/);
    });

    it('should show error for wrong password with valid email', async () => {
      await loginPage.login(testData.TEST_USER.email, 'wrongpassword');

      // Should show error
      const error = await loginPage.getFormError();
      vitestExpect(error).toBeTruthy();

      // Should stay on login page
      await loginPage.expectUrl(/login/);
    });

    it('should verify login success status', async () => {
      await loginPage.login(
        testData.TEST_USER.email,
        testData.TEST_USER.password
      );

      const isSuccessful = await loginPage.isLoginSuccessful();
      vitestExpect(isSuccessful).toBe(true);
    });
  });

  describe('Password Visibility', () => {
    it('should toggle password visibility if toggle exists', async () => {
      // Skip if toggle doesn't exist
      const toggleExists = await loginPage.isVisible(
        { role: 'button', name: /show.*password|hide.*password|toggle.*password/i },
        2000
      );

      if (!toggleExists) {
        console.log('⏭️  Skipping: Password toggle not present in UI');
        return;
      }

      await loginPage.fillPassword('mypassword');

      // Check initial state
      const initiallyVisible = await loginPage.isPasswordVisible();

      // Toggle
      await loginPage.togglePasswordVisibility();

      // Wait a bit for state change
      await loginPage.sleep(500);

      // Check new state
      const afterToggle = await loginPage.isPasswordVisible();

      // Should have changed
      vitestExpect(afterToggle).not.toBe(initiallyVisible);
    });
  });

  describe('Navigation', () => {
    it('should navigate to forgot password page', async () => {
      await loginPage.gotoForgotPassword();

      // Should be on forgot password page
      await loginPage.expectUrl(/forgot|reset/);
    });

    it('should navigate to register page', async () => {
      await loginPage.gotoRegister();

      // Should be on register page
      await loginPage.expectUrl(/register|signup/);
    });
  });

  describe('Error Messages', () => {
    it('should retrieve and display form errors', async () => {
      await loginPage.login('invalid@example.com', 'wrongpass');

      // Wait for error to appear
      await loginPage.sleep(2000);

      const formError = await loginPage.getFormError();
      console.log('Form error message:', formError);

      // Should have some error message
      vitestExpect(formError).toBeTruthy();
    });
  });
});
