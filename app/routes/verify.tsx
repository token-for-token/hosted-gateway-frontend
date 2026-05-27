import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';

const API_URL = import.meta.env.VITE_API_URL ?? 'https://api.t4t-gateway.com';

type Status = 'pending' | 'success' | 'already' | 'error';

export function meta() {
  return [{ title: 'Verify email · t4t Gateway' }];
}

export default function Verify() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<Status>('pending');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Missing verification token in URL.');
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${API_URL}/auth/email/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const body = await res.json();
        if (!res.ok) {
          throw new Error(body?.message ?? body?.error ?? `Verify failed (${res.status})`);
        }
        setStatus(body.alreadyVerified ? 'already' : 'success');
      } catch (err) {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Unknown error');
      }
    })();
  }, [token]);

  return (
    <main className='flex min-h-screen items-center justify-center px-6'>
      <div className='w-full max-w-md rounded-lg border border-neutral-200 bg-white p-8 shadow-sm'>
        {status === 'pending' && (
          <>
            <h1 className='text-2xl font-semibold'>Verifying…</h1>
            <p className='mt-2 text-sm text-neutral-600'>One moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <h1 className='text-2xl font-semibold'>Email verified</h1>
            <p className='mt-2 text-sm text-neutral-600'>
              Your 50 xBZZ welcome credit is being applied.
            </p>
            <a
              href='/login'
              className='mt-6 inline-flex h-10 items-center rounded-md bg-neutral-900 px-5 text-sm font-medium text-white hover:bg-neutral-700'
            >
              Continue to log in
            </a>
          </>
        )}

        {status === 'already' && (
          <>
            <h1 className='text-2xl font-semibold'>Already verified</h1>
            <p className='mt-2 text-sm text-neutral-600'>
              This email was verified previously. Nothing to do.
            </p>
            <a
              href='/login'
              className='mt-6 inline-flex h-10 items-center rounded-md bg-neutral-900 px-5 text-sm font-medium text-white hover:bg-neutral-700'
            >
              Log in
            </a>
          </>
        )}

        {status === 'error' && (
          <>
            <h1 className='text-2xl font-semibold'>Verification failed</h1>
            <p className='mt-2 text-sm text-red-700'>{message}</p>
            <a
              href='/signup'
              className='mt-6 inline-flex h-10 items-center rounded-md border border-neutral-300 bg-white px-5 text-sm font-medium hover:bg-neutral-100'
            >
              Back to sign up
            </a>
          </>
        )}
      </div>
    </main>
  );
}
