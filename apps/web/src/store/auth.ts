import { create } from 'zustand';
import { User } from '@productsynch/shared';

// Tokens are stored ONLY in localStorage (not in Zustand state).
// api.ts reads tokens directly from localStorage for requests.
// This prevents desync between Zustand and localStorage when tokens refresh.

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

  setSession: (user, accessToken, refreshToken) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('productsynch.user', JSON.stringify(user));
      localStorage.setItem('productsynch.access', accessToken);
      localStorage.setItem('productsynch.refresh', refreshToken);
    }
    set({ user, hydrated: true });
  },

  setUser: (user) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('productsynch.user', JSON.stringify(user));
    }
    set({ user, hydrated: true });
  },

  clear: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('productsynch.user');
      localStorage.removeItem('productsynch.access');
      localStorage.removeItem('productsynch.refresh');
    }
    set({ user: null });
  },

  hydrate: () => {
    if (typeof window === 'undefined') return;
    const userRaw = localStorage.getItem('productsynch.user');
    const user = userRaw ? (JSON.parse(userRaw) as User) : null;
    set({ user, hydrated: true });
  },
}));
