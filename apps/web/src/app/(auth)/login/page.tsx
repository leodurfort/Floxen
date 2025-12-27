'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/store/auth';
import { useLoginMutation } from '@/hooks/useAuthMutations';

export default function LoginPage() {
  const router = useRouter();
  const { hydrate, user, hydrated } = useAuth();
  const [email, setEmail] = useState('demo@productsynch.com');
  const [password, setPassword] = useState('password123');

  const loginMutation = useLoginMutation();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hydrated && user) {
      router.push('/dashboard');
    }
  }, [hydrated, user, router]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    loginMutation.mutate({ email, password });
  }

  return (
    <main className="shell flex min-h-screen items-center justify-center">
      <div className="panel w-full max-w-md space-y-4">
        <div>
          <p className="uppercase tracking-[0.15em] text-xs text-white/60">ProductSynch</p>
          <h1 className="section-title">Sign in</h1>
          <p className="subtle">Use the demo credentials or your account.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="flex flex-col gap-2">
            <span className="subtle text-sm">Email</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </label>
          <label className="flex flex-col gap-2">
            <span className="subtle text-sm">Password</span>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
          </label>
          {loginMutation.error && (
            <div className="text-sm text-red-300">{loginMutation.error.message}</div>
          )}
          <button className="btn btn--primary w-full" type="submit" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="text-sm subtle">
          Need an account? <Link className="text-white underline" href="/register">Register</Link>
        </p>
      </div>
    </main>
  );
}
