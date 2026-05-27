import { useEffect, useRef, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL ?? 'https://api.t4t-gateway.com';

type Model = { id: string; object: 'model'; created: number; owned_by: string };
type Message = { role: 'user' | 'assistant' | 'system'; content: string };
type ChoiceMessage = { role: 'assistant'; content: string };
type Completion = {
  id: string;
  choices: { index: number; message: ChoiceMessage; finish_reason: string }[];
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
};

export function meta() {
  return [{ title: 'Chat · t4t Gateway' }];
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

export default function Chat() {
  const [models, setModels] = useState<Model[]>([]);
  const [model, setModel] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingModels, setLoadingModels] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem('jwt')) {
      window.location.href = '/login';
      return;
    }
    (async () => {
      try {
        const list = await api<{ data: Model[] }>('/v1/models');
        setModels(list.data);
        if (list.data.length > 0) setModel(list.data[0].id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoadingModels(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !model || sending) return;
    setError(null);
    const userMsg: Message = { role: 'user', content: input };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setSending(true);
    try {
      const completion = await api<Completion>('/v1/chat/completions', {
        method: 'POST',
        body: JSON.stringify({ model, messages: next }),
      });
      const reply = completion.choices[0]?.message;
      if (reply) {
        setMessages([...next, { role: reply.role, content: reply.content }]);
      } else {
        throw new Error('No reply from model');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSending(false);
    }
  }

  return (
    <main className='flex min-h-screen flex-col'>
      <header className='border-b border-neutral-200 bg-white px-6 py-3'>
        <div className='mx-auto flex max-w-3xl items-center justify-between'>
          <div className='flex items-center gap-3'>
            <a href='/account' className='text-sm font-medium text-neutral-700 hover:underline'>
              ← Account
            </a>
            <span className='text-neutral-300'>|</span>
            <h1 className='text-sm font-semibold'>Chat</h1>
          </div>
          <select
            aria-label='Model'
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={loadingModels || models.length === 0}
            className='rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm shadow-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900'
          >
            {loadingModels && <option>Loading models…</option>}
            {!loadingModels && models.length === 0 && <option>No models available</option>}
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div
        ref={scrollRef}
        className='mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-6 py-6'
      >
        {messages.length === 0 && (
          <p className='text-center text-sm text-neutral-500'>
            Pick a model and send a message to start.
          </p>
        )}
        <ul className='space-y-4'>
          {messages.map((m, i) => (
            <li
              key={i}
              className={
                m.role === 'user' ? 'flex justify-end' : 'flex justify-start'
              }
            >
              <div
                className={
                  m.role === 'user'
                    ? 'max-w-[80%] rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white'
                    : 'max-w-[80%] whitespace-pre-wrap rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm shadow-sm'
                }
              >
                {m.content}
              </div>
            </li>
          ))}
          {sending && (
            <li className='flex justify-start'>
              <div className='rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-500 shadow-sm'>
                Thinking…
              </div>
            </li>
          )}
        </ul>
      </div>

      {error && (
        <p className='mx-auto w-full max-w-3xl px-6 pb-2 text-sm text-red-700'>
          {error}
        </p>
      )}

      <form
        onSubmit={send}
        className='border-t border-neutral-200 bg-white px-6 py-3'
      >
        <div className='mx-auto flex max-w-3xl gap-2'>
          <input
            type='text'
            placeholder='Message…'
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending || !model}
            className='flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 disabled:opacity-50'
          />
          <button
            type='submit'
            disabled={sending || !model || !input.trim()}
            className='inline-flex h-10 items-center rounded-md bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50'
          >
            Send
          </button>
        </div>
      </form>
    </main>
  );
}
