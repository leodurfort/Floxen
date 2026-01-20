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
    <main className="min-h-screen bg-[#F9FAFB] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="uppercase tracking-[0.15em] text-xs text-gray-500 mb-2">Floxen</p>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Reset your password</h1>
          <p className="text-gray-600 text-sm">
            Enter your email address and we&apos;ll send you a verification code
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm text-gray-600">Email</span>
              <input
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
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
              {isLoading ? 'Sending...' : 'Send reset code'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-600 mt-6">
          Remember your password?{' '}
          <Link className="text-gray-900 hover:text-[#FA7315] transition-colors" href="/login">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
