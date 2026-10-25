'use client';
import { useState } from 'react';

export function PayNow({ orderId, providers }: { orderId: string; providers: { provider: string; display_name: string }[] }) {
  const [provider, setProvider] = useState(providers[0]?.provider ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  if (providers.length === 0) return <p className="text-[13px] text-muted">Online payment is not available right now.</p>;
  async function go() {
    setBusy(true); setErr('');
    const r = await fetch('/api/orders/pay', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId, provider }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.url) { setErr(j.error || 'Could not start payment.'); setBusy(false); return; }
    window.location.assign(j.url);
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      {providers.length > 1 && <select aria-label="Payment method" className="input h-10 w-auto" value={provider} onChange={(e) => setProvider(e.target.value)}>{providers.map((p) => <option key={p.provider} value={p.provider}>{p.display_name}</option>)}</select>}
      <button onClick={go} disabled={busy} className="btn btn-primary h-10">{busy ? 'Redirecting…' : 'Pay now'}</button>
      {err && <p role="alert" className="text-[13px] text-red-600">{err}</p>}
    </div>
  );
}
