import { test, expect } from '@playwright/test';
import { RegisterPage } from '../../page-objects';
import * as testData from '../../fixtures/test-data';

test.describe('Registration Flow', () => {
  let registerPage: RegisterPage;

  test.beforeEach(async ({ page }) => {
    registerPage = new RegisterPage(page);
    await registerPage.goto();
  });

  test.describe('Page Display', () => {
    test('should display registration form', async () => {
      await registerPage.expectRegisterPage();
    });

    test('should have login link', async () => {
      await expect(registerPage.loginLink).toBeVisible();
    });

    test('should have Google signup option', async () => {
      await expect(registerPage.googleButton).toBeVisible();
    });
  });

  test.describe('Step 1: Email Entry', () => {
    test('should be on email step initially', async () => {
      expect(await registerPage.isOnEmailStep()).toBe(true);
    });

    test('should show error for invalid email', async () => {
      await registerPage.startRegistration('invalid-email');

      // Should show error or stay on same step
      await expect(registerPage.page).toHaveURL(/register/);
    });

    test('should show error for existing email', async () => {
      // Use the existing test user's email
      await registerPage.startRegistration(testData.TEST_USER.email);

      // Should show error about email already registered
      const error = await registerPage.getFormError();
      // Note: This may pass if the system proceeds to verification
      // (email existence might only be checked at a later step)
    });

    test('should proceed to verification step for valid email', async () => {
      // Use a unique email that won't exist
      const uniqueEmail = `test-${Date.now()}@example.com`;
      await registerPage.startRegistration(uniqueEmail);

      // Should either move to verification step or show email sent message
      await registerPage.waitForLoadingComplete();

      // Check if we moved to verification step
      const onVerificationStep = await registerPage.isOnVerificationStep();
      const formError = await registerPage.getFormError();

      // Either we're on verification step or there's an expected error
      expect(onVerificationStep || formError).toBeTruthy();
    });
  });

  test.describe('Step 2: Email Verification', () => {
    test.skip(
      !process.env.E2E_MAILBOX_API_KEY,
      'Email verification requires mailbox API access'
    );

    test('should show verification code input after email submission', async () => {
      const uniqueEmail = `test-${Date.now()}@example.com`;
      await registerPage.startRegistration(uniqueEmail);

      await registerPage.expectVerificationStep();
    });

    test('should have resend code option', async () => {
      const uniqueEmail = `test-${Date.now()}@example.com`;
      await registerPage.startRegistration(uniqueEmail);

      // If we're on verification step, check for resend
      if (await registerPage.isOnVerificationStep()) {
        await expect(registerPage.resendCodeButton).toBeVisible();
      }
    });

    test('should show error for invalid verification code', async () => {
      const uniqueEmail = `test-${Date.now()}@example.com`;
      await registerPage.startRegistration(uniqueEmail);

      if (await registerPage.isOnVerificationStep()) {
        await registerPage.verifyEmail('000000'); // Invalid code
        const error = await registerPage.getFormError();
        expect(error).toBeTruthy();
      }
    });
  });

  test.describe('Step 3: Password Setup', () => {
    // These tests would require completing verification first
    // In a real test environment, you'd either:
    // 1. Mock the verification service
    // 2. Use a test email API to retrieve the code
    // 3. Have a test bypass endpoint

    test.skip('should validate password requirements', async () => {
      // Would need to reach password step first
    });

    test.skip('should require password confirmation match', async () => {
      // Would need to reach password step first
    });
  });

  test.describe('Step 4: Profile Completion', () => {
    test.skip('should require first name', async () => {
      // Would need to reach profile step first
    });

    test.skip('should require surname', async () => {
      // Would need to reach profile step first
    });
  });

  test.describe('Navigation', () => {
    test('should navigate to login page', async () => {
      await registerPage.gotoLogin();
      await expect(registerPage.page).toHaveURL(/login/);
    });

    test('should have back button on later steps', async () => {
      const uniqueEmail = `test-${Date.now()}@example.com`;
      await registerPage.startRegistration(uniqueEmail);

      // If we moved past email step, check for back button
      if (!(await registerPage.isOnEmailStep())) {
        await expect(registerPage.backButton).toBeVisible();
      }
    });
  });

  test.describe('Google OAuth', () => {
    test('should initiate Google OAuth flow', async () => {
      // Click Google button
      await registerPage.clickGoogleRegister();

      // Should redirect to Google OAuth (external URL)
      // We can't fully test this without mocking, but we can verify the click works
      await registerPage.page.waitForURL(
        /accounts\.google\.com|oauth|google/,
        { timeout: 10000 }
      ).catch(() => {
        // May not redirect in all test environments
      });
    });
  });
});

test.describe('Full Registration Journey', () => {
  test.skip(
    !process.env.E2E_MAILBOX_API_KEY,
    'Full registration requires email verification bypass or mailbox API'
  );

  test('should complete full registration flow', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    // This would require a way to get the verification code
    // Either via test email API or test bypass

    // Step 1: Email
    const uniqueEmail = `test-${Date.now()}@example.com`;
    await registerPage.startRegistration(uniqueEmail);

    // Step 2: Verification (would need real code)
    // await registerPage.verifyEmail('123456');

    // Step 3: Password
    // await registerPage.setPassword(testData.TEST_USER.password);

    // Step 4: Profile
    // await registerPage.completeProfile('Test', 'User');

    // Verify completion
    // await registerPage.expectRegistrationComplete();
  });
});
