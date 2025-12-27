'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/store/auth';
import { useLoginMutation } from '@/hooks/useAuthMutations';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hydrate, user, hydrated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (searchParams.get('reset') === 'success') {
      setSuccessMessage('Password reset successfully. Please sign in with your new password.');
    }
  }, [searchParams]);

  const loginMutation = useLoginMutation();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hydrated && user) {
      // Redirect based on onboarding status
      if (!user.emailVerified) {
        router.push('/register/verify');
      } else if (!user.onboardingComplete) {
        router.push('/register/welcome');
      } else {
        router.push('/dashboard');
      }
    }
  }, [hydrated, user, router]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    loginMutation.mutate({ email, password });
  }

  return (
    <main className="min-h-screen bg-[#0d0f1a] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="uppercase tracking-[0.15em] text-xs text-white/60 mb-2">ProductSynch</p>
          <h1 className="text-2xl font-bold text-white mb-2">Welcome back</h1>
          <p className="text-white/60 text-sm">Sign in to manage your WooCommerce products</p>
        </div>

        <div className="panel p-8">
          {successMessage && (
            <div className="text-sm text-green-400 bg-green-400/10 border border-green-400/20 rounded-lg px-4 py-3 mb-4">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm text-white/70">Email</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="you@company.com"
                required
                className="bg-[#252936] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:border-[#4c5fd5] focus:outline-none transition-colors"
              />
            </label>

            <label className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-white/70">Password</span>
                <Link
                  href="/forgot-password"
                  className="text-xs text-[#4c5fd5] hover:text-[#5d6fe6] transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="Enter your password"
                required
                className="bg-[#252936] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:border-[#4c5fd5] focus:outline-none transition-colors"
              />
            </label>

            {loginMutation.error && (
              <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
                {loginMutation.error.message}
              </div>
            )}

            <button
              className="btn btn--primary w-full py-3"
              type="submit"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-white/60 mt-6">
          Need an account?{' '}
          <Link className="text-white hover:text-[#4c5fd5] transition-colors" href="/register">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
