import { create } from 'zustand';
import { User } from '@floxen/shared';

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
    console.debug('[AUTH-STORE] setSession() called', {
      userId: user.id,
      email: user.email,
      subscriptionTier: user.subscriptionTier,
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem('floxen.user', JSON.stringify(user));
      localStorage.setItem('floxen.access', accessToken);
      localStorage.setItem('floxen.refresh', refreshToken);
      console.debug('[AUTH-STORE] Tokens and user saved to localStorage');
    }
    set({ user, hydrated: true });
    console.debug('[AUTH-STORE] Zustand state updated with user');
  },

  setUser: (user) => {
    console.debug('[AUTH-STORE] setUser() called', {
      userId: user.id,
      email: user.email,
      subscriptionTier: user.subscriptionTier,
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem('floxen.user', JSON.stringify(user));
      console.debug('[AUTH-STORE] User saved to localStorage');
    }
    set({ user, hydrated: true });
    console.debug('[AUTH-STORE] Zustand state updated with user');
  },

  clear: () => {
    console.debug('[AUTH-STORE] clear() called - logging out user');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('floxen.user');
      localStorage.removeItem('floxen.access');
      localStorage.removeItem('floxen.refresh');
      console.debug('[AUTH-STORE] All auth data removed from localStorage');
    }
    set({ user: null });
    console.debug('[AUTH-STORE] Zustand state cleared');
  },

  hydrate: () => {
    console.debug('[AUTH-STORE] hydrate() called');
    if (typeof window === 'undefined') {
      console.debug('[AUTH-STORE] SSR environment, skipping hydration');
      return;
    }

    const userRaw = localStorage.getItem('floxen.user');
    const user = userRaw ? (JSON.parse(userRaw) as User) : null;

    console.debug('[AUTH-STORE] hydrate() result', {
      hasUserInStorage: !!userRaw,
      userId: user?.id,
      subscriptionTier: user?.subscriptionTier,
    });

    set({ user, hydrated: true });
    console.debug('[AUTH-STORE] Zustand state hydrated from localStorage');
  },
}));
