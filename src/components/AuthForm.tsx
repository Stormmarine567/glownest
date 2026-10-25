'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, Mail } from 'lucide-react';
import { GoogleIcon } from './BrandIcon';
import { createClient } from '@/lib/supabase/client';
import { safeNext } from '@/lib/utils';

type Mode = 'login' | 'register';

export function AuthForm({ mode, next }: { mode: Mode; next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const dest = safeNext(next);
  const isRegister = mode === 'register';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  async function google() {
    setError('');
    const { error: e } = await createClient().auth.signInWithOAuth({
      provider: 'google', options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(dest)}` },
    });
    if (e) setError('Google sign-in is not available right now.');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setNotice('');
    if (isRegister) {
      if (password.length < 8) return setError('Use at least 8 characters for your password.');
      if (password !== confirm) return setError('Passwords do not match.');
    }
    setBusy(true);
    const sb = createClient();
    try {
      if (isRegister) {
        const { data, error: err } = await sb.auth.signUp({
          email: email.trim(), password,
          options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(dest)}` },
        });
        if (err) throw err;
        if (data.session) { router.replace(dest); router.refresh(); }
        else setNotice('Almost there — check your inbox and confirm your email to finish creating your account.');
      } else {
        const { error: err } = await sb.auth.signInWithPassword({ email: email.trim(), password });
        if (err) throw err;
        router.replace(dest); router.refresh();
      }
    } catch (err) {
      const m = err instanceof Error ? err.message : '';
      setError(/invalid login/i.test(m) ? 'Incorrect email or password.' : /registered|already/i.test(m) ? 'An account with this email already exists. Try logging in.' : m || 'Something went wrong. Please try again.');
    } finally { setBusy(false); }
  }

  const field = (id: string, label: string, icon: 'mail' | 'lock', props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <div className="mt-5 first:mt-0">
      <label htmlFor={id} className="mb-2 block text-[13px] font-bold text-ink">{label}</label>
      <div className="relative">
        {icon === 'mail' ? <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.6} /> : <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.6} />}
        <input id={id} className="input h-12 pl-11 shadow-soft" {...props} />
      </div>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-[448px]">
      <div className="rounded-2xl border border-line bg-white p-6 shadow-soft md:p-8">
        <button type="button" onClick={google} className="flex h-[48px] w-full items-center justify-center gap-3 rounded-xl border border-line bg-white text-[14px] font-medium text-ink shadow-soft transition hover:bg-tint-soft">
          <GoogleIcon className="h-[18px] w-[18px]" />Continue with Google
        </button>
        <div className="my-6 flex items-center gap-4 text-[12px] text-muted"><span className="h-px flex-1 bg-line" />OR<span className="h-px flex-1 bg-line" /></div>
        <form onSubmit={submit} noValidate>
          {field('email', 'Email', 'mail', { type: 'email', required: true, autoComplete: 'email', placeholder: 'you@example.com', value: email, onChange: (e) => setEmail(e.target.value) })}
          {field('password', 'Password', 'lock', { type: 'password', required: true, autoComplete: isRegister ? 'new-password' : 'current-password', placeholder: '••••••••', value: password, onChange: (e) => setPassword(e.target.value) })}
          {isRegister && field('confirm', 'Confirm Password', 'lock', { type: 'password', required: true, autoComplete: 'new-password', placeholder: '••••••••', value: confirm, onChange: (e) => setConfirm(e.target.value) })}
          {!isRegister && <div className="mt-3 text-right"><Link href="/forgot-password" className="text-[12px] text-muted underline-offset-2 hover:text-ink hover:underline">Forgot password?</Link></div>}
          <p role="alert" className="mt-4 min-h-[0px] text-[13px] text-red-600">{error}</p>
          {notice && <p role="status" className="mt-4 rounded-lg bg-tint p-3 text-[13px] text-ink">{notice}</p>}
          <button type="submit" disabled={busy} className="mt-4 h-12 w-full rounded-xl bg-navy text-[14px] font-bold text-white shadow-soft transition hover:bg-navy-700 active:scale-[0.99] disabled:opacity-60">
            {busy ? 'Please wait…' : isRegister ? 'Create account' : 'Log in'}
          </button>
        </form>
      </div>
      <p className="mt-6 text-center text-[13px] text-muted">
        {isRegister ? 'Already have an account? ' : 'New to GLOWNEST? '}
        <Link href={isRegister ? `/login${next ? `?next=${encodeURIComponent(next)}` : ''}` : `/register${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-bold text-ink">{isRegister ? 'Log in' : 'Create an account'}</Link>
      </p>
    </div>
  );
}
