import { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL ?? 'https://api.t4t-gateway.com';

type SignupResponse = {
  token: string;
  user: { id: string; email: string; role: string; emailVerified: boolean };
  verificationToken?: string;
};

export function meta() {
  return [{ title: 'Sign up · t4t Gateway' }];
}

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SignupResponse | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/auth/email/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.message ?? body?.error ?? `Signup failed (${res.status})`);
      }
      localStorage.setItem('jwt', body.token);
      setResult(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <main className='flex min-h-screen items-center justify-center px-6'>
        <div className='w-full max-w-md rounded-lg border border-neutral-200 bg-white p-8 shadow-sm'>
          <h1 className='text-2xl font-semibold'>Check your email</h1>
          <p className='mt-2 text-sm text-neutral-600'>
            We sent a verification link to <strong>{result.user.email}</strong>.
            Open it to activate your 50 xBZZ welcome credit.
          </p>
          {result.verificationToken && (
            <div className='mt-6 rounded-md bg-amber-50 p-4 text-sm text-amber-900'>
              <p className='font-medium'>Dev mode — verification token:</p>
              <code className='mt-1 block break-all font-mono text-xs'>
                {result.verificationToken}
              </code>
              <a
                href={`/verify?token=${result.verificationToken}`}
                className='mt-3 inline-block text-amber-900 underline'
              >
                Verify now →
              </a>
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className='flex min-h-screen items-center justify-center px-6'>
      <form
        onSubmit={onSubmit}
        className='w-full max-w-md rounded-lg border border-neutral-200 bg-white p-8 shadow-sm'
      >
        <h1 className='text-2xl font-semibold'>Sign up</h1>
        <p className='mt-2 text-sm text-neutral-600'>
          50 xBZZ welcome credit. No wallet needed.
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
              autoComplete='new-password'
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className='mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900'
            />
            <p className='mt-1 text-xs text-neutral-500'>At least 8 characters.</p>
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
          {submitting ? 'Creating account…' : 'Create account'}
        </button>

        <p className='mt-4 text-center text-sm text-neutral-600'>
          Already have an account?{' '}
          <a href='/login' className='font-medium text-neutral-900 underline'>
            Log in
          </a>
        </p>
      </form>
    </main>
  );
}
