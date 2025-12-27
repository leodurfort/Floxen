'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/store/auth';
import { useRegistration } from '@/store/registration';
import * as api from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const { hydrate, user, hydrated } = useAuth();
  const { setEmail: setStoreEmail, setStep } = useRegistration();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hydrated && user) {
      if (!user.emailVerified) {
        router.push('/register/verify');
      } else if (!user.onboardingComplete) {
        router.push('/register/profile');
      } else {
        router.push('/dashboard');
      }
    }
  }, [hydrated, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await api.registerStart({ email });
      setStoreEmail(email);
      setStep('verify');
      router.push('/register/verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send verification email');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="shell flex min-h-screen items-center justify-center">
      <div className="panel w-full max-w-md space-y-6">
        <div className="text-center">
          <p className="uppercase tracking-[0.15em] text-xs text-white/60 mb-2">ProductSynch</p>
          <h1 className="section-title">Create your account</h1>
          <p className="subtle mt-2">Enter your professional email to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="flex flex-col gap-2">
            <span className="subtle text-sm">Professional email</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="you@company.com"
              required
              autoFocus
              className="bg-[#252936] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:border-[#4c5fd5] focus:outline-none transition-colors"
            />
          </label>

          {error && (
            <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <button
            className="btn btn--primary w-full py-3"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Sending code...' : 'Continue'}
          </button>
        </form>

        <p className="text-sm subtle text-center">
          Already have an account?{' '}
          <Link className="text-white underline" href="/login">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
