'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForgotPassword } from '@/store/forgotPassword';
import * as api from '@/lib/api';

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: 'Weak', color: 'bg-red-500' };
  if (score <= 2) return { score, label: 'Fair', color: 'bg-orange-500' };
  if (score <= 3) return { score, label: 'Good', color: 'bg-yellow-500' };
  if (score <= 4) return { score, label: 'Strong', color: 'bg-green-500' };
  return { score, label: 'Very Strong', color: 'bg-emerald-500' };
}

export default function ForgotPasswordResetPage() {
  const router = useRouter();
  const { email, code, verified, reset } = useForgotPassword();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  useEffect(() => {
    // Redirect if not verified or no code
    if (!email || !code || !verified) {
      router.push('/forgot-password');
    }
  }, [email, code, verified, router]);

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
      await api.forgotPasswordReset({ email, code, password });
      reset(); // Clear forgot password state
      router.push('/login?reset=success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  }

  if (!email || !code || !verified) {
    return (
      <div className="min-h-screen bg-[#0d0f1a] flex items-center justify-center">
        <div className="animate-pulse text-white/40">Loading...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0d0f1a] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="uppercase tracking-[0.15em] text-xs text-white/60 mb-2">ProductSynch</p>
          <h1 className="text-2xl font-bold text-white mb-2">Create new password</h1>
          <p className="text-white/60 text-sm">
            Choose a strong password for your account
          </p>
        </div>

        <div className="panel p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm text-white/70">New password</span>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="At least 8 characters"
                required
                minLength={8}
                autoFocus
                className="bg-[#252936] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:border-[#4c5fd5] focus:outline-none transition-colors"
              />
              {password && (
                <div className="space-y-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          level <= strength.score ? strength.color : 'bg-white/10'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-white/50">
                    Password strength: <span className="text-white/70">{strength.label}</span>
                  </p>
                </div>
              )}
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm text-white/70">Confirm password</span>
              <input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                type="password"
                placeholder="Re-enter your password"
                required
                minLength={8}
                className="bg-[#252936] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:border-[#4c5fd5] focus:outline-none transition-colors"
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-400">Passwords do not match</p>
              )}
            </label>

            {error && (
              <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <button
              className="btn btn--primary w-full py-3"
              type="submit"
              disabled={isLoading || password.length < 8 || password !== confirmPassword}
            >
              {isLoading ? 'Resetting...' : 'Reset password'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
