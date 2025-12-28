'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForgotPassword } from '@/store/forgotPassword';
import { CodeInput } from '@/components/auth/CodeInput';
import * as api from '@/lib/api';

export default function ForgotPasswordVerifyPage() {
  const router = useRouter();
  const { email, step, setStep, setCode: saveCode, setVerified } = useForgotPassword();
  const [codeInput, setCodeInput] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    // Redirect if no email in state
    if (!email) {
      router.push('/forgot-password');
    }
  }, [email, router]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  async function handleVerify(fullCode: string) {
    setError('');
    setIsLoading(true);

    try {
      await api.forgotPasswordVerify({ email, code: fullCode });
      saveCode(fullCode); // Save code for the reset step
      setVerified(true);
      setStep('reset');
      router.push('/forgot-password/reset');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid verification code');
      setCodeInput('');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0) return;

    setError('');
    try {
      await api.forgotPassword({ email });
      setResendCooldown(60);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend code');
    }
  }

  function handleCodeComplete(fullCode: string) {
    handleVerify(fullCode);
  }

  if (!email) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#F9FAFB] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="uppercase tracking-[0.15em] text-xs text-gray-500 mb-2">ProductSynch</p>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h1>
          <p className="text-gray-600 text-sm">
            We sent a verification code to <span className="text-gray-900 font-medium">{email}</span>
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <div className="space-y-6">
            <div>
              <label className="block text-sm text-gray-600 mb-4 text-center">
                Enter the 6-digit code
              </label>
              <CodeInput
                value={codeInput}
                onChange={setCodeInput}
                onComplete={handleCodeComplete}
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-center">
                {error}
              </div>
            )}

            {isLoading && (
              <div className="text-center text-gray-500 text-sm">
                Verifying...
              </div>
            )}

            <div className="text-center">
              <button
                onClick={handleResend}
                disabled={resendCooldown > 0}
                className="text-sm text-[#FA7315] hover:text-[#E5650F] disabled:text-gray-400 transition-colors"
              >
                {resendCooldown > 0
                  ? `Resend code in ${resendCooldown}s`
                  : "Didn't receive a code? Resend"}
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-gray-600 mt-6">
          <Link
            href="/forgot-password"
            className="text-gray-900 hover:text-[#FA7315] transition-colors"
          >
            Use a different email
          </Link>
        </p>
      </div>
    </main>
  );
}
