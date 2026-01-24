'use client';

import { useEffect, useRef } from 'react';
import Intercom from '@intercom/messenger-js-sdk';
import { useAuth } from '@/store/auth';
import { getIntercomToken } from '@/lib/api';

const INTERCOM_APP_ID = process.env.NEXT_PUBLIC_INTERCOM_APP_ID;

export function IntercomProvider() {
  const { user, hydrated } = useAuth();
  const isBooted = useRef(false);

  useEffect(() => {
    if (!hydrated || !INTERCOM_APP_ID) return;

    // Only boot Intercom for logged-in users
    if (user && !isBooted.current) {
      isBooted.current = true; // Prevent double-boot

      // Fetch identity verification JWT then boot
      getIntercomToken()
        .then(({ token }) => {
          Intercom({
            app_id: INTERCOM_APP_ID,
            user_id: user.id,
            intercom_user_jwt: token,
            name: [user.firstName, user.surname].filter(Boolean).join(' ') || undefined,
            created_at: Math.floor(new Date(user.createdAt).getTime() / 1000),
          });
        })
        .catch((err) => {
          console.error('Failed to get Intercom token:', err);
          // Fallback: boot without identity verification
          Intercom({
            app_id: INTERCOM_APP_ID,
            user_id: user.id,
            email: user.email,
            name: [user.firstName, user.surname].filter(Boolean).join(' ') || undefined,
            created_at: Math.floor(new Date(user.createdAt).getTime() / 1000),
          });
        });
    }

    // Shutdown on logout
    if (!user && isBooted.current) {
      if (typeof window !== 'undefined' && window.Intercom) {
        window.Intercom('shutdown');
      }
      isBooted.current = false;
    }
  }, [user, hydrated]);

  return null;
}
