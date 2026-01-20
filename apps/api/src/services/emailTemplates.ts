/**
 * Email templates for authentication flows
 */

const baseStyles = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
  .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
  .header { text-align: center; margin-bottom: 30px; }
  .logo { font-size: 24px; font-weight: bold; color: #4c5fd5; }
  .content { background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px; }
  .code { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4c5fd5; text-align: center; padding: 20px; background: white; border-radius: 8px; margin: 20px 0; }
  .footer { text-align: center; font-size: 12px; color: #666; }
  .warning { font-size: 14px; color: #666; margin-top: 20px; }
`;

function wrapTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Floxen</div>
    </div>
    ${content}
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Floxen. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Email verification template
 */
export function getVerificationEmailHtml(code: string): string {
  return wrapTemplate(`
    <div class="content">
      <h2 style="margin: 0 0 15px 0; color: #1a1d29;">Verify your email</h2>
      <p>Welcome to Floxen! Use the code below to verify your email address:</p>
      <div class="code">${code}</div>
      <p class="warning">This code expires in 10 minutes. If you didn't create an account with Floxen, you can safely ignore this email.</p>
    </div>
  `);
}

/**
 * Password reset template
 */
export function getPasswordResetEmailHtml(code: string): string {
  return wrapTemplate(`
    <div class="content">
      <h2 style="margin: 0 0 15px 0; color: #1a1d29;">Reset your password</h2>
      <p>You requested to reset your password. Use the code below to continue:</p>
      <div class="code">${code}</div>
      <p class="warning">This code expires in 10 minutes. If you didn't request a password reset, you can safely ignore this email.</p>
    </div>
  `);
}

/**
 * Email change confirmation template
 */
export function getEmailChangeEmailHtml(code: string, newEmail: string): string {
  return wrapTemplate(`
    <div class="content">
      <h2 style="margin: 0 0 15px 0; color: #1a1d29;">Confirm your new email</h2>
      <p>You requested to change your email address to <strong>${newEmail}</strong>. Use the code below to confirm:</p>
      <div class="code">${code}</div>
      <p class="warning">This code expires in 10 minutes. If you didn't request this change, please secure your account immediately.</p>
    </div>
  `);
}

/**
 * Account deletion scheduled template
 */
export function getDeletionScheduledEmailHtml(deletionDate: string): string {
  return wrapTemplate(`
    <div class="content">
      <h2 style="margin: 0 0 15px 0; color: #dc2626;">Account deletion scheduled</h2>
      <p>Your Floxen account is scheduled for permanent deletion on:</p>
      <p style="font-size: 18px; font-weight: bold; text-align: center; padding: 15px; background: #fef2f2; border-radius: 8px; color: #dc2626;">${deletionDate}</p>
      <p>After this date, all your data including shops, products, and settings will be permanently removed.</p>
      <p class="warning">If you didn't request this deletion or want to keep your account, log in and cancel the deletion from your settings.</p>
    </div>
  `);
}

/**
 * Account deletion cancelled template
 */
export function getDeletionCancelledEmailHtml(): string {
  return wrapTemplate(`
    <div class="content">
      <h2 style="margin: 0 0 15px 0; color: #16a34a;">Account deletion cancelled</h2>
      <p>Good news! Your Floxen account deletion has been cancelled.</p>
      <p>Your account and all your data will remain intact. You can continue using Floxen as usual.</p>
    </div>
  `);
}

/**
 * Welcome email after completing registration
 */
export function getWelcomeEmailHtml(firstName: string): string {
  return wrapTemplate(`
    <div class="content">
      <h2 style="margin: 0 0 15px 0; color: #1a1d29;">Welcome to Floxen, ${firstName}!</h2>
      <p>Your account is now set up and ready to go. Here's what you can do next:</p>
      <ul style="padding-left: 20px;">
        <li><strong>Connect your WooCommerce store</strong> to start syncing products</li>
        <li><strong>Configure field mappings</strong> to customize how your products appear</li>
        <li><strong>Generate your product feed</strong> for ChatGPT integration</li>
      </ul>
      <p>If you have any questions, our support team is here to help.</p>
    </div>
  `);
}

/**
 * Account deleted confirmation template
 */
export function getAccountDeletedEmailHtml(): string {
  return wrapTemplate(`
    <div class="content">
      <h2 style="margin: 0 0 15px 0; color: #dc2626;">Account deleted</h2>
      <p>Your Floxen account has been permanently deleted.</p>
      <p>All your data including shops, products, and settings have been removed from our systems.</p>
      <p style="margin-top: 20px;">We're sorry to see you go. If you ever want to return, you're always welcome to create a new account.</p>
    </div>
  `);
}
