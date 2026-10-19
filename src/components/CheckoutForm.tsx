'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { useCart } from './CartProvider';
import { OrderSummary, useCartPricing } from './CartView';

interface Addr { id: string; label: string | null; full_name: string; phone: string | null; line1: string; line2: string | null; city: string; state: string | null; postal_code: string | null; country: string }
const empty = { full_name: '', phone: '', line1: '', line2: '', city: '', state: '', postal_code: '', country: 'NG' };

export function CheckoutForm({ defaultName, addresses, providers, initialCode }: {
  defaultName: string; addresses: Addr[]; providers: { provider: string; display_name: string }[]; initialCode: string | null;
}) {
  const { lines } = useCart();
  const def = addresses[0];
  const [addr, setAddr] = useState(def ? { full_name: def.full_name, phone: def.phone ?? '', line1: def.line1, line2: def.line2 ?? '', city: def.city, state: def.state ?? '', postal_code: def.postal_code ?? '', country: def.country } : { ...empty, full_name: defaultName });
  const [methodId, setMethodId] = useState<string | null>(null);
  const [provider, setProvider] = useState(providers[0]?.provider ?? '');
  const [save, setSave] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { pricing } = useCartPricing(initialCode, methodId);
  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement>) => setAddr((a) => ({ ...a, [k]: e.target.value }));

  if (lines.length === 0) return <div className="py-20 text-center"><p className="text-muted">Your cart is empty.</p><Link href="/shop" className="btn btn-primary mt-5">Shop now</Link></div>;
  if (!pricing) return <div className="grid gap-8 lg:grid-cols-[1fr_380px]"><div className="skeleton h-96" /><div className="skeleton h-72" /></div>;

  async function pay(e: React.FormEvent) {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      const r = await fetch('/api/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines, discountCode: initialCode, shippingMethodId: pricing!.shippingMethodId, provider, address: addr, saveAddress: save }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.url) throw new Error(j.error || 'Could not start payment.');
      window.location.assign(j.url);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not start payment.'); setBusy(false); }
  }

  return (
    <form onSubmit={pay} className="grid gap-8 lg:grid-cols-[1fr_380px] lg:gap-12">
      <div className="space-y-8">
        {addresses.length > 0 && (
          <div>
            <h2 className="text-[18px]">Saved addresses</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {addresses.map((a) => <button key={a.id} type="button" onClick={() => setAddr({ full_name: a.full_name, phone: a.phone ?? '', line1: a.line1, line2: a.line2 ?? '', city: a.city, state: a.state ?? '', postal_code: a.postal_code ?? '', country: a.country })} className="rounded-full border border-line px-4 py-2 text-[13px] hover:border-navy">{a.label || a.line1}</button>)}
            </div>
          </div>
        )}
        <fieldset>
          <legend className="text-[18px] font-serif font-bold">Delivery address</legend>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div><label className="label" htmlFor="a1">Full name</label><input id="a1" required className="input" value={addr.full_name} onChange={set('full_name')} autoComplete="name" /></div>
            <div><label className="label" htmlFor="a2">Phone</label><input id="a2" required className="input" value={addr.phone} onChange={set('phone')} autoComplete="tel" /></div>
            <div className="md:col-span-2"><label className="label" htmlFor="a3">Address</label><input id="a3" required className="input" value={addr.line1} onChange={set('line1')} autoComplete="address-line1" /></div>
            <div className="md:col-span-2"><label className="label" htmlFor="a4">Apartment, suite (optional)</label><input id="a4" className="input" value={addr.line2} onChange={set('line2')} autoComplete="address-line2" /></div>
            <div><label className="label" htmlFor="a5">City</label><input id="a5" required className="input" value={addr.city} onChange={set('city')} autoComplete="address-level2" /></div>
            <div><label className="label" htmlFor="a6">State / Region</label><input id="a6" className="input" value={addr.state} onChange={set('state')} autoComplete="address-level1" /></div>
            <div><label className="label" htmlFor="a7">Postal code</label><input id="a7" className="input" value={addr.postal_code} onChange={set('postal_code')} autoComplete="postal-code" /></div>
            <div><label className="label" htmlFor="a8">Country (2-letter code)</label><input id="a8" required maxLength={2} className="input uppercase" value={addr.country} onChange={set('country')} autoComplete="country" /></div>
          </div>
          <label className="mt-4 flex items-center gap-2 text-[13px] text-muted"><input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} />Save this address to my account</label>
        </fieldset>
        <fieldset>
          <legend className="text-[18px] font-serif font-bold">Shipping method</legend>
          <div className="mt-4 space-y-2">
            {pricing.shippingMethods.map((m) => (
              <label key={m.id} className="flex cursor-pointer items-center justify-between rounded-xl border border-line p-4 has-[:checked]:border-navy has-[:checked]:bg-tint-soft">
                <span className="flex items-center gap-3"><input type="radio" name="ship" checked={pricing.shippingMethodId === m.id} onChange={() => setMethodId(m.id)} /><span><span className="block text-[14px] font-medium">{m.name}</span><span className="block text-[12px] text-muted">{m.estimated_days_min}–{m.estimated_days_max} business days</span></span></span>
                <span className="text-[13px] font-medium">{m.free_over_cents != null && pricing.subtotalCents - pricing.discountCents >= m.free_over_cents ? 'Free' : (m.price_cents / 100).toLocaleString('en-US', { style: 'currency', currency: pricing.currency })}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-[18px] font-serif font-bold">Payment</legend>
          {providers.length === 0 ? <p className="mt-3 rounded-xl bg-amber-50 p-4 text-[13px] text-amber-800">Online payment is not enabled yet. Please contact us to complete your order.</p> : (
            <div className="mt-4 space-y-2">
              {providers.map((p) => <label key={p.provider} className="flex cursor-pointer items-center gap-3 rounded-xl border border-line p-4 has-[:checked]:border-navy has-[:checked]:bg-tint-soft"><input type="radio" name="prov" checked={provider === p.provider} onChange={() => setProvider(p.provider)} /><span className="text-[14px] font-medium">{p.display_name}</span><span className="text-[12px] text-muted">Cards, bank transfer & more</span></label>)}
            </div>
          )}
        </fieldset>
      </div>
      <OrderSummary pricing={pricing}>
        {pricing.issues.length > 0 && <ul className="mt-4 space-y-1 text-[12px] text-amber-800">{pricing.issues.map((i) => <li key={i}>{i}</li>)}</ul>}
        <p role="alert" className="mt-4 text-[13px] text-red-600">{error}</p>
        <button disabled={busy || providers.length === 0 || pricing.lines.length === 0} className="btn btn-primary mt-3 h-12 w-full font-bold"><Lock className="h-4 w-4" />{busy ? 'Redirecting…' : 'Pay securely'}</button>
        <p className="mt-3 text-center text-[11px] text-muted">You will complete payment on our payment partner&apos;s secure page. We never see or store your card details.</p>
      </OrderSummary>
    </form>
  );
}
