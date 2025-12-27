-- Update existing users to be verified and have onboarding complete
-- This ensures existing users don't get stuck in the new registration flow

UPDATE "User"
SET
  "email_verified" = true,
  "onboarding_complete" = true
WHERE
  "email_verified" = false
  OR "onboarding_complete" = false;
