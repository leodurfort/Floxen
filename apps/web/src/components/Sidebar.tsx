'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/store/auth';
import { useCurrentShop } from '@/hooks/useCurrentShop';
import { useClickOutside } from '@/hooks/useWooFieldsQuery';
import type { Shop } from '@productsynch/shared';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clear } = useAuth();

  const { currentShop, shops } = useCurrentShop();

  const [showShopDropdown, setShowShopDropdown] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  const shopDropdownRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useClickOutside(shopDropdownRef, useCallback(() => setShowShopDropdown(false), []), showShopDropdown);
  useClickOutside(accountMenuRef, useCallback(() => setShowAccountMenu(false), []), showAccountMenu);

  function handleShopChange(shop: Shop) {
    // Just navigate - the URL becomes the source of truth
    setShowShopDropdown(false);
    router.push(`/shops/${shop.id}/products`);
  }

  function handleLogout() {
    clear();
    router.push('/login');
  }

  // Build nav items based on current shop from URL
  const navItems = [
    { href: '/shops', label: 'Stores', icon: '🏪' },
    ...(currentShop?.isConnected ? [
      { href: `/shops/${currentShop.id}/setup`, label: 'Setup', icon: '⚙️' },
      { href: `/shops/${currentShop.id}/products`, label: 'Products', icon: '📦' },
    ] : []),
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  ];

  return (
    <div className="fixed left-0 top-0 h-screen w-52 bg-[#C05A30] border-r border-white/20 flex flex-col">
      {/* Logo */}
      <div className="p-6">
        <h1 className="text-xl font-bold text-white">ProductSynch</h1>
      </div>

      {/* Shop Selector */}
      {shops.length > 0 && (
        <div className="px-4 mb-4">
          <div className="relative" ref={shopDropdownRef}>
            <button
              onClick={() => setShowShopDropdown(!showShopDropdown)}
              className="w-full bg-[#A84E28] hover:bg-white/10 rounded-lg p-3 text-left transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-white/70 mb-1">Current Store</div>
                  <div className="text-sm text-white font-medium truncate">
                    {currentShop?.sellerUrl?.replace(/^https?:\/\//, '') || 'Select a store'}
                  </div>
                </div>
                <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {showShopDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#A84E28] rounded-lg border border-white/20 shadow-xl z-50 max-h-64 overflow-y-auto">
                {shops.map((shop) => (
                  <button
                    key={shop.id}
                    onClick={() => handleShopChange(shop)}
                    className={`w-full p-3 text-left hover:bg-white/10 transition-colors ${
                      currentShop?.id === shop.id ? 'bg-white/10' : ''
                    }`}
                  >
                    <div className="text-sm text-white font-medium truncate">
                      {shop.sellerUrl?.replace(/^https?:\/\//, '') || shop.shopName}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-4 overflow-y-auto">
        {navItems.map((item) => {
          // More precise active state matching
          let isActive = false;
          if (item.label === 'Setup') {
            isActive = pathname.includes('/setup');
          } else if (item.label === 'Products') {
            isActive = pathname.includes('/products');
          } else if (item.label === 'Stores') {
            isActive = pathname === '/shops';
          } else {
            isActive = pathname === item.href || (pathname.startsWith(item.href + '/') && item.href !== '/');
          }
          return (
            <div key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'text-white/80 hover:text-white hover:bg-[#A84E28]'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            </div>
          );
        })}
      </nav>

      {/* User Account Section */}
      <div className="border-t border-white/20 p-4">
        <div className="relative" ref={accountMenuRef}>
          <button
            onClick={() => setShowAccountMenu(!showAccountMenu)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[#A84E28] transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-semibold">
              {user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="text-sm text-white font-medium truncate">
                {user?.firstName || user?.email || 'Account'}
              </div>
              <div className="text-xs text-white/70">
                {user?.subscriptionTier || 'FREE'}
              </div>
            </div>
            <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showAccountMenu && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#A84E28] rounded-lg border border-white/20 shadow-xl">
              <Link
                href="/settings"
                onClick={() => setShowAccountMenu(false)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors rounded-t-lg"
              >
                <span className="text-white/80">⚙</span>
                <span className="text-sm text-white">Settings</span>
              </Link>
              <div className="border-t border-white/10" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors rounded-b-lg"
              >
                <span className="text-white/80">→</span>
                <span className="text-sm text-white">Log out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
