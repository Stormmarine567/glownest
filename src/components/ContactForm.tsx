'use client';
import { useState } from 'react';

export function ContactForm() {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setState('busy'); setErr('');
    try {
      const r = await fetch('/api/contact', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(f.entries())),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Could not send your message.');
      setState('done'); (e.target as HTMLFormElement).reset();
    } catch (x) { setState('error'); setErr(x instanceof Error ? x.message : 'Could not send your message.'); }
  }

  return (
    <form onSubmit={submit} className="rounded-[20px] bg-tint-soft p-5 md:p-8">
      <div className="grid gap-5 md:grid-cols-2">
        <div><label className="label" htmlFor="c-name">Name</label><input id="c-name" name="name" required maxLength={120} className="input h-[46px] rounded-xl" placeholder="Your name" /></div>
        <div><label className="label" htmlFor="c-email">Email</label><input id="c-email" name="email" type="email" required className="input h-[46px] rounded-xl" placeholder="your@email.com" /></div>
      </div>
      <div className="mt-5"><label className="label" htmlFor="c-subject">Subject</label><input id="c-subject" name="subject" maxLength={200} className="input h-[46px] rounded-xl" placeholder="How can we help?" /></div>
      <div className="mt-5"><label className="label" htmlFor="c-message">Message</label><textarea id="c-message" name="message" required minLength={5} maxLength={4000} className="textarea min-h-[126px] rounded-xl" placeholder="Tell us more..." /></div>
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      <p role="status" className={`mt-4 min-h-[20px] text-[13px] ${state === 'error' ? 'text-red-600' : 'text-green-700'}`}>
        {state === 'done' ? 'Thank you — your message is on its way. We will reply within one business day.' : state === 'error' ? err : ''}
      </p>
      <button type="submit" disabled={state === 'busy'} className="btn btn-primary mt-2 h-12 w-full rounded-xl font-bold">{state === 'busy' ? 'Sending…' : 'Send Message'}</button>
    </form>
  );
}
