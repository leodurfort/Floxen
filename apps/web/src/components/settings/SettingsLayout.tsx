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
    href: '/settings/billing',
    label: 'Billing',
    description: 'Manage your subscription plan',
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
    <div className="p-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Manage your account settings and preferences</p>
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
                        ? 'bg-[#FA7315]/10 text-[#FA7315] border border-[#FA7315]/30'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >
                    <span className="font-medium">{item.label}</span>
                    <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
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
