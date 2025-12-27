'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/store/auth';
import { useRegisterMutation } from '@/hooks/useAuthMutations';

export default function RegisterPage() {
  const router = useRouter();
  const { hydrate, user, hydrated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const registerMutation = useRegisterMutation();

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
    registerMutation.mutate({ email, password, name: name || undefined });
  }

  return (
    <main className="shell flex min-h-screen items-center justify-center">
      <div className="panel w-full max-w-md space-y-4">
        <div>
          <p className="uppercase tracking-[0.15em] text-xs text-white/60">ProductSynch</p>
          <h1 className="section-title">Create account</h1>
          <p className="subtle">Register to connect your WooCommerce store.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="flex flex-col gap-2">
            <span className="subtle text-sm">Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} type="text" placeholder="Your name" />
          </label>
          <label className="flex flex-col gap-2">
            <span className="subtle text-sm">Email</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </label>
          <label className="flex flex-col gap-2">
            <span className="subtle text-sm">Password</span>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
          </label>
          {registerMutation.error && (
            <div className="text-sm text-red-300">{registerMutation.error.message}</div>
          )}
          <button className="btn btn--primary w-full" type="submit" disabled={registerMutation.isPending}>
            {registerMutation.isPending ? 'Creating...' : 'Create account'}
          </button>
        </form>
        <p className="text-sm subtle">
          Already have an account? <Link className="text-white underline" href="/login">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
