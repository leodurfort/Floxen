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
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Account Information</h2>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500 mb-1">Account ID</p>
            <p className="text-gray-900 font-mono text-sm">{user?.id}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500 mb-1">Subscription</p>
            <p className="text-gray-900">{user?.subscriptionTier || 'Free'}</p>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white border border-red-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-bold text-red-600 mb-2">Danger Zone</h2>

        {!showDeleteConfirm ? (
          // Default state
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Once you delete your account, there is no going back. Please be certain.
            </p>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-600">
                Want to keep your account but disconnect a shop?{' '}
                <Link href="/shops" className="text-[#FA7315] hover:underline">
                  Manage your shops
                </Link>
              </p>
            </div>

            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
            >
              Delete my account
            </button>
          </div>
        ) : (
          // Confirmation state
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700 mb-2 font-medium">
                Are you absolutely sure?
              </p>
              <p className="text-sm text-gray-600">
                This action is permanent and cannot be undone.
              </p>
            </div>

            <p className="text-sm text-gray-600">
              All your data will be permanently deleted including:
            </p>
            <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 ml-2">
              <li>Your profile information</li>
              <li>All connected shops</li>
              <li>All product data and mappings</li>
              <li>Generated feeds and configurations</li>
            </ul>

            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isLoading}
                className="px-4 py-2 bg-gray-50 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
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
