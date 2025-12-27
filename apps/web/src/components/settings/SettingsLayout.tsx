'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SettingsLayoutProps {
  children: React.ReactNode;
}

const settingsNav = [
  {
    href: '/settings/profile',
    label: 'Profile',
    description: 'Update your personal information',
  },
  {
    href: '/settings/security',
    label: 'Security',
    description: 'Manage your password and email',
  },
  {
    href: '/settings/account',
    label: 'Account',
    description: 'Account preferences and deletion',
  },
];

export function SettingsLayout({ children }: SettingsLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="container mx-auto px-6 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Settings</h1>
        <p className="text-white/60">Manage your account settings and preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Settings Navigation */}
        <nav className="lg:w-64 flex-shrink-0">
          <ul className="space-y-1">
            {settingsNav.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`
                      block px-4 py-3 rounded-lg transition-colors
                      ${isActive
                        ? 'bg-[#4c5fd5]/20 text-white border border-[#4c5fd5]/30'
                        : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }
                    `}
                  >
                    <span className="font-medium">{item.label}</span>
                    <p className="text-xs text-white/50 mt-0.5">{item.description}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Settings Content */}
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
}
