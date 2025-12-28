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
    <main className="min-h-screen bg-[#F9FAFB] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 w-full max-w-md space-y-6">
        <div className="text-center">
          <p className="uppercase tracking-[0.15em] text-xs text-gray-500 mb-2">ProductSynch</p>
          <h1 className="text-2xl font-bold text-gray-900">Complete your profile</h1>
          <p className="text-gray-600 mt-2">
            Tell us a bit about yourself
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="flex flex-col gap-2">
            <span className="text-gray-600 text-sm">First name</span>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              type="text"
              placeholder="Charles"
              required
              autoFocus
              className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-[#FA7315] focus:outline-none focus:ring-2 focus:ring-[#FA7315]/10 transition-colors"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-gray-600 text-sm">Surname</span>
            <input
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              type="text"
              placeholder="Leclerc"
              required
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
            {isLoading ? 'Saving...' : 'Continue'}
          </button>
        </form>
      </div>
    </main>
  );
}
