import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
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

