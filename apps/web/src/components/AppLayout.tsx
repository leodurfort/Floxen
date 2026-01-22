'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/store/auth';
import { Sidebar } from './Sidebar';
import { useCurrentShop } from '@/hooks/useCurrentShop';
import { useProductStats } from '@/hooks/useProductStats';
import { FirstSyncSuccessBanner } from './banners/FirstSyncSuccessBanner';
import { ProductReselectionBanner } from './banners/ProductReselectionBanner';

// Pages that don't require authentication
const AUTH_PAGES = [
  '/',
  '/login',
  '/register',
  '/register/verify',
  '/register/password',
  '/register/profile',
  '/register/welcome',
  '/forgot-password',
  '/forgot-password/verify',
  '/forgot-password/reset',
];

// Pages that require authentication but allow incomplete onboarding
const ONBOARDING_PAGES = [
  '/register/verify',
  '/register/password',
  '/register/profile',
  '/register/welcome',
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, hydrated, hydrate } = useAuth();
  const { currentShop } = useCurrentShop();
  const { data: productStats } = useProductStats(currentShop?.id);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;

    const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p));
    const isOnboardingPage = ONBOARDING_PAGES.some((p) => pathname.startsWith(p));

    if (!user) {
      // Not logged in - redirect to login if not on auth page
      if (!isAuthPage) {
        router.push('/login');
      }
      return;
    }

    // User is logged in - check verification and onboarding status
    if (!user.emailVerified && !isOnboardingPage) {
      // Email not verified - redirect to verification
      router.push('/register/verify');
      return;
    }

    if (user.emailVerified && !user.onboardingComplete && !isOnboardingPage) {
      // Email verified but onboarding not complete - redirect to welcome
      router.push('/register/welcome');
      return;
    }

    // Fully onboarded user on onboarding page - redirect to dashboard
    if (user.emailVerified && user.onboardingComplete && isOnboardingPage) {
      router.push('/dashboard');
    }
  }, [hydrated, user, pathname, router]);

  // Determine if we should show sidebar
  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p));

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  // Auth pages or no user - show without sidebar
  if (isAuthPage || !user) {
    return <>{children}</>;
  }

  // Show with sidebar for authenticated users
  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <Sidebar />
      <div className="ml-52">
        <main className="min-h-screen">
          {/* Product Reselection Banner (shows when downgraded) */}
          {currentShop && (
            <div className="px-4 pt-4">
              <ProductReselectionBanner
                shopId={currentShop.id}
                needsProductReselection={currentShop.needsProductReselection}
              />
            </div>
          )}
          {/* First Sync Success Banner */}
          {currentShop && (
            <div className="px-4 pt-4">
              <FirstSyncSuccessBanner
                shopId={currentShop.id}
                totalItems={productStats?.total ?? 0}
                lastSyncAt={currentShop.lastSyncAt ?? null}
                syncStatus={currentShop.syncStatus}
              />
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
