'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { register } from '@/lib/api';
import { useAuth } from '@/store/auth';

export default function RegisterPage() {
  const router = useRouter();
  const { setSession, hydrate, user, hydrated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hydrated && user) {
      router.push('/dashboard');
    }
  }, [hydrated, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await register({ email, password, name });
      setSession(result.user, result.tokens.accessToken, result.tokens.refreshToken);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
          {error && <div className="text-sm text-red-300">{error}</div>}
          <button className="btn btn--primary w-full" type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create account'}
          </button>
        </form>
        <p className="text-sm subtle">
          Already have an account? <Link className="text-white underline" href="/login">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
