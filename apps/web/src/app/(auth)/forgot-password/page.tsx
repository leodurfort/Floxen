'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForgotPassword } from '@/store/forgotPassword';
import * as api from '@/lib/api';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { setEmail, setStep } = useForgotPassword();
  const [emailInput, setEmailInput] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await api.forgotPassword({ email: emailInput.trim() });
      setEmail(emailInput.trim());
      setStep('verify');
      router.push('/forgot-password/verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset code');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0d0f1a] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="uppercase tracking-[0.15em] text-xs text-white/60 mb-2">ProductSynch</p>
          <h1 className="text-2xl font-bold text-white mb-2">Reset your password</h1>
          <p className="text-white/60 text-sm">
            Enter your email address and we&apos;ll send you a verification code
          </p>
        </div>

        <div className="panel p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm text-white/70">Email</span>
              <input
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
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
              {isLoading ? 'Sending...' : 'Send reset code'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-white/60 mt-6">
          Remember your password?{' '}
          <Link className="text-white hover:text-[#4c5fd5] transition-colors" href="/login">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
