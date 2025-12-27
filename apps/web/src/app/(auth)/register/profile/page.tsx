'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRegistration } from '@/store/registration';
import { useAuth } from '@/store/auth';
import * as api from '@/lib/api';

export default function RegisterProfilePage() {
  const router = useRouter();
  const { email, setStep, reset } = useRegistration();
  const { user, setSession } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if not authenticated or already completed
  useEffect(() => {
    if (!email && !user) {
      router.push('/register');
    } else if (user?.onboardingComplete) {
      router.push('/dashboard');
    }
  }, [email, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!firstName.trim()) {
      setError('First name is required');
      return;
    }

    if (!surname.trim()) {
      setError('Surname is required');
      return;
    }

    setIsLoading(true);

    try {
      const userEmail = email || user?.email;
      if (!userEmail) {
        throw new Error('Email not found');
      }

      const result = await api.registerComplete({
        email: userEmail,
        firstName: firstName.trim(),
        surname: surname.trim(),
      });

      // Update session with complete user data
      setSession(result.user, result.tokens.accessToken, result.tokens.refreshToken);
      setStep('welcome');
      reset(); // Clear registration store
      router.push('/register/welcome');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete profile');
    } finally {
      setIsLoading(false);
    }
  }

  if (!email && !user) {
    return null; // Will redirect
  }

  return (
    <main className="shell flex min-h-screen items-center justify-center">
      <div className="panel w-full max-w-md space-y-6">
        <div className="text-center">
          <p className="uppercase tracking-[0.15em] text-xs text-white/60 mb-2">ProductSynch</p>
          <h1 className="section-title">Complete your profile</h1>
          <p className="subtle mt-2">
            Tell us a bit about yourself
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="flex flex-col gap-2">
            <span className="subtle text-sm">First name</span>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              type="text"
              placeholder="John"
              required
              autoFocus
              className="bg-[#252936] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:border-[#4c5fd5] focus:outline-none transition-colors"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="subtle text-sm">Surname</span>
            <input
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              type="text"
              placeholder="Doe"
              required
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
            {isLoading ? 'Saving...' : 'Continue'}
          </button>
        </form>
      </div>
    </main>
  );
}
