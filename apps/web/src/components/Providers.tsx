'use client';

import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { createQueryClient } from '@/lib/queryClient';
import { IntercomProvider } from '@/components/IntercomProvider';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

/**
 * Client-side providers wrapper
 * Provides React Query and Google OAuth contexts to the entire app
 */
export function Providers({ children }: { children: React.ReactNode }) {
  // Create QueryClient once per app instance (not per render)
  // Using useState ensures stability across re-renders
  const [queryClient] = useState(() => createQueryClient());

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <QueryClientProvider client={queryClient}>
        {children}
        <IntercomProvider />
        {process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}
