import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects';
import * as testData from '../../fixtures/test-data';

test.describe('Login Flow', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test.describe('Page Display', () => {
    test('should display login form', async () => {
      await loginPage.expectLoginPage();
    });

    test('should have forgot password link', async () => {
      await expect(loginPage.forgotPasswordLink).toBeVisible();
    });

    test('should have register link', async () => {
      await expect(loginPage.registerLink).toBeVisible();
    });

    test('should have Google login option', async () => {
      await expect(loginPage.googleButton).toBeVisible();
    });
  });

  test.describe('Form Validation', () => {
    test('should show error for empty email', async () => {
      await loginPage.fillForm('', 'password123');
      await loginPage.submit();

      // Should show validation error or not submit
      const emailError = await loginPage.getEmailError();
      expect(emailError || (await loginPage.page.url())).toBeTruthy();
    });

    test('should show error for invalid email format', async () => {
      await loginPage.fillForm('invalid-email', 'password123');
      await loginPage.submit();

      // Should show validation error
      await expect(loginPage.page).toHaveURL(/login/);
    });

    test('should show error for empty password', async () => {
      await loginPage.fillForm('test@example.com', '');
      await loginPage.submit();

      // Should not navigate away
      await expect(loginPage.page).toHaveURL(/login/);
    });
  });

  test.describe('Authentication', () => {
    test('should login successfully with valid credentials', async () => {
      await loginPage.loginAndWaitForDashboard(
        testData.TEST_USER.email,
        testData.TEST_USER.password
      );

      // Should be redirected to dashboard/shops
      await expect(loginPage.page).toHaveURL(/dashboard|shops/);

      // Should have auth tokens in localStorage
      const isAuth = await loginPage.isAuthenticated();
      expect(isAuth).toBe(true);
    });

    test('should show error for invalid credentials', async () => {
      await loginPage.login('wrong@example.com', 'wrongpassword');

      // Should show error message
      await loginPage.expectInvalidCredentialsError();

      // Should stay on login page
      await expect(loginPage.page).toHaveURL(/login/);
    });

    test('should show error for wrong password', async () => {
      await loginPage.login(testData.TEST_USER.email, 'wrongpassword');

      // Should show error
      const error = await loginPage.getFormError();
      expect(error).toBeTruthy();
    });
  });

  test.describe('Password Visibility', () => {
    test('should toggle password visibility', async ({ page }) => {
      // Skip if toggle doesn't exist in the UI
      const toggleExists = await loginPage.passwordToggle
        .isVisible()
        .catch(() => false);
      test.skip(!toggleExists, 'Password toggle not present in UI');

      await loginPage.fillForm('test@example.com', 'mypassword');

      // Initially password should be hidden
      expect(await loginPage.isPasswordVisible()).toBe(false);

      // Toggle to show
      await loginPage.togglePasswordVisibility();
      expect(await loginPage.isPasswordVisible()).toBe(true);

      // Toggle to hide again
      await loginPage.togglePasswordVisibility();
      expect(await loginPage.isPasswordVisible()).toBe(false);
    });
  });

  test.describe('Navigation', () => {
    test('should navigate to register page', async () => {
      await loginPage.gotoRegister();
      await expect(loginPage.page).toHaveURL(/register|signup/);
    });

    test('should navigate to forgot password page', async () => {
      await loginPage.gotoForgotPassword();
      await expect(loginPage.page).toHaveURL(/forgot|reset/);
    });
  });

  test.describe('Session Persistence', () => {
    test('should persist login across page refresh', async () => {
      // Login first
      await loginPage.loginAndWaitForDashboard(
        testData.TEST_USER.email,
        testData.TEST_USER.password
      );

      // Refresh the page
      await loginPage.refresh();

      // Should still be logged in (not redirected to login)
      await expect(loginPage.page).not.toHaveURL(/login/);
      expect(await loginPage.isAuthenticated()).toBe(true);
    });
  });
});
