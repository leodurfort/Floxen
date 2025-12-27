'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/store/auth';
import * as api from '@/lib/api';

export default function ProfileSettingsPage() {
  const { user, setUser } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setSurname(user.surname || '');
    }
  }, [user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const result = await api.updateProfile({
        firstName: firstName.trim(),
        surname: surname.trim(),
      });

      setUser(result.user);
      setSuccess('Profile updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="panel p-6 max-w-xl">
      <h2 className="text-xl font-bold text-white mb-6">Profile Information</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm text-white/70">First name</span>
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            type="text"
            placeholder="Enter your first name"
            className="bg-[#252936] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:border-[#4c5fd5] focus:outline-none transition-colors"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm text-white/70">Surname</span>
          <input
            value={surname}
            onChange={(e) => setSurname(e.target.value)}
            type="text"
            placeholder="Enter your surname"
            className="bg-[#252936] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:border-[#4c5fd5] focus:outline-none transition-colors"
          />
        </label>

        <div className="pt-2">
          <p className="text-sm text-white/50 mb-1">Email</p>
          <p className="text-white">{user?.email}</p>
          <p className="text-xs text-white/40 mt-1">
            To change your email, go to Security settings
          </p>
        </div>

        {error && (
          <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {success && (
          <div className="text-sm text-green-400 bg-green-400/10 border border-green-400/20 rounded-lg px-4 py-3">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="btn btn--primary py-2.5 px-6"
        >
          {isLoading ? 'Saving...' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
