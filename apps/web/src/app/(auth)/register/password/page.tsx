'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRegistration } from '@/store/registration';
import { useAuth } from '@/store/auth';
import * as api from '@/lib/api';

export default function RegisterPasswordPage() {
  const router = useRouter();
  const { email, verified, setStep } = useRegistration();
  const { setSession } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

  const passwordStrength = getPasswordStrength(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
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
    <main className="shell flex min-h-screen items-center justify-center">
      <div className="panel w-full max-w-md space-y-6">
        <div className="text-center">
          <p className="uppercase tracking-[0.15em] text-xs text-white/60 mb-2">ProductSynch</p>
          <h1 className="section-title">Create a password</h1>
          <p className="subtle mt-2">
            Choose a secure password for your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="flex flex-col gap-2">
            <span className="subtle text-sm">Password</span>
            <div className="relative">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 8 characters"
                required
                minLength={8}
                autoFocus
                className="w-full bg-[#252936] border border-white/10 rounded-lg px-4 py-3 pr-12 text-white placeholder-white/30 focus:border-[#4c5fd5] focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
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
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      passwordStrength >= level
                        ? passwordStrength === 1
                          ? 'bg-red-400'
                          : passwordStrength === 2
                            ? 'bg-yellow-400'
                            : passwordStrength === 3
                              ? 'bg-blue-400'
                              : 'bg-green-400'
                        : 'bg-white/10'
                    }`}
                  />
                ))}
              </div>
            )}
          </label>

          <label className="flex flex-col gap-2">
            <span className="subtle text-sm">Confirm password</span>
            <input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              type={showPassword ? 'text' : 'password'}
              placeholder="Re-enter your password"
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
            {isLoading ? 'Creating account...' : 'Continue'}
          </button>
        </form>
      </div>
    </main>
  );
}

function getPasswordStrength(password: string): number {
  if (!password) return 0;
  let strength = 0;
  if (password.length >= 8) strength++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[^a-zA-Z0-9]/.test(password)) strength++;
  return strength;
}
