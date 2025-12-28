'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/store/auth';
import * as api from '@/lib/api';

export default function AccountSettingsPage() {
  const router = useRouter();
  const { user, clear } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleDeleteAccount() {
    setError('');
    setIsLoading(true);

    try {
      await api.deleteAccount();
      clear(); // Clear auth state
      router.push('/login?deleted=true');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-8 max-w-xl">
      {/* Account Information */}
      <div className="panel p-6">
        <h2 className="text-xl font-bold text-white mb-6">Account Information</h2>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-white/50 mb-1">Account ID</p>
            <p className="text-white font-mono text-sm">{user?.id}</p>
          </div>

          <div>
            <p className="text-sm text-white/50 mb-1">Subscription</p>
            <p className="text-white">{user?.subscriptionTier || 'Free'}</p>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="panel p-6 border-red-500/30">
        <h2 className="text-xl font-bold text-red-400 mb-2">Danger Zone</h2>

        {!showDeleteConfirm ? (
          // Default state
          <div className="space-y-4">
            <p className="text-sm text-white/60">
              Once you delete your account, there is no going back. Please be certain.
            </p>

            <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
              <p className="text-sm text-white/70">
                Want to keep your account but disconnect a shop?{' '}
                <Link href="/shops" className="text-[#4c5fd5] hover:underline">
                  Manage your shops
                </Link>
              </p>
            </div>

            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
            >
              Delete my account
            </button>
          </div>
        ) : (
          // Confirmation state
          <div className="space-y-4">
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-400 mb-2 font-medium">
                Are you absolutely sure?
              </p>
              <p className="text-sm text-white/60">
                This action is permanent and cannot be undone.
              </p>
            </div>

            <p className="text-sm text-white/60">
              All your data will be permanently deleted including:
            </p>
            <ul className="text-sm text-white/60 list-disc list-inside space-y-1 ml-2">
              <li>Your profile information</li>
              <li>All connected shops</li>
              <li>All product data and mappings</li>
              <li>Generated feeds and configurations</li>
            </ul>

            {error && (
              <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isLoading}
                className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isLoading}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Deleting...' : 'Yes, delete my account'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
