'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/auth';
import * as api from '@/lib/api';

export default function AnalyticsPage() {
  const router = useRouter();
  const { user, hydrated } = useAuth();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [alreadySignedUp, setAlreadySignedUp] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (hydrated && !user) {
      router.push('/login');
    }
  }, [hydrated, user, router]);

  // Prefill email from auth store
  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  // Check if user is already on waitlist
  useEffect(() => {
    async function checkStatus() {
      if (!hydrated || !user) return;

      try {
        const status = await api.getAnalyticsWaitlistStatus();
        if (status.isSignedUp) {
          setAlreadySignedUp(true);
          setSuccess('You are already on the waitlist! We will notify you when Analytics launches.');
        }
      } catch {
        // Silently ignore - not critical
      } finally {
        setIsCheckingStatus(false);
      }
    }

    checkStatus();
  }, [hydrated, user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const result = await api.signupAnalyticsWaitlist(email);
      setSuccess(result.message);
      setAlreadySignedUp(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join waitlist');
    } finally {
      setIsLoading(false);
    }
  }

  // Loading state during hydration
  if (!hydrated) {
    return (
      <div className="p-4">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="p-4">
      <div className="max-w-xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-2">Coming Soon</p>
        </div>

        {/* Main Content Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
          {/* Feature Preview */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📈</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Analytics is Coming Soon
            </h2>
            <p className="text-gray-600">
              Track your product performance, ChatGPT impressions, clicks, and conversions.
              Be the first to know when it launches.
            </p>
          </div>

          {/* Loading State */}
          {isCheckingStatus && (
            <div className="text-center text-gray-500">
              Loading...
            </div>
          )}

          {/* Signup Form */}
          {!isCheckingStatus && !alreadySignedUp && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="flex flex-col gap-2">
                <span className="text-sm text-gray-600">Email address</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
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
                type="submit"
                disabled={isLoading}
                className="w-full btn btn--primary py-3"
              >
                {isLoading ? 'Joining...' : 'Get notified when available'}
              </button>
            </form>
          )}

          {/* Success State */}
          {!isCheckingStatus && success && (
            <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-center">
              {success}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
