'use client';

import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useGoogleAuthMutation } from '@/hooks/useAuthMutations';
import type { GoogleAuthError } from '@/lib/api';

interface GoogleSignInButtonProps {
  text?: 'signin_with' | 'signup_with' | 'continue_with';
  onError?: (error: GoogleAuthError) => void;
}

export function GoogleSignInButton({ text = 'continue_with', onError }: GoogleSignInButtonProps) {
  const router = useRouter();
  const googleAuthMutation = useGoogleAuthMutation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSuccess = (credentialResponse: CredentialResponse) => {
    setErrorMessage(null);
    googleAuthMutation.mutate(credentialResponse, {
      onError: (error) => {
        const googleError = error as GoogleAuthError;

        // Handle email collision - redirect to login with message
        if (googleError.error === 'email_exists' && googleError.redirectTo) {
          router.push(`${googleError.redirectTo}?google_collision=true`);
          return;
        }

        setErrorMessage(googleError.message || 'Google sign-in failed');
        onError?.(googleError);
      },
    });
  };

  const handleError = () => {
    setErrorMessage('Google sign-in was cancelled or failed');
  };

  return (
    <div className="w-full">
      <div className="flex justify-center">
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={handleError}
          text={text}
          theme="outline"
          size="large"
          shape="rectangular"
          width={300}
          use_fedcm_for_prompt
        />
      </div>
      {errorMessage && (
        <p className="text-sm text-red-600 mt-2 text-center">{errorMessage}</p>
      )}
      {googleAuthMutation.isPending && (
        <p className="text-sm text-gray-500 mt-2 text-center">Signing in...</p>
      )}
    </div>
  );
}
