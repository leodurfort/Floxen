'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useRegistration } from '@/store/registration';
import { CodeInput } from '@/components/auth/CodeInput';
import * as api from '@/lib/api';

export default function RegisterVerifyPage() {
  const router = useRouter();
  const { email, setStep, setVerified } = useRegistration();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (!email) {
      router.push('/register');
    }
  }, [email, router]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleVerify = useCallback(async (verifyCode: string) => {
    if (verifyCode.length !== 6) return;
    setError('');
    setIsLoading(true);

    try {
      await api.registerVerify({ email, code: verifyCode });
      setVerified(true);
      setStep('password');
      router.push('/register/password');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid verification code');
      setCode('');
    } finally {
      setIsLoading(false);
    }
  }, [email, setVerified, setStep, router]);

  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);
    if (newCode.length === 6) {
      handleVerify(newCode);
    }
  }, [handleVerify]);

  async function handleResend() {
    if (resendCooldown > 0) return;
    setError('');
    setIsResending(true);

    try {
      await api.registerResend({ email });
      setResendCooldown(60); // 60 second cooldown
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend code');
    } finally {
      setIsResending(false);
    }
  }

  if (!email) {
    return null; // Will redirect
  }

  return (
    <main className="min-h-screen bg-[#F9FAFB] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 w-full max-w-md space-y-6">
        <div className="text-center">
          <p className="uppercase tracking-[0.15em] text-xs text-gray-500 mb-2">ProductSynch</p>
          <h1 className="text-2xl font-bold text-gray-900">Check your inbox</h1>
          <p className="text-gray-600 mt-2">
            Enter the 6-digit code we sent to<br />
            <span className="text-gray-900 font-medium">{email}</span>
          </p>
        </div>

        <div className="space-y-4">
          <CodeInput
            value={code}
            onChange={handleCodeChange}
            disabled={isLoading}
          />

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-center">
              {error}
            </div>
          )}

          <button
            onClick={() => handleVerify(code)}
            className="btn btn--primary w-full py-3"
            disabled={isLoading || code.length !== 6}
          >
            {isLoading ? 'Verifying...' : 'Continue'}
          </button>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">Didn&apos;t receive the code?</p>
          <button
            onClick={handleResend}
            disabled={isResending || resendCooldown > 0}
            className="text-sm text-gray-900 underline disabled:opacity-50 disabled:no-underline hover:text-[#FA7315]"
          >
            {isResending
              ? 'Sending...'
              : resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : 'Resend code'}
          </button>
        </div>

        <div className="text-center">
          <button
            onClick={() => router.push('/register')}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Use a different email
          </button>
        </div>
      </div>
    </main>
  );
}
