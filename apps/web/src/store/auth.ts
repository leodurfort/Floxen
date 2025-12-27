import { create } from 'zustand';
import { User } from '@productsynch/shared';

/**
 * Auth store - manages user session state
 *
 * ARCHITECTURE NOTE:
 * - Tokens are stored ONLY in localStorage (not in Zustand state)
 * - api.ts reads tokens directly from localStorage for requests
 * - This store only tracks: user object, hydration state
 * - This prevents desync between Zustand and localStorage when tokens refresh
 */
interface AuthState {
  user: User | null;
  hydrated: boolean;
  setSession: (user: User, accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  clear: () => void;
  hydrate: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  hydrated: false,

  /**
   * Set session after login/register
   * Writes tokens to localStorage (for api.ts) and user to state (for UI)
   */
  setSession: (user, accessToken, refreshToken) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('productsynch.user', JSON.stringify(user));
      localStorage.setItem('productsynch.access', accessToken);
      localStorage.setItem('productsynch.refresh', refreshToken);
    }
    set({ user });
  },

  /**
   * Update user without changing tokens
   * Used for profile updates
   */
  setUser: (user) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('productsynch.user', JSON.stringify(user));
    }
    set({ user });
  },

  /**
   * Clear session on logout
   * Removes all auth data from localStorage and state
   */
  clear: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('productsynch.user');
      localStorage.removeItem('productsynch.access');
      localStorage.removeItem('productsynch.refresh');
    }
    set({ user: null });
  },

  /**
   * Hydrate from localStorage on app mount
   * Only reads user - tokens are read by api.ts when needed
   */
  hydrate: () => {
    if (typeof window === 'undefined') return;
    const userRaw = localStorage.getItem('productsynch.user');
    const user = userRaw ? (JSON.parse(userRaw) as User) : null;
    set({ user, hydrated: true });
  },
}));
