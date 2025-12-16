'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/store/auth';
import { listShops } from '@/lib/api';
import { Shop } from '@productsynch/shared';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, accessToken, clear } = useAuth();
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [showShopDropdown, setShowShopDropdown] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  useEffect(() => {
    if (accessToken) {
      loadShops();
    }
  }, [accessToken]);

  async function loadShops() {
    if (!accessToken) return;
    try {
      const data = await listShops(accessToken);
      setShops(data.shops);
      if (data.shops.length > 0 && !selectedShop) {
        setSelectedShop(data.shops[0]);
      }
    } catch (err) {
      // Log error with context for debugging
      console.error('[Sidebar] Failed to load shops', {
        error: err instanceof Error ? {
          message: err.message,
          name: err.name,
          stack: err.stack,
        } : err,
        userId: user?.id,
        timestamp: new Date().toISOString(),
      });
      // TODO: Show error toast/notification to user
    }
  }

  function handleShopChange(shop: Shop) {
    setSelectedShop(shop);
    setShowShopDropdown(false);
    router.push(`/shops/${shop.id}/products`);
  }

  function handleLogout() {
    clear();
    router.push('/login');
  }

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: selectedShop ? `/shops/${selectedShop.id}/products` : '/dashboard', label: 'Products', icon: '📦' },
    { href: '/shops', label: 'Shops', icon: '🏪' },
    { href: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className="fixed left-0 top-0 h-screen w-64 bg-[#1a1d29] border-r border-white/10 flex flex-col">
      {/* Logo */}
      <div className="p-6">
        <h1 className="text-xl font-bold text-white">ProductSynch</h1>
      </div>

      {/* Shop Selector */}
      {shops.length > 0 && (
        <div className="px-4 mb-4">
          <div className="relative">
            <button
              onClick={() => setShowShopDropdown(!showShopDropdown)}
              className="w-full bg-[#252936] hover:bg-[#2d3142] rounded-lg p-3 text-left transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-white/40 mb-1">Current Shop</div>
                  <div className="text-sm text-white font-medium truncate">
                    {selectedShop?.shopName || 'Select a shop'}
                  </div>
                </div>
                <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {showShopDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#252936] rounded-lg border border-white/10 shadow-xl z-50 max-h-64 overflow-y-auto">
                {shops.map((shop) => (
                  <button
                    key={shop.id}
                    onClick={() => handleShopChange(shop)}
                    className={`w-full p-3 text-left hover:bg-[#2d3142] transition-colors ${
                      selectedShop?.id === shop.id ? 'bg-[#2d3142]' : ''
                    }`}
                  >
                    <div className="text-sm text-white font-medium">{shop.shopName}</div>
                    <div className="text-xs text-white/40 mt-0.5">
                      {shop.isConnected ? '✓ Connected' : '○ Not connected'}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          // More precise active state matching
          let isActive = false;
          if (item.label === 'Products') {
            isActive = pathname.includes('/products');
          } else if (item.label === 'Shops') {
            isActive = pathname === '/shops' || (pathname === '/shops' && !pathname.includes('/products'));
          } else {
            isActive = pathname === item.href || (pathname.startsWith(item.href + '/') && item.href !== '/');
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-[#4c5fd5] text-white'
                  : 'text-white/60 hover:text-white hover:bg-[#252936]'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Account Section */}
      <div className="border-t border-white/10 p-4">
        <div className="relative">
          <button
            onClick={() => setShowAccountMenu(!showAccountMenu)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[#252936] transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-[#4c5fd5] flex items-center justify-center text-white text-sm font-semibold">
              {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="text-sm text-white font-medium truncate">
                {user?.name || user?.email || 'Account'}
              </div>
              <div className="text-xs text-white/40">
                {user?.subscriptionTier || 'FREE'}
              </div>
            </div>
            <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showAccountMenu && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#252936] rounded-lg border border-white/10 shadow-xl">
              <Link
                href="/settings"
                className="flex items-center gap-3 px-4 py-3 hover:bg-[#2d3142] transition-colors rounded-t-lg"
                onClick={() => setShowAccountMenu(false)}
              >
                <span className="text-white/60">⚙️</span>
                <span className="text-sm text-white">Account settings</span>
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#2d3142] transition-colors rounded-b-lg"
              >
                <span className="text-white/60">→</span>
                <span className="text-sm text-white">Log out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
