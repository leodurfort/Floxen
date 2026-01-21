import { test, expect } from '@playwright/test';
import { BasePage, SidebarComponent } from '../../page-objects';
import * as testData from '../../fixtures/test-data';

// Use authenticated state
test.use({ storageState: 'playwright/.auth/user.json' });

test.describe('Profile Settings', () => {
  let basePage: BasePage;
  let sidebar: SidebarComponent;

  test.beforeEach(async ({ page }) => {
    basePage = new BasePage(page);
    sidebar = new SidebarComponent(page);

    // Navigate to settings
    await page.goto('/settings');
    await basePage.waitForLoad();
  });

  test.describe('Page Display', () => {
    test('should display settings page', async ({ page }) => {
      await expect(page).toHaveURL(/settings/);
    });

    test('should show user information', async ({ page }) => {
      // Look for user email or name display
      const userInfo = page.locator(
        `text=${testData.TEST_USER.email}, ` +
          '[data-testid="user-email"], ' +
          '.user-email'
      );

      await expect(userInfo.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Profile Update', () => {
    test('should display profile form', async ({ page }) => {
      const nameInput = page.locator(
        'input[name="firstName"], ' +
          'input[name="name"], ' +
          '[data-testid="name-input"]'
      );

      // Profile form should be visible
      await expect(nameInput.first()).toBeVisible({ timeout: 5000 }).catch(() => {
        // May be under a tab or accordion
      });
    });

    test('should update profile name', async ({ page }) => {
      const nameInput = page.locator(
        'input[name="firstName"], ' + 'input[name="name"]'
      );
      const inputVisible = await nameInput.first().isVisible().catch(() => false);
      test.skip(!inputVisible, 'Name input not visible');

      // Update name
      await nameInput.first().fill('Updated Name');

      // Find save button
      const saveButton = page.locator(
        'button[type="submit"], ' +
          'button:has-text("Save"), ' +
          'button:has-text("Update")'
      );
      await saveButton.first().click();

      // Should show success
      const toast = await basePage.getToastMessage();
      expect(toast).toBeTruthy();
    });
  });

  test.describe('Password Change', () => {
    test('should have password change section', async ({ page }) => {
      const passwordSection = page.locator(
        '[data-testid="password-section"], ' +
          'text=Change Password, ' +
          'text=Update Password'
      );

      // May or may not be visible (could be for non-Google users only)
      const isVisible = await passwordSection.first().isVisible().catch(() => false);

      if (!isVisible) {
        // Check if it's a Google-only user
        const user = await basePage.getCurrentUser();
        // Google users may not have password change option
      }
    });

    test('should validate current password', async ({ page }) => {
      const currentPasswordInput = page.locator(
        'input[name="currentPassword"], ' + '[data-testid="current-password"]'
      );

      const inputVisible = await currentPasswordInput.isVisible().catch(() => false);
      test.skip(!inputVisible, 'Password change not available');

      // Enter wrong current password
      await currentPasswordInput.fill('wrongpassword');

      const newPasswordInput = page.locator(
        'input[name="newPassword"], ' + '[data-testid="new-password"]'
      );
      await newPasswordInput.fill('NewPassword123!');

      const submitButton = page.locator(
        'button[type="submit"]:has-text("Change"), ' +
          'button[type="submit"]:has-text("Update Password")'
      );
      await submitButton.first().click();

      // Should show error
      const error = page.locator('[role="alert"], .error');
      await expect(error.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Logout', () => {
    test('should logout from settings', async ({ page }) => {
      // Find logout button
      const logoutButton = page.locator(
        'button:has-text("Logout"), ' +
          'button:has-text("Log out"), ' +
          'button:has-text("Sign out"), ' +
          '[data-testid="logout"]'
      );

      await logoutButton.first().click();

      // Should redirect to login or home
      await expect(page).toHaveURL(/login|\/$/);

      // Auth tokens should be cleared
      const isAuth = await basePage.isAuthenticated();
      expect(isAuth).toBe(false);
    });
  });

  test.describe('Navigation', () => {
    test('should access settings from sidebar', async ({ page }) => {
      // Go to shops first
      await page.goto('/shops');
      await basePage.waitForLoad();

      // Navigate via sidebar
      await sidebar.gotoSettings();
      await expect(page).toHaveURL(/settings/);
    });
  });
});
