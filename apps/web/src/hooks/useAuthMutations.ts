import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import * as api from '@/lib/api';
import { useAuth } from '@/store/auth';

/**
 * Mutation hook for user login
 * Sets auth session and redirects to dashboard on success
 */
export function useLoginMutation() {
  const { setSession } = useAuth();
  const router = useRouter();

  return useMutation({
    mutationFn: async (payload: { email: string; password: string }) => {
      return api.login(payload);
    },
    onSuccess: (data) => {
      setSession(data.user, data.tokens.accessToken, data.tokens.refreshToken);
      router.push('/dashboard');
    },
  });
}

/**
 * Mutation hook for user registration
 * Sets auth session and redirects to dashboard on success
 */
export function useRegisterMutation() {
  const { setSession } = useAuth();
  const router = useRouter();

  return useMutation({
    mutationFn: async (payload: { email: string; password: string; name?: string }) => {
      return api.register(payload);
    },
    onSuccess: (data) => {
      setSession(data.user, data.tokens.accessToken, data.tokens.refreshToken);
      router.push('/dashboard');
    },
  });
}
