import { useEffect, useState } from 'react';
import { Nav } from '~/components/nav';

const API_URL = import.meta.env.VITE_API_URL ?? 'https://api.t4t-gateway.com';

type Health = { status: string; version: string; apiVersion: string };
type Addresses = {
  overlay: string;
  ethereum: string;
  publicKey: string;
  pssPublicKey: string;
  underlay: string[];
};
type Topology = {
  connected: number;
  population: number;
  depth: number;
  reachability: string;
  networkAvailability: string;
};
type Wallet = {
  bzz: string;
  xdai: string;
  walletAddress: string;
  chainID: number;
};
type Stamp = {
  batchID: string;
  label: string;
  depth: number;
  amount: string;
  usable: boolean;
  usageText: string;
  durationDays: number;
};
type ChainState = { block: number; chainTip: number; currentPrice: number };

type Stats = {
  health: Health | null;
  addresses: Addresses | null;
  topology: Topology | null;
  wallet: Wallet | null;
  stamps: Stamp[] | null;
  chain: ChainState | null;
};

export function meta() {
  return [{ title: 'Bee · t4t Gateway' }];
}

async function fetchStats(): Promise<Stats> {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${API_URL}/bee/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    localStorage.removeItem('jwt');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error ?? `Request failed (${res.status})`);
  return body as Stats;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className='rounded-lg border border-neutral-200 bg-white p-5 shadow-sm'>
      <h2 className='text-xs font-semibold uppercase tracking-wide text-neutral-500'>{title}</h2>
      <div className='mt-3 text-sm'>{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className='flex justify-between gap-4 py-1'>
      <span className='text-neutral-500'>{label}</span>
      <span className='break-all text-right font-mono text-neutral-900'>{value}</span>
    </div>
  );
}

export default function BeePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem('jwt')) {
      window.location.href = '/login';
      return;
    }
    fetchStats()
      .then((s) => setStats(s))
      .catch((err) => setError(err instanceof Error ? err.message : 'Unknown error'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <>
        <Nav />
        <main className='flex min-h-[60vh] items-center justify-center'>
          <p className='text-sm text-neutral-600'>Loading Bee stats…</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Nav />
      <main className='mx-auto max-w-3xl px-6 py-10'>
      <h1 className='text-2xl font-semibold'>Bee node</h1>
      <p className='mt-1 text-sm text-neutral-600'>Read-only status of the operator's Bee node.</p>

      {error && (
        <p className='mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700'>{error}</p>
      )}

      <div className='mt-6 grid gap-4'>
        <Card title='Health'>
          {stats?.health ? (
            <>
              <Row label='Status' value={stats.health.status} />
              <Row label='Version' value={stats.health.version} />
              <Row label='API version' value={stats.health.apiVersion} />
            </>
          ) : (
            <p className='text-neutral-500'>unavailable</p>
          )}
        </Card>

        <Card title='Addresses'>
          {stats?.addresses ? (
            <>
              <Row label='Overlay' value={stats.addresses.overlay} />
              <Row label='Ethereum' value={stats.addresses.ethereum} />
              <Row label='Underlays' value={stats.addresses.underlay.length} />
            </>
          ) : (
            <p className='text-neutral-500'>unavailable</p>
          )}
        </Card>

        <Card title='Topology'>
          {stats?.topology ? (
            <>
              <Row label='Connected peers' value={stats.topology.connected} />
              <Row label='Known peers' value={stats.topology.population} />
              <Row label='Depth' value={stats.topology.depth} />
              <Row label='Reachability' value={stats.topology.reachability} />
              <Row label='Network availability' value={stats.topology.networkAvailability} />
            </>
          ) : (
            <p className='text-neutral-500'>unavailable</p>
          )}
        </Card>

        <Card title='Wallet'>
          {stats?.wallet ? (
            <>
              <Row label='Address' value={stats.wallet.walletAddress} />
              <Row label='xBZZ' value={stats.wallet.bzz} />
              <Row label='xDAI' value={stats.wallet.xdai} />
              <Row label='Chain ID' value={stats.wallet.chainID} />
            </>
          ) : (
            <p className='text-neutral-500'>unavailable</p>
          )}
        </Card>

        <Card title='Chain state'>
          {stats?.chain ? (
            <>
              <Row label='Block' value={stats.chain.block} />
              <Row label='Chain tip' value={stats.chain.chainTip} />
              <Row label='Current price (PLUR/chunk)' value={stats.chain.currentPrice} />
            </>
          ) : (
            <p className='text-neutral-500'>unavailable</p>
          )}
        </Card>

        <Card title='Postage batches'>
          {stats?.stamps && stats.stamps.length > 0 ? (
            <ul className='divide-y divide-neutral-200'>
              {stats.stamps.map((s) => (
                <li key={s.batchID} className='py-2'>
                  <p className='font-mono text-xs text-neutral-900'>{s.batchID}</p>
                  <p className='mt-1 text-xs text-neutral-500'>
                    {s.label || '(unlabeled)'} · depth {s.depth} · used {s.usageText} ·{' '}
                    {s.usable ? 'usable' : 'not usable'} · {s.durationDays.toFixed(1)}d left
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className='text-neutral-500'>no batches</p>
          )}
        </Card>
      </div>
    </main>
    </>
  );
}
