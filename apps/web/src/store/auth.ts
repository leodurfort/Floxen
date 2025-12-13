import { create } from 'zustand';
import { User } from '@productsynch/shared';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (user: User, accessToken: string, refreshToken: string) => void;
  clear: () => void;
  hydrated: boolean;
  hydrate: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  hydrated: false,
  setSession: (user, accessToken, refreshToken) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('productsynch.user', JSON.stringify(user));
      localStorage.setItem('productsynch.access', accessToken);
      localStorage.setItem('productsynch.refresh', refreshToken);
    }
    set({ user, accessToken, refreshToken });
  },
  clear: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('productsynch.user');
      localStorage.removeItem('productsynch.access');
      localStorage.removeItem('productsynch.refresh');
    }
    set({ user: null, accessToken: null, refreshToken: null });
  },
  hydrate: () => {
    if (typeof window === 'undefined') return;
    const userRaw = localStorage.getItem('productsynch.user');
    const access = localStorage.getItem('productsynch.access');
    const refresh = localStorage.getItem('productsynch.refresh');
    const user = userRaw ? (JSON.parse(userRaw) as User) : null;
    set({ user, accessToken: access, refreshToken: refresh, hydrated: true });
  },
}));
