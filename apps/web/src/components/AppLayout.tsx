'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/store/auth';
import { Sidebar } from './Sidebar';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, hydrated, hydrate } = useAuth();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hydrated && !user && pathname !== '/login' && pathname !== '/register') {
      router.push('/login');
    }
  }, [hydrated, user, pathname, router]);

  // Don't show sidebar on login/register pages
  const isAuthPage = pathname === '/login' || pathname === '/register';

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-[#0d0f1a] flex items-center justify-center">
        <div className="text-white/60">Loading...</div>
      </div>
    );
  }

  if (isAuthPage || !user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#0d0f1a]">
      <Sidebar />
      <div className="ml-64">
        <main className="min-h-screen">{children}</main>
      </div>
    </div>
  );
}
