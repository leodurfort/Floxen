'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRegistration } from '@/store/registration';
import { useAuth } from '@/store/auth';
import { getPasswordStrength } from '@/lib/validation';
import * as api from '@/lib/api';

export default function RegisterPasswordPage() {
  const router = useRouter();
  const { email, verified, setStep } = useRegistration();
  const { setSession } = useAuth();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if not verified
  useEffect(() => {
    if (!email) {
      router.push('/register');
    } else if (!verified) {
      router.push('/register/verify');
    }
  }, [email, verified, router]);

  const strength = getPasswordStrength(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      const result = await api.registerPassword({ email, password });
      // Store tokens so user stays authenticated
      setSession(result.user as any, result.tokens.accessToken, result.tokens.refreshToken);
      setStep('profile');
      router.push('/register/profile');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  }

  if (!email || !verified) {
    return null; // Will redirect
  }

  return (
    <main className="min-h-screen bg-[#F9FAFB] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 w-full max-w-md space-y-6">
        <div className="text-center">
          <p className="uppercase tracking-[0.15em] text-xs text-gray-500 mb-2">Floxen</p>
          <h1 className="text-2xl font-bold text-gray-900">Create a password</h1>
          <p className="text-gray-600 mt-2">
            Choose a secure password for your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="flex flex-col gap-2">
            <span className="text-gray-600 text-sm">Password</span>
            <div className="relative">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 8 characters"
                required
                minLength={8}
                autoFocus
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 pr-12 text-gray-900 placeholder-gray-400 focus:border-[#FA7315] focus:outline-none focus:ring-2 focus:ring-[#FA7315]/10 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {password && (
              <div className="space-y-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        level <= strength.score ? strength.color : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  Password strength: <span className="text-gray-700">{strength.label}</span>
                </p>
              </div>
            )}
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
            {isLoading ? 'Creating account...' : 'Continue'}
          </button>
        </form>
      </div>
    </main>
  );
}
