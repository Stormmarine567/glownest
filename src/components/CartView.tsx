'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useCart } from './CartProvider';
import { formatMoney } from '@/lib/utils';
import type { Pricing } from '@/lib/pricing';

/* eslint-disable @next/next/no-img-element */
export function useCartPricing(discountCode: string | null, shippingMethodId?: string | null) {
  const { lines } = useCart();
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (lines.length === 0) { setPricing(null); setLoading(false); return; }
    setLoading(true);
    const t = setTimeout(() => {
      fetch('/api/cart/price', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lines, discountCode, shippingMethodId }) })
        .then((r) => (r.ok ? r.json() : null)).then(setPricing).catch(() => setPricing(null)).finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [lines, discountCode, shippingMethodId]);
  return { pricing, loading };
}

export function OrderSummary({ pricing, children }: { pricing: Pricing; children?: React.ReactNode }) {
  const m = (c: number) => formatMoney(c, pricing.currency);
  return (
    <aside className="h-fit rounded-[20px] bg-tint-soft p-6" aria-label="Order summary">
      <h2 className="text-[20px]">Order summary</h2>
      <dl className="mt-5 space-y-3 text-[14px]">
        <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{m(pricing.subtotalCents)}</dd></div>
        {pricing.discountCents > 0 && <div className="flex justify-between text-green-700"><dt>Discount ({pricing.discountCode})</dt><dd>−{m(pricing.discountCents)}</dd></div>}
        <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd>{pricing.shippingCents === 0 ? 'Free' : m(pricing.shippingCents)}</dd></div>
        {pricing.taxCents > 0 && <div className="flex justify-between"><dt className="text-muted">Tax</dt><dd>{m(pricing.taxCents)}</dd></div>}
        <div className="flex justify-between border-t border-line pt-4 text-[16px] font-bold"><dt>Total</dt><dd>{m(pricing.totalCents)}</dd></div>
      </dl>
      {pricing.freeShippingRemainingCents != null && <p className="mt-4 rounded-lg bg-tint p-3 text-[12px] text-ink">Add {m(pricing.freeShippingRemainingCents)} more for free shipping.</p>}
      {children}
    </aside>
  );
}

export function CartView() {
  const { lines, setQuantity, remove } = useCart();
  const [codeInput, setCodeInput] = useState('');
  const [code, setCode] = useState<string | null>(null);
  const { pricing, loading } = useCartPricing(code);

  if (lines.length === 0) {
    return (
      <div className="py-24 text-center">
        <p className="text-[16px] text-muted">Your cart is empty.</p>
        <Link href="/shop" className="btn btn-primary mt-6">Start shopping</Link>
      </div>
    );
  }
  if (!pricing) return <div className="grid gap-8 lg:grid-cols-[1fr_380px]"><div className="skeleton h-64" /><div className="skeleton h-64" /></div>;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:gap-12">
      <div>
        {pricing.issues.length > 0 && <ul className="mb-4 space-y-1 rounded-xl bg-amber-50 p-4 text-[13px] text-amber-800" role="status">{pricing.issues.map((i) => <li key={i}>{i}</li>)}</ul>}
        <ul className="divide-y divide-line rounded-[20px] border border-line">
          {pricing.lines.map((l) => (
            <li key={`${l.productId}-${l.variantId}`} className={`flex gap-4 p-4 md:p-5 ${loading ? 'opacity-60' : ''}`}>
              <Link href={`/product/${l.slug}`} className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-tint md:h-24 md:w-24"><img src={l.imageUrl ?? ''} alt="" className="h-full w-full object-cover" /></Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex justify-between gap-3">
                  <div><Link href={`/product/${l.slug}`} className="font-serif text-[15px] font-bold">{l.name}</Link>{l.variantName && <p className="text-[12px] text-muted">{l.variantName}</p>}</div>
                  <p className="text-[14px] font-bold">{formatMoney(l.lineCents, pricing.currency)}</p>
                </div>
                <p className="text-[12px] text-muted">{formatMoney(l.unitCents, pricing.currency)} each</p>
                <div className="mt-auto flex items-center justify-between pt-3">
                  <div className="flex items-center rounded-full border border-line">
                    <button type="button" aria-label="Decrease quantity" className="flex h-8 w-8 items-center justify-center" onClick={() => setQuantity(l.productId, l.quantity - 1, l.variantId)}><Minus className="h-3.5 w-3.5" /></button>
                    <span className="w-7 text-center text-[13px] font-medium" aria-live="polite">{l.quantity}</span>
                    <button type="button" aria-label="Increase quantity" disabled={l.quantity >= l.maxQty} className="flex h-8 w-8 items-center justify-center disabled:opacity-30" onClick={() => setQuantity(l.productId, l.quantity + 1, l.variantId)}><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                  <button type="button" onClick={() => remove(l.productId, l.variantId)} className="flex items-center gap-1 text-[12px] text-muted transition hover:text-red-600"><Trash2 className="h-3.5 w-3.5" />Remove</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <OrderSummary pricing={pricing}>
        <form className="mt-5" onSubmit={(e) => { e.preventDefault(); setCode(codeInput.trim() || null); }}>
          <label htmlFor="dc" className="label">Discount code</label>
          <div className="flex gap-2">
            <input id="dc" className="input h-11" value={codeInput} onChange={(e) => setCodeInput(e.target.value)} placeholder="Enter code" maxLength={40} />
            <button className="btn btn-outline h-11 px-4">Apply</button>
          </div>
          {pricing.discountError && <p role="alert" className="mt-2 text-[12px] text-red-600">{pricing.discountError}</p>}
          {pricing.discountCode && <p className="mt-2 text-[12px] text-green-700">Code {pricing.discountCode} applied.</p>}
        </form>
        <Link href={`/checkout${code ? `?code=${encodeURIComponent(code)}` : ''}`} className="btn btn-primary mt-5 h-12 w-full font-bold">Proceed to checkout</Link>
        <Link href="/shop" className="mt-3 block text-center text-[13px] text-muted hover:text-ink">Continue shopping</Link>
      </OrderSummary>
    </div>
  );
}
