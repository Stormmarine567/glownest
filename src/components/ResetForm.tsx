'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function ResetForm() {
  const router = useRouter();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr('');
    if (pw.length < 8) return setErr('Use at least 8 characters.');
    if (pw !== pw2) return setErr('Passwords do not match.');
    setBusy(true);
    const { error } = await createClient().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setErr(error.message);
    router.replace('/dashboard'); router.refresh();
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <div><label className="label" htmlFor="np">New password</label><input id="np" type="password" required autoComplete="new-password" className="input" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
      <div><label className="label" htmlFor="np2">Confirm password</label><input id="np2" type="password" required autoComplete="new-password" className="input" value={pw2} onChange={(e) => setPw2(e.target.value)} /></div>
      <p role="alert" className="text-[13px] text-red-600">{err}</p>
      <button disabled={busy} className="btn btn-primary w-full">{busy ? 'Saving…' : 'Update password'}</button>
    </form>
  );
}
