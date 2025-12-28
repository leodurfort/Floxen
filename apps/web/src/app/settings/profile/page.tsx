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
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm max-w-xl">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Profile Information</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm text-gray-600">First name</span>
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            type="text"
            placeholder="Enter your first name"
            className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-[#FA7315] focus:outline-none focus:ring-2 focus:ring-[#FA7315]/10 transition-colors"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm text-gray-600">Surname</span>
          <input
            value={surname}
            onChange={(e) => setSurname(e.target.value)}
            type="text"
            placeholder="Enter your surname"
            className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-[#FA7315] focus:outline-none focus:ring-2 focus:ring-[#FA7315]/10 transition-colors"
          />
        </label>

        <div className="pt-2">
          <p className="text-sm text-gray-500 mb-1">Email</p>
          <p className="text-gray-900">{user?.email}</p>
          <p className="text-xs text-gray-400 mt-1">
            To change your email, go to Security settings
          </p>
        </div>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {success && (
          <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
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
