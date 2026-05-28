import { useEffect, useState } from 'react';
import { Nav } from '~/components/nav';

const API_URL = import.meta.env.VITE_API_URL ?? 'https://api.t4t-gateway.com';
const WEI_PER_XBZZ = 10n ** 18n;

type User = { id: string; email: string; role: string; emailVerified: boolean };
type Account = {
  id: string;
  status: string;
  balanceXbzzWei: string;
  reservedXbzzWei: string;
  availableXbzzWei: string;
  balanceUsd: number | null;
  availableUsd: number | null;
};
type LedgerEntry = {
  id: string;
  kind: string;
  deltaXbzzWei: string;
  createdAt: string;
  gatewayJobId: string | null;
  topupId: string | null;
  note: string | null;
};
type ApiKey = {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
  scopeMaxXbzzPerDay: string | null;
  modelAllowlist: string[];
};
type NewApiKey = { id: string; name: string; key: string; createdAt: string };
type Job = {
  id: string;
  status: string;
  modelId: string;
  provider: string;
  estimatedMaxXbzzWei: string;
  actualXbzzWei: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  createdAt: string;
  ackedAt: string | null;
  deliveredAt: string | null;
  claimedAt: string | null;
  errorMessage: string | null;
};

export function meta() {
  return [{ title: 'Account · t4t Gateway' }];
}

function formatXbzz(weiStr: string): string {
  const wei = BigInt(weiStr);
  const whole = wei / WEI_PER_XBZZ;
  const frac = wei % WEI_PER_XBZZ;
  const fracStr = frac.toString().padStart(18, '0').slice(0, 4);
  return `${whole.toString()}.${fracStr}`;
}

function formatUsd(cents: number | null): string {
  if (cents === null) return '—';
  return `$${(cents / 100).toFixed(2)}`;
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('jwt') : null;
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  if (res.status === 401) {
    localStorage.removeItem('jwt');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  const body = await res.json();
  if (!res.ok) throw new Error(body?.message ?? body?.error ?? `Request failed (${res.status})`);
  return body as T;
}

export default function Account() {
  const [user, setUser] = useState<User | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);
  const [createdKey, setCreatedKey] = useState<NewApiKey | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem('jwt')) {
      window.location.href = '/login';
      return;
    }
    (async () => {
      try {
        const [u, a, l, k, j] = await Promise.all([
          api<User>('/users/me'),
          api<Account>('/accounts/me'),
          api<LedgerEntry[]>('/accounts/me/ledger'),
          api<ApiKey[]>('/api-keys'),
          api<Job[]>('/v1/jobs?limit=50'),
        ]);
        setUser(u);
        setAccount(a);
        setLedger(l);
        setKeys(k);
        setJobs(j);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function createKey(e: React.FormEvent) {
    e.preventDefault();
    setCreatingKey(true);
    try {
      const created = await api<NewApiKey>('/api-keys', {
        method: 'POST',
        body: JSON.stringify({ name: newKeyName }),
      });
      setCreatedKey(created);
      setNewKeyName('');
      const k = await api<ApiKey[]>('/api-keys');
      setKeys(k);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setCreatingKey(false);
    }
  }

  async function revokeKey(id: string) {
    if (!confirm('Revoke this API key? Existing requests using it will start failing.')) return;
    try {
      await api(`/api-keys/${id}`, { method: 'DELETE' });
      setKeys(keys.filter((k) => k.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  function signOut() {
    localStorage.removeItem('jwt');
    window.location.href = '/';
  }

  async function copyKey(key: string) {
    await navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <>
        <Nav />
        <main className='flex min-h-[60vh] items-center justify-center'>
          <p className='text-sm text-neutral-600'>Loading…</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Nav />
      <main className='mx-auto max-w-3xl px-6 py-10'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-semibold'>Account</h1>
          {user && <p className='text-sm text-neutral-600'>{user.email}</p>}
        </div>
        <button
          onClick={signOut}
          className='text-sm font-medium text-neutral-700 underline'
        >
          Sign out
        </button>
      </div>

      {error && (
        <p className='mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700'>
          {error}
        </p>
      )}

      {user && !user.emailVerified && (
        <p className='mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900'>
          Your email isn't verified yet. The welcome credit lands once you do.
        </p>
      )}

      {account && (
        <section className='mt-8 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm'>
          <p className='text-xs font-medium uppercase tracking-wide text-neutral-500'>
            Balance
          </p>
          <p className='mt-1 text-4xl font-semibold tracking-tight'>
            {formatXbzz(account.availableXbzzWei)}{' '}
            <span className='text-xl font-medium text-neutral-500'>xBZZ</span>
          </p>
          {account.availableUsd !== null && (
            <p className='mt-1 text-sm text-neutral-500'>
              ≈ {formatUsd(account.availableUsd)} USD
            </p>
          )}
          {BigInt(account.reservedXbzzWei) > 0n && (
            <p className='mt-2 text-xs text-neutral-500'>
              {formatXbzz(account.reservedXbzzWei)} xBZZ reserved on in-flight jobs.
            </p>
          )}
        </section>
      )}

      <section className='mt-8'>
        <h2 className='text-lg font-semibold'>API Keys</h2>
        <form
          onSubmit={createKey}
          className='mt-3 flex gap-2 rounded-lg border border-neutral-200 bg-white p-4'
        >
          <input
            type='text'
            placeholder='Key name (e.g. laptop, ci)'
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            className='flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900'
          />
          <button
            type='submit'
            disabled={creatingKey}
            className='inline-flex h-10 items-center rounded-md bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50'
          >
            {creatingKey ? 'Creating…' : 'Create key'}
          </button>
        </form>

        {keys.length === 0 ? (
          <p className='mt-4 text-sm text-neutral-500'>No keys yet.</p>
        ) : (
          <ul className='mt-4 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white'>
            {keys.map((k) => (
              <li key={k.id} className='flex items-center justify-between px-4 py-3'>
                <div>
                  <p className='text-sm font-medium'>{k.name || '(unnamed)'}</p>
                  <p className='text-xs text-neutral-500'>
                    Created {new Date(k.createdAt).toLocaleDateString()}
                    {k.lastUsedAt
                      ? ` · last used ${new Date(k.lastUsedAt).toLocaleDateString()}`
                      : ' · never used'}
                  </p>
                </div>
                <button
                  onClick={() => revokeKey(k.id)}
                  className='text-sm font-medium text-red-700 hover:underline'
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className='mt-8'>
        <h2 className='text-lg font-semibold'>Recent jobs</h2>
        {jobs.length === 0 ? (
          <p className='mt-3 text-sm text-neutral-500'>No jobs yet.</p>
        ) : (
          <div className='mt-3 overflow-x-auto rounded-lg border border-neutral-200 bg-white'>
            <table className='min-w-full text-sm'>
              <thead className='border-b border-neutral-200 bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500'>
                <tr>
                  <th className='px-4 py-2 font-medium'>Model</th>
                  <th className='px-4 py-2 font-medium'>Status</th>
                  <th className='px-4 py-2 font-medium'>Provider</th>
                  <th className='px-4 py-2 font-medium'>Tokens</th>
                  <th className='px-4 py-2 text-right font-medium'>xBZZ</th>
                  <th className='px-4 py-2 font-medium'>When</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-neutral-200'>
                {jobs.slice(0, 25).map((j) => {
                  const tokens =
                    j.promptTokens !== null || j.completionTokens !== null
                      ? `${j.promptTokens ?? '—'} / ${j.completionTokens ?? '—'}`
                      : '—';
                  const xbzz = j.actualXbzzWei
                    ? formatXbzz(j.actualXbzzWei)
                    : `~${formatXbzz(j.estimatedMaxXbzzWei)}`;
                  const statusColor =
                    j.status === 'claimed' || j.status === 'delivered'
                      ? 'bg-emerald-100 text-emerald-800'
                      : j.status === 'failed' || j.status === 'cancelled'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-neutral-100 text-neutral-700';
                  return (
                    <tr key={j.id}>
                      <td className='px-4 py-2 font-mono text-xs'>{j.modelId}</td>
                      <td className='px-4 py-2'>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}>
                          {j.status}
                        </span>
                      </td>
                      <td className='px-4 py-2 font-mono text-xs text-neutral-500'>
                        {j.provider.slice(0, 6)}…{j.provider.slice(-4)}
                      </td>
                      <td className='px-4 py-2 font-mono text-xs'>{tokens}</td>
                      <td className='px-4 py-2 text-right font-mono text-xs'>{xbzz}</td>
                      <td className='px-4 py-2 text-xs text-neutral-500'>
                        {new Date(j.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className='mt-8'>
        <h2 className='text-lg font-semibold'>Recent activity</h2>
        {ledger.length === 0 ? (
          <p className='mt-3 text-sm text-neutral-500'>No ledger entries yet.</p>
        ) : (
          <ul className='mt-3 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white'>
            {ledger.slice(0, 20).map((entry) => {
              const delta = BigInt(entry.deltaXbzzWei);
              const positive = delta > 0n;
              return (
                <li key={entry.id} className='flex items-center justify-between px-4 py-3'>
                  <div>
                    <p className='text-sm font-medium'>{entry.kind}</p>
                    <p className='text-xs text-neutral-500'>
                      {new Date(entry.createdAt).toLocaleString()}
                      {entry.note ? ` · ${entry.note}` : ''}
                    </p>
                  </div>
                  <p
                    className={`font-mono text-sm ${positive ? 'text-emerald-700' : 'text-neutral-900'}`}
                  >
                    {positive ? '+' : ''}
                    {formatXbzz(entry.deltaXbzzWei)}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {createdKey && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6'
          onClick={() => setCreatedKey(null)}
        >
          <div
            className='w-full max-w-md rounded-lg bg-white p-6 shadow-lg'
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className='text-lg font-semibold'>Save your API key</h3>
            <p className='mt-1 text-sm text-neutral-600'>
              This is the only time you'll see it. Store it somewhere safe.
            </p>
            <pre className='mt-4 overflow-x-auto rounded-md bg-neutral-100 p-3 font-mono text-xs'>
              {createdKey.key}
            </pre>
            <div className='mt-4 flex gap-2'>
              <button
                onClick={() => copyKey(createdKey.key)}
                className='inline-flex h-9 items-center rounded-md border border-neutral-300 bg-white px-3 text-sm font-medium hover:bg-neutral-100'
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={() => setCreatedKey(null)}
                className='inline-flex h-9 items-center rounded-md bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-700'
              >
                I've saved it
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
    </>
  );
}
