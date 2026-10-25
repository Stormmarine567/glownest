'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function AccountSecurity({ email }: { email: string }) {
  const [pw, setPw] = useState(''); const [pw2, setPw2] = useState(''); const [newEmail, setNewEmail] = useState('');
  const [m1, setM1] = useState<{ ok: boolean; t: string } | null>(null); const [m2, setM2] = useState<{ ok: boolean; t: string } | null>(null);
  const [b1, setB1] = useState(false); const [b2, setB2] = useState(false);

  async function changePw(e: React.FormEvent) {
    e.preventDefault(); setM1(null);
    if (pw.length < 8) return setM1({ ok: false, t: 'Use at least 8 characters.' });
    if (pw !== pw2) return setM1({ ok: false, t: 'Passwords do not match.' });
    setB1(true);
    const { error } = await createClient().auth.updateUser({ password: pw });
    setB1(false);
    if (error) return setM1({ ok: false, t: error.message });
    setPw(''); setPw2(''); setM1({ ok: true, t: 'Password updated.' });
  }
  async function changeEmail(e: React.FormEvent) {
    e.preventDefault(); setM2(null); setB2(true);
    const { error } = await createClient().auth.updateUser({ email: newEmail.trim() }, { emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard/profile` });
    setB2(false);
    if (error) return setM2({ ok: false, t: error.message });
    setNewEmail(''); setM2({ ok: true, t: 'Check both inboxes and confirm the change to finish.' });
  }
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <form onSubmit={changePw} className="rounded-2xl bg-white p-5 shadow-soft">
        <h3 className="text-[16px]">Change password</h3>
        <label className="label mt-4" htmlFor="pw1">New password</label><input id="pw1" type="password" autoComplete="new-password" className="input" value={pw} onChange={(e) => setPw(e.target.value)} />
        <label className="label mt-3" htmlFor="pw2">Confirm password</label><input id="pw2" type="password" autoComplete="new-password" className="input" value={pw2} onChange={(e) => setPw2(e.target.value)} />
        {m1 && <p role="status" className={`mt-3 text-[13px] ${m1.ok ? 'text-green-700' : 'text-red-600'}`}>{m1.t}</p>}
        <button disabled={b1} className="btn btn-primary mt-4 h-11">{b1 ? 'Saving…' : 'Update password'}</button>
      </form>
      <form onSubmit={changeEmail} className="rounded-2xl bg-white p-5 shadow-soft">
        <h3 className="text-[16px]">Change email</h3>
        <p className="mt-1 text-[12px] text-muted">Currently {email}. You will confirm the change from your inbox.</p>
        <label className="label mt-4" htmlFor="ne">New email</label><input id="ne" type="email" required className="input" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
        {m2 && <p role="status" className={`mt-3 text-[13px] ${m2.ok ? 'text-green-700' : 'text-red-600'}`}>{m2.t}</p>}
        <button disabled={b2} className="btn btn-primary mt-4 h-11">{b2 ? 'Sending…' : 'Change email'}</button>
      </form>
    </div>
  );
}
