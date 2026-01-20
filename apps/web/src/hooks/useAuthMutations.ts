import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type { CredentialResponse } from '@react-oauth/google';
import * as api from '@/lib/api';
import { useAuth } from '@/store/auth';

export function useLoginMutation() {
  const { setSession } = useAuth();
  const router = useRouter();

  return useMutation({
    mutationFn: async (payload: { email: string; password: string }) => {
      return api.login(payload);
    },
    onSuccess: (data) => {
      setSession(data.user, data.tokens.accessToken, data.tokens.refreshToken);

      // Redirect based on onboarding status
      if (!data.user.emailVerified) {
        router.push('/register/verify');
      } else if (!data.user.onboardingComplete) {
        router.push('/register/welcome');
      } else {
        router.push('/dashboard');
      }
    },
  });
}

export function useGoogleAuthMutation() {
  const { setSession } = useAuth();
  const router = useRouter();

  return useMutation({
    mutationFn: async (credentialResponse: CredentialResponse) => {
      if (!credentialResponse.credential) {
        throw new Error('No credential received from Google');
      }
      return api.googleAuth({ credential: credentialResponse.credential });
    },
    onSuccess: (data) => {
      setSession(data.user, data.tokens.accessToken, data.tokens.refreshToken);

      // Redirect based on user state
      // New Google users skip email verification (already verified by Google)
      if (data.isNewUser || !data.user.onboardingComplete) {
        router.push('/register/profile');
      } else {
        router.push('/dashboard');
      }
    },
  });
}

