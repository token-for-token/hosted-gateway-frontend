import { useEffect, useRef, useState } from 'react';
import { Nav } from '~/components/nav';

const API_URL = import.meta.env.VITE_API_URL ?? 'https://api.t4t-gateway.com';
const SESSIONS_KEY = 't4t:chatSessions';
const ACTIVE_SESSION_KEY = 't4t:activeChatId';

type Model = { id: string; object: 'model'; created: number; owned_by: string };
type Message = { role: 'user' | 'assistant' | 'system'; content: string };
type ChoiceMessage = { role: 'assistant'; content: string };
type Completion = {
  id: string;
  choices: { index: number; message: ChoiceMessage; finish_reason: string }[];
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
};
type ChatSession = {
  id: string;
  title: string;
  model: string;
  messages: Message[];
  updatedAt: number;
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

function newSessionId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function titleFor(messages: Message[]): string {
  const firstUser = messages.find((m) => m.role === 'user');
  if (!firstUser) return 'New chat';
  const text = firstUser.content.trim().replace(/\s+/g, ' ');
  if (!text) return 'New chat';
  return text.length > 40 ? `${text.slice(0, 40)}…` : text;
}

function loadSessions(): ChatSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: ChatSession[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export default function Chat() {
  const [models, setModels] = useState<Model[]>([]);
  const [model, setModel] = useState<string>('');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
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

    const stored = loadSessions();
    const storedActiveId = localStorage.getItem(ACTIVE_SESSION_KEY);
    const initial =
      stored.find((s) => s.id === storedActiveId) ??
      [...stored].sort((a, b) => b.updatedAt - a.updatedAt)[0] ??
      null;

    if (initial) {
      setSessions(stored);
      setActiveId(initial.id);
      setMessages(initial.messages);
      setModel(initial.model);
      localStorage.setItem(ACTIVE_SESSION_KEY, initial.id);
    } else {
      const fresh: ChatSession = {
        id: newSessionId(),
        title: 'New chat',
        model: '',
        messages: [],
        updatedAt: Date.now(),
      };
      setSessions([fresh]);
      setActiveId(fresh.id);
      saveSessions([fresh]);
      localStorage.setItem(ACTIVE_SESSION_KEY, fresh.id);
    }

    (async () => {
      try {
        const list = await api<{ data: Model[] }>('/v1/models');
        setModels(list.data);
        setModel((current) => current || (list.data.length > 0 ? list.data[0].id : ''));
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

  function persist(id: string, mdl: string, msgs: Message[]) {
    setSessions((prev) => {
      const updated = prev.map((s) =>
        s.id === id ? { ...s, model: mdl, messages: msgs, title: titleFor(msgs), updatedAt: Date.now() } : s
      );
      saveSessions(updated);
      return updated;
    });
  }

  function selectSession(id: string) {
    const session = sessions.find((s) => s.id === id);
    if (!session) return;
    setActiveId(id);
    setMessages(session.messages);
    setModel(session.model || model);
    setError(null);
    localStorage.setItem(ACTIVE_SESSION_KEY, id);
  }

  function newChat() {
    const fresh: ChatSession = {
      id: newSessionId(),
      title: 'New chat',
      model,
      messages: [],
      updatedAt: Date.now(),
    };
    setSessions((prev) => {
      const updated = [fresh, ...prev];
      saveSessions(updated);
      return updated;
    });
    setActiveId(fresh.id);
    setMessages([]);
    setError(null);
    localStorage.setItem(ACTIVE_SESSION_KEY, fresh.id);
  }

  function deleteSession(id: string) {
    setSessions((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      saveSessions(updated);

      if (id === activeId) {
        const next = [...updated].sort((a, b) => b.updatedAt - a.updatedAt)[0];
        if (next) {
          setActiveId(next.id);
          setMessages(next.messages);
          setModel(next.model || model);
          localStorage.setItem(ACTIVE_SESSION_KEY, next.id);
        } else {
          const fresh: ChatSession = {
            id: newSessionId(),
            title: 'New chat',
            model,
            messages: [],
            updatedAt: Date.now(),
          };
          updated.push(fresh);
          saveSessions(updated);
          setActiveId(fresh.id);
          setMessages([]);
          localStorage.setItem(ACTIVE_SESSION_KEY, fresh.id);
        }
      }

      return updated;
    });
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !model || sending || !activeId) return;
    setError(null);
    const userMsg: Message = { role: 'user', content: input };
    const next = [...messages, userMsg];
    setMessages(next);
    persist(activeId, model, next);
    setInput('');
    setSending(true);
    try {
      const completion = await api<Completion>('/v1/chat/completions', {
        method: 'POST',
        body: JSON.stringify({ model, messages: next }),
      });
      const reply = completion.choices[0]?.message;
      if (reply) {
        const withReply = [...next, { role: reply.role, content: reply.content }];
        setMessages(withReply);
        persist(activeId, model, withReply);
      } else {
        throw new Error('No reply from model');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSending(false);
    }
  }

  const sortedSessions = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <main className='flex h-screen flex-col'>
      <Nav />
      <div className='border-b border-neutral-200 bg-white px-6 py-2'>
        <div className='mx-auto flex max-w-5xl items-center justify-end'>
          <select
            aria-label='Model'
            value={model}
            onChange={(e) => {
              setModel(e.target.value);
              if (activeId) persist(activeId, e.target.value, messages);
            }}
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
      </div>

      <div className='mx-auto flex w-full max-w-5xl flex-1 overflow-hidden'>
        <aside className='hidden w-64 shrink-0 flex-col border-r border-neutral-200 bg-white sm:flex'>
          <div className='p-3'>
            <button
              onClick={newChat}
              className='inline-flex h-9 w-full items-center justify-center rounded-md bg-neutral-900 px-3 text-sm font-medium text-white hover:bg-neutral-700'
            >
              New chat
            </button>
          </div>
          <ul className='flex-1 space-y-1 overflow-y-auto px-2 pb-3'>
            {sortedSessions.map((s) => (
              <li key={s.id} className='group flex items-center'>
                <button
                  onClick={() => selectSession(s.id)}
                  className={`flex-1 truncate rounded-md px-3 py-2 text-left text-sm ${
                    s.id === activeId
                      ? 'bg-neutral-900 text-white'
                      : 'text-neutral-700 hover:bg-neutral-100'
                  }`}
                  title={s.title}
                >
                  {s.title}
                </button>
                <button
                  onClick={() => deleteSession(s.id)}
                  aria-label={`Delete chat: ${s.title}`}
                  className={`ml-1 hidden shrink-0 rounded-md px-2 py-2 text-xs group-hover:block ${
                    s.id === activeId
                      ? 'text-neutral-300 hover:text-white'
                      : 'text-neutral-400 hover:text-neutral-900'
                  }`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className='flex min-w-0 flex-1 flex-col'>
          <div ref={scrollRef} className='mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-6 py-6'>
            {messages.length === 0 && (
              <p className='text-center text-sm text-neutral-500'>
                Pick a model and send a message to start.
              </p>
            )}
            <ul className='space-y-4'>
              {messages.map((m, i) => (
                <li
                  key={i}
                  className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
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
            <p className='mx-auto w-full max-w-3xl px-6 pb-2 text-sm text-red-700'>{error}</p>
          )}

          <form onSubmit={send} className='border-t border-neutral-200 bg-white px-6 py-3'>
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
        </div>
      </div>
    </main>
  );
}
