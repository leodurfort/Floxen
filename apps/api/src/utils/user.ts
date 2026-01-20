// Sanitized user response - excludes sensitive fields like passwordHash, Stripe IDs, etc.
export type SafeUser = {
  id: string;
  email: string;
  firstName: string | null;
  surname: string | null;
  name: string | null;
  emailVerified: boolean;
  onboardingComplete: boolean;
  subscriptionTier: string;
};

/**
 * Sanitize user object for API responses.
 * Strips sensitive fields: passwordHash, stripeCustomerId, subscriptionId, googleId, etc.
 */
export function sanitizeUser(user: {
  id: string;
  email: string;
  firstName?: string | null;
  surname?: string | null;
  name?: string | null;
  emailVerified: boolean;
  onboardingComplete: boolean;
  subscriptionTier: string;
}): SafeUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName ?? null,
    surname: user.surname ?? null,
    name: user.name ?? null,
    emailVerified: user.emailVerified,
    onboardingComplete: user.onboardingComplete,
    subscriptionTier: user.subscriptionTier,
  };
}
