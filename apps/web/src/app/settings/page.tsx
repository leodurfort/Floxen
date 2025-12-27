'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/settings/profile');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0d0f1a] flex items-center justify-center">
      <div className="animate-pulse text-white/40">Loading...</div>
    </div>
  );
}
