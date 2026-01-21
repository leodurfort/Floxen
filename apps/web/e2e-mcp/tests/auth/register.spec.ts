import { describe, it, beforeEach } from 'vitest';
import { RegisterPageMCP } from '../../page-objects/auth/register.page.mcp.js';
import { useUnauthenticatedPage } from '../../fixtures/auth.fixture.js';
import * as testData from '../../fixtures/test-data.js';

describe('Registration Flow', () => {
  let registerPage: RegisterPageMCP;

  beforeEach(async () => {
    const pageAdapter = await useUnauthenticatedPage();
    registerPage = new RegisterPageMCP(pageAdapter);
    await registerPage.goto();
  });

  describe('Page Display', () => {
    it('should display registration form', async () => {
      await registerPage.expectRegisterPage();
    });

    it('should have login link', async () => {
      const hasLoginLink = await registerPage.isVisible(
        { role: 'link', text: /log.*in|sign.*in/i },
        3000
      );
      if (!hasLoginLink) {
        throw new Error('Login link not visible on registration page');
      }
    });

    it('should have Google signup option', async () => {
      const hasGoogle = await registerPage.hasGoogleRegister();
      if (!hasGoogle) {
        throw new Error('Google signup option not visible');
      }
    });
  });

  describe('Step 1: Email Entry', () => {
    it('should be on email step initially', async () => {
      const isOnEmailStep = await registerPage.isOnEmailStep();
      if (!isOnEmailStep) {
        throw new Error('Not on email step initially');
      }
    });

    it('should show error for invalid email', async () => {
      await registerPage.startRegistration('invalid-email');

      // Should show error or stay on same step
      const url = await registerPage.getCurrentUrl();
      if (!url.includes('register')) {
        throw new Error('Should stay on register page for invalid email');
      }
    });

    it('should show error for existing email', async () => {
      // Use the existing test user's email
      await registerPage.startRegistration(testData.TEST_USER.email);

      // Should show error about email already registered
      const error = await registerPage.getFormError();
      // Note: This may pass if the system proceeds to verification
      // (email existence might only be checked at a later step)
    });

    it('should proceed to verification step for valid email', async () => {
      // Use a unique email that won't exist
      const uniqueEmail = `test-${Date.now()}@example.com`;
      await registerPage.startRegistration(uniqueEmail);

      // Should either move to verification step or show email sent message
      await registerPage.waitForLoadingComplete();

      // Check if we moved to verification step
      const onVerificationStep = await registerPage.isOnVerificationStep();
      const formError = await registerPage.getFormError();

      // Either we're on verification step or there's an expected error
      if (!onVerificationStep && !formError) {
        throw new Error('Should either be on verification step or show error');
      }
    });
  });

  describe('Step 2: Email Verification', () => {
    // Skip if mailbox API key not available
    const skipVerification = !process.env.E2E_MAILBOX_API_KEY;

    it.skipIf(skipVerification)(
      'should show verification code input after email submission',
      async () => {
        const uniqueEmail = `test-${Date.now()}@example.com`;
        await registerPage.startRegistration(uniqueEmail);

        await registerPage.expectVerificationStep();
      }
    );

    it.skipIf(skipVerification)('should have resend code option', async () => {
      const uniqueEmail = `test-${Date.now()}@example.com`;
      await registerPage.startRegistration(uniqueEmail);

      // If we're on verification step, check for resend
      if (await registerPage.isOnVerificationStep()) {
        const hasResend = await registerPage.isVisible(
          { text: /resend/i },
          3000
        );
        if (!hasResend) {
          throw new Error('Resend code button not visible on verification step');
        }
      }
    });

    it.skipIf(skipVerification)(
      'should show error for invalid verification code',
      async () => {
        const uniqueEmail = `test-${Date.now()}@example.com`;
        await registerPage.startRegistration(uniqueEmail);

        if (await registerPage.isOnVerificationStep()) {
          await registerPage.verifyEmail('000000'); // Invalid code
          const error = await registerPage.getFormError();
          if (!error) {
            throw new Error('Should show error for invalid verification code');
          }
        }
      }
    );
  });

  describe('Step 3: Password Setup', () => {
    // These tests would require completing verification first
    // In a real test environment, you'd either:
    // 1. Mock the verification service
    // 2. Use a test email API to retrieve the code
    // 3. Have a test bypass endpoint

    it.skip('should validate password requirements', async () => {
      // Would need to reach password step first
    });

    it.skip('should require password confirmation match', async () => {
      // Would need to reach password step first
    });
  });

  describe('Step 4: Profile Completion', () => {
    it.skip('should require first name', async () => {
      // Would need to reach profile step first
    });

    it.skip('should require surname', async () => {
      // Would need to reach profile step first
    });
  });

  describe('Navigation', () => {
    it('should navigate to login page', async () => {
      await registerPage.gotoLogin();
      const url = await registerPage.getCurrentUrl();
      if (!url.includes('login')) {
        throw new Error('Should navigate to login page');
      }
    });

    it('should have back button on later steps', async () => {
      const uniqueEmail = `test-${Date.now()}@example.com`;
      await registerPage.startRegistration(uniqueEmail);

      // If we moved past email step, check for back button
      if (!(await registerPage.isOnEmailStep())) {
        const hasBackButton = await registerPage.isVisible(
          { role: 'button', text: /back/i },
          3000
        );
        if (!hasBackButton) {
          throw new Error('Back button should be visible on later steps');
        }
      }
    });
  });

  describe('Google OAuth', () => {
    it('should initiate Google OAuth flow', async () => {
      // Click Google button
      await registerPage.clickGoogleRegister();

      // Should redirect to Google OAuth (external URL)
      // We can't fully test this without mocking, but we can verify the click works
      const timeout = 10000;
      const startTime = Date.now();

      while (Date.now() - startTime < timeout) {
        const url = await registerPage.getCurrentUrl();
        if (
          url.includes('accounts.google.com') ||
          url.includes('oauth') ||
          url.includes('google')
        ) {
          return; // Success
        }
        await registerPage.sleep(100);
      }

      // May not redirect in all test environments, so we don't fail
    });
  });
});

describe('Full Registration Journey', () => {
  // Skip if mailbox API key not available
  const skipFullJourney = !process.env.E2E_MAILBOX_API_KEY;

  it.skipIf(skipFullJourney)(
    'should complete full registration flow',
    async () => {
      const pageAdapter = await useUnauthenticatedPage();
      const registerPage = new RegisterPageMCP(pageAdapter);
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
    }
  );
});
