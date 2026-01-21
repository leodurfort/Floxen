import { Page, expect } from '@playwright/test';

/**
 * WooCommerce OAuth flow helper
 * Handles the OAuth authorization on the WooCommerce side
 */

export interface OAuthResult {
  success: boolean;
  shopId?: string;
  error?: string;
}

/**
 * Complete WooCommerce OAuth authorization flow
 * This handles clicking approve on the WooCommerce authorization page
 */
export async function completeWooCommerceOAuth(
  page: Page,
  storeCredentials?: {
    username: string;
    password: string;
  }
): Promise<OAuthResult> {
  try {
    // Wait for WooCommerce authorization page
    await page.waitForURL(/.*woocommerce.*|.*wp-admin.*|.*oauth.*/, {
      timeout: 30000,
    });

    // If we're redirected to WP login, log in first
    const loginForm = page.locator('#loginform, form[name="loginform"]');
    if (await loginForm.isVisible({ timeout: 2000 }).catch(() => false)) {
      if (!storeCredentials) {
        return {
          success: false,
          error: 'WooCommerce login required but no credentials provided',
        };
      }

      await page.fill('#user_login', storeCredentials.username);
      await page.fill('#user_pass', storeCredentials.password);
      await page.click('#wp-submit');

      // Wait for redirect to authorization page
      await page.waitForURL(/.*woocommerce.*authorize.*|.*oauth.*/, {
        timeout: 15000,
      });
    }

    // Look for the approve/authorize button on WooCommerce OAuth page
    const approveButton = page.locator(
      'button:has-text("Approve"), ' +
        'input[type="submit"][value*="Approve"], ' +
        'a:has-text("Approve"), ' +
        '.wc-auth-approve, ' +
        '#approve'
    );

    // Wait for and click approve button
    await expect(approveButton.first()).toBeVisible({ timeout: 10000 });
    await approveButton.first().click();

    // Wait for redirect back to our app with success
    await page.waitForURL(/.*oauth=complete.*|.*shop.*|.*callback.*success.*/, {
      timeout: 30000,
    });

    // Extract shop ID from URL or page content if available
    const url = page.url();
    const shopIdMatch = url.match(/shopId=([a-f0-9-]+)/i);
    const shopId = shopIdMatch ? shopIdMatch[1] : undefined;

    return {
      success: true,
      shopId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'OAuth flow failed',
    };
  }
}

/**
 * Initiate WooCommerce connection from the Floxen app
 */
export async function initiateWooCommerceConnection(
  page: Page,
  storeUrl: string
): Promise<void> {
  // Look for the connect button or add shop button
  const connectButton = page.locator(
    'button:has-text("Connect"), ' +
      'button:has-text("Add Shop"), ' +
      'a:has-text("Connect WooCommerce")'
  );

  await connectButton.first().click();

  // Fill in the store URL if modal appears
  const storeUrlInput = page.locator(
    'input[placeholder*="store"], ' +
      'input[name="storeUrl"], ' +
      'input[type="url"]'
  );

  if (await storeUrlInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await storeUrlInput.fill(storeUrl);

    // Submit the form
    const submitButton = page.locator(
      'button[type="submit"], ' + 'button:has-text("Connect"), ' + 'button:has-text("Continue")'
    );
    await submitButton.first().click();
  }
}

/**
 * Verify shop is connected and visible in the shop list
 */
export async function verifyShopConnected(
  page: Page,
  shopName?: string
): Promise<boolean> {
  // Wait for shops page to load
  await page.waitForURL(/.*shop.*|.*dashboard.*/, { timeout: 10000 });

  // Look for connected shop indicator
  const connectedIndicator = page.locator(
    '[data-testid="shop-card"], ' +
      '.shop-item, ' +
      'text=Connected'
  );

  try {
    await expect(connectedIndicator.first()).toBeVisible({ timeout: 5000 });

    if (shopName) {
      const shopNameElement = page.locator(`text=${shopName}`);
      await expect(shopNameElement).toBeVisible({ timeout: 3000 });
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Disconnect a shop (for cleanup)
 */
export async function disconnectShop(page: Page, shopId: string): Promise<void> {
  // Navigate to shop settings or find disconnect button
  const shopCard = page.locator(`[data-shop-id="${shopId}"], [href*="${shopId}"]`);

  if (await shopCard.isVisible({ timeout: 3000 }).catch(() => false)) {
    // Click on shop to open settings
    await shopCard.click();

    // Look for disconnect/delete button
    const disconnectButton = page.locator(
      'button:has-text("Disconnect"), ' +
        'button:has-text("Remove"), ' +
        'button:has-text("Delete")'
    );

    await disconnectButton.click();

    // Confirm if modal appears
    const confirmButton = page.locator(
      'button:has-text("Confirm"), ' + 'button:has-text("Yes"), ' + '[data-testid="confirm-delete"]'
    );

    if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmButton.click();
    }
  }
}
