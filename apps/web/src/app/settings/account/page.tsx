'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/store/auth';
import * as api from '@/lib/api';

interface DeletionStatus {
  scheduled: boolean;
  scheduledFor?: string;
  requestedAt?: string;
}

export default function AccountSettingsPage() {
  const { user, clear } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletionStatus, setDeletionStatus] = useState<DeletionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDeletionStatus();
  }, []);

  async function fetchDeletionStatus() {
    try {
      const status = await api.getDeletionStatus();
      setDeletionStatus(status);
    } catch (err) {
      console.error('Failed to fetch deletion status:', err);
    }
  }

  async function handleScheduleDelete() {
    setError('');
    setIsLoading(true);

    try {
      const result = await api.scheduleAccountDeletion();
      setDeletionStatus({
        scheduled: true,
        scheduledFor: result.scheduledFor,
      });
      setShowDeleteConfirm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule deletion');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCancelDelete() {
    setError('');
    setIsLoading(true);

    try {
      await api.cancelAccountDeletion();
      setDeletionStatus({ scheduled: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel deletion');
    } finally {
      setIsLoading(false);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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

          <div>
            <p className="text-sm text-white/50 mb-1">Member since</p>
            <p className="text-white">
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : 'Unknown'}
            </p>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="panel p-6 border-red-500/30">
        <h2 className="text-xl font-bold text-red-400 mb-2">Danger Zone</h2>

        {deletionStatus?.scheduled ? (
          // Deletion is scheduled
          <div className="space-y-4">
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 font-medium mb-2">
                Account deletion scheduled
              </p>
              <p className="text-sm text-white/60 mb-2">
                Your account and all associated data will be permanently deleted on:
              </p>
              <p className="text-white font-medium">
                {deletionStatus.scheduledFor && formatDate(deletionStatus.scheduledFor)}
              </p>
            </div>

            <p className="text-sm text-white/60">
              If you change your mind, you can cancel the deletion before this date.
            </p>

            {error && (
              <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <button
              onClick={handleCancelDelete}
              disabled={isLoading}
              className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Cancelling...' : 'Cancel deletion'}
            </button>
          </div>
        ) : !showDeleteConfirm ? (
          // Default state
          <>
            <p className="text-sm text-white/60 mb-6">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
            >
              Delete my account
            </button>
          </>
        ) : (
          // Confirmation state
          <div className="space-y-4">
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-400 mb-2 font-medium">
                Are you absolutely sure?
              </p>
              <p className="text-sm text-white/60">
                This action will schedule your account for permanent deletion after a 30-day grace period.
                During this time, you can cancel the deletion from your settings.
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
                className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleScheduleDelete}
                disabled={isLoading}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Scheduling...' : 'Yes, delete my account'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
