'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function ForgotForm() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    await createClient().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/auth/callback?next=/reset-password` });
    setBusy(false); setDone(true); // same message whether or not the account exists
  }
  return done ? (
    <p role="status" className="rounded-xl bg-tint p-4 text-[14px]">If an account exists for {email}, a reset link is on its way.</p>
  ) : (
    <form onSubmit={submit} className="space-y-4">
      <div><label className="label" htmlFor="fe">Email</label><input id="fe" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></div>
      <button disabled={busy} className="btn btn-primary w-full">{busy ? 'Sending…' : 'Send reset link'}</button>
    </form>
  );
}
