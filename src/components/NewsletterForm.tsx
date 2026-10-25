'use client';
import { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';

export function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('loading');
    try {
      const r = await fetch('/api/newsletter/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Something went wrong');
      setState('done'); setMsg(j.message || 'You are subscribed!'); setEmail('');
    } catch (err) {
      setState('error'); setMsg(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="flex h-[42px] max-w-[225px] overflow-hidden rounded-[10px] border border-white/15 bg-white/5 md:w-[225px]">
        <input
          type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" aria-label="Email address"
          className="min-w-0 flex-1 bg-transparent px-3 text-[14px] text-white placeholder:text-white/50 focus:outline-none"
        />
        <button type="submit" disabled={state === 'loading'} aria-label="Subscribe" className="flex w-[40px] items-center justify-center bg-white text-navy transition hover:bg-tint disabled:opacity-60">
          {state === 'done' ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
        </button>
      </div>
      <p role="status" className={`mt-2 min-h-[18px] text-[12px] ${state === 'error' ? 'text-red-300' : 'text-white/70'}`}>{state === 'done' || state === 'error' ? msg : ''}</p>
    </form>
  );
}
