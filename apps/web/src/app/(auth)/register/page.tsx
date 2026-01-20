'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/store/auth';
import { useRegistration } from '@/store/registration';
import * as api from '@/lib/api';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { GoogleOneTap } from '@/components/auth/GoogleOneTap';

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
    <main className="min-h-screen bg-[#F9FAFB] flex items-center justify-center px-4">
      {/* Google One-Tap */}
      <GoogleOneTap />

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 w-full max-w-md space-y-6">
        <div className="text-center">
          <p className="uppercase tracking-[0.15em] text-xs text-gray-500 mb-2">Floxen</p>
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="text-gray-600 mt-2">Get started in seconds</p>
        </div>

        {/* Google Sign-Up Button */}
        <GoogleSignInButton text="signup_with" />

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-4 text-gray-500">or continue with email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="flex flex-col gap-2">
            <span className="text-gray-600 text-sm">Professional email</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="you@company.com"
              required
              autoFocus
              className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-[#FA7315] focus:outline-none focus:ring-2 focus:ring-[#FA7315]/10 transition-colors"
            />
          </label>

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <button
            className="btn btn--primary w-full py-3"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Sending code...' : 'Continue with email'}
          </button>
        </form>

        <p className="text-sm text-gray-600 text-center">
          Already have an account?{' '}
          <Link className="text-gray-900 underline hover:text-[#FA7315]" href="/login">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
