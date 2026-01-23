'use client';

import { useGoogleOneTapLogin } from '@react-oauth/google';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/auth';
import { useGoogleAuthMutation } from '@/hooks/useAuthMutations';
import type { GoogleAuthError } from '@/lib/api';

interface GoogleOneTapProps {
  disabled?: boolean;
}

export function GoogleOneTap({ disabled = false }: GoogleOneTapProps) {
  const { user, hydrated } = useAuth();
  const router = useRouter();
  const googleAuthMutation = useGoogleAuthMutation();

  // Only show One-Tap if user is not logged in
  const shouldDisable = disabled || !hydrated || !!user;

  useGoogleOneTapLogin({
    onSuccess: (credentialResponse) => {
      googleAuthMutation.mutate(credentialResponse, {
        onError: (error) => {
          const googleError = error as GoogleAuthError;

          // Handle email collision silently for One-Tap - redirect to login
          if (googleError.error === 'email_exists' && googleError.redirectTo) {
            router.push(`${googleError.redirectTo}?google_collision=true`);
          }
          // Other errors are silently ignored for One-Tap UX
          console.warn('Google One-Tap failed:', googleError.message);
        },
      });
    },
    onError: () => {
      console.warn('Google One-Tap login failed');
    },
    disabled: shouldDisable,
    cancel_on_tap_outside: true,
    use_fedcm_for_prompt: true,
  });

  // This component doesn't render anything - One-Tap is a popup
  return null;
}
