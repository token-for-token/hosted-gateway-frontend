import { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL ?? 'https://api.t4t-gateway.com';

export function meta() {
  return [{ title: 'Log in · t4t Gateway' }];
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/auth/email/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.message ?? body?.error ?? `Login failed (${res.status})`);
      }
      localStorage.setItem('jwt', body.token);
      window.location.href = '/account';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className='flex min-h-screen items-center justify-center px-6'>
      <form
        onSubmit={onSubmit}
        className='w-full max-w-md rounded-lg border border-neutral-200 bg-white p-8 shadow-sm'
      >
        <h1 className='text-2xl font-semibold'>Log in</h1>
        <p className='mt-2 text-sm text-neutral-600'>
          Welcome back.
        </p>

        <div className='mt-6 space-y-4'>
          <div>
            <label htmlFor='email' className='block text-sm font-medium'>
              Email
            </label>
            <input
              id='email'
              type='email'
              autoComplete='email'
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className='mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900'
            />
          </div>

          <div>
            <label htmlFor='password' className='block text-sm font-medium'>
              Password
            </label>
            <input
              id='password'
              type='password'
              autoComplete='current-password'
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className='mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900'
            />
          </div>
        </div>

        {error && (
          <p className='mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700'>
            {error}
          </p>
        )}

        <button
          type='submit'
          disabled={submitting}
          className='mt-6 inline-flex h-10 w-full items-center justify-center rounded-md bg-neutral-900 px-5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50'
        >
          {submitting ? 'Logging in…' : 'Log in'}
        </button>

        <p className='mt-4 text-center text-sm text-neutral-600'>
          No account?{' '}
          <a href='/signup' className='font-medium text-neutral-900 underline'>
            Sign up
          </a>
        </p>
      </form>
    </main>
  );
}
