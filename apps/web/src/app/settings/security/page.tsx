'use client';

import { useState } from 'react';
import { useAuth } from '@/store/auth';
import { CodeInput } from '@/components/auth/CodeInput';
import * as api from '@/lib/api';

type EmailChangeStep = 'idle' | 'verifying';

export default function SecuritySettingsPage() {
  const { user, setUser } = useAuth();

  // Email change state
  const [emailStep, setEmailStep] = useState<EmailChangeStep>('idle');
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  async function handleEmailChange(e: React.FormEvent) {
    e.preventDefault();
    setEmailError('');
    setEmailSuccess('');
    setEmailLoading(true);

    try {
      await api.changeEmail({
        newEmail: newEmail.trim(),
        password: emailPassword,
      });
      setEmailStep('verifying');
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Failed to initiate email change');
    } finally {
      setEmailLoading(false);
    }
  }

  async function handleEmailVerify(code: string) {
    setEmailError('');
    setEmailLoading(true);

    try {
      const result = await api.changeEmailVerify({ code });
      setUser(result.user);
      setEmailSuccess('Email updated successfully');
      setEmailStep('idle');
      setNewEmail('');
      setEmailPassword('');
      setEmailCode('');
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Invalid verification code');
      setEmailCode('');
    } finally {
      setEmailLoading(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setPasswordLoading(true);

    try {
      await api.changePassword({
        currentPassword,
        newPassword,
      });
      setPasswordSuccess('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <div className="space-y-8 max-w-xl">
      {/* Change Email Section */}
      <div className="panel p-6">
        <h2 className="text-xl font-bold text-white mb-2">Email Address</h2>
        <p className="text-sm text-white/60 mb-6">
          Current email: <span className="text-white">{user?.email}</span>
        </p>

        {emailStep === 'idle' ? (
          <form onSubmit={handleEmailChange} className="space-y-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm text-white/70">New email address</span>
              <input
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                type="email"
                placeholder="Enter new email"
                required
                className="bg-[#252936] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:border-[#4c5fd5] focus:outline-none transition-colors"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm text-white/70">Current password</span>
              <input
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                type="password"
                placeholder="Enter your password to confirm"
                required
                autoComplete="new-password"
                className="bg-[#252936] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:border-[#4c5fd5] focus:outline-none transition-colors"
              />
            </label>

            {emailError && (
              <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
                {emailError}
              </div>
            )}

            {emailSuccess && (
              <div className="text-sm text-green-400 bg-green-400/10 border border-green-400/20 rounded-lg px-4 py-3">
                {emailSuccess}
              </div>
            )}

            <button
              type="submit"
              disabled={emailLoading}
              className="btn btn--primary py-2.5 px-6"
            >
              {emailLoading ? 'Sending...' : 'Change email'}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-white/70">
              We sent a verification code to <span className="text-white font-medium">{newEmail}</span>
            </p>

            <div>
              <label className="block text-sm text-white/70 mb-3">
                Enter the 6-digit code
              </label>
              <CodeInput
                value={emailCode}
                onChange={setEmailCode}
                onComplete={handleEmailVerify}
                disabled={emailLoading}
              />
            </div>

            {emailError && (
              <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
                {emailError}
              </div>
            )}

            {emailLoading && (
              <div className="text-center text-white/60 text-sm">
                Verifying...
              </div>
            )}

            <button
              onClick={() => {
                setEmailStep('idle');
                setEmailCode('');
                setEmailError('');
              }}
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Change Password Section */}
      <div className="panel p-6">
        <h2 className="text-xl font-bold text-white mb-6">Change Password</h2>

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm text-white/70">Current password</span>
            <input
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              type="password"
              placeholder="Enter current password"
              required
              autoComplete="current-password"
              className="bg-[#252936] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:border-[#4c5fd5] focus:outline-none transition-colors"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm text-white/70">New password</span>
            <input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              type="password"
              placeholder="At least 8 characters"
              required
              minLength={8}
              autoComplete="new-password"
              className="bg-[#252936] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:border-[#4c5fd5] focus:outline-none transition-colors"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm text-white/70">Confirm new password</span>
            <input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              type="password"
              placeholder="Re-enter new password"
              required
              minLength={8}
              autoComplete="new-password"
              className="bg-[#252936] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:border-[#4c5fd5] focus:outline-none transition-colors"
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-red-400">Passwords do not match</p>
            )}
          </label>

          {passwordError && (
            <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
              {passwordError}
            </div>
          )}

          {passwordSuccess && (
            <div className="text-sm text-green-400 bg-green-400/10 border border-green-400/20 rounded-lg px-4 py-3">
              {passwordSuccess}
            </div>
          )}

          <button
            type="submit"
            disabled={passwordLoading || (newPassword !== confirmPassword)}
            className="btn btn--primary py-2.5 px-6"
          >
            {passwordLoading ? 'Updating...' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}
