import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Check, FileText } from 'lucide-react';
import { ActionForm } from '@/components/dashboard/ActionForm';
import { PayNow } from '@/components/dashboard/PayNow';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatDate, formatMoney } from '@/lib/utils';
import { requestOrderAction } from '../../actions';

/* eslint-disable @next/next/no-img-element */
const FLOW = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await requireUser(`/dashboard/orders/${id}`);
  const sb = await createClient();
  const { data: o } = await sb.from('orders').select('*, order_items(*), payments(provider,status,created_at,failure_reason), order_requests(id,kind,status,reason,admin_note,created_at)').eq('id', id).eq('user_id', userId).maybeSingle();
  if (!o) notFound();
  const { data: providers } = await sb.from('payment_gateways').select('provider,display_name').eq('is_enabled', true);

  const m = (c: number) => formatMoney(c, o.currency);
  const idx = FLOW.indexOf(o.status);
  const closed = ['cancelled', 'refunded'].includes(o.status);
  const addr = o.shipping_address as Record<string, string>;
  const open = (k: string) => (o.order_requests ?? []).some((r: { kind: string; status: string }) => r.kind === k && r.status === 'requested');
  const canCancel = ['pending', 'confirmed', 'processing'].includes(o.status) && !open('cancellation');
  const canReturn = o.status === 'delivered' && o.delivered_at && Date.now() - new Date(o.delivered_at).getTime() <= 30 * 86400_000 && !open('return');
  const canRefund = o.payment_status === 'paid' && ['cancelled', 'delivered'].includes(o.status) && !open('refund');
  const canPay = o.payment_status !== 'paid' && o.status !== 'cancelled';

  return (
    <div className="space-y-6">
      <Link href="/dashboard/orders" className="text-[13px] text-muted hover:text-ink">← All orders</Link>
      <div className="rounded-2xl bg-white p-5 shadow-soft md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-[24px]">{o.order_number}</h2><p className="text-[13px] text-muted">Placed {formatDate(o.created_at, { dateStyle: 'long' })}</p></div>
          <div className="flex flex-wrap items-center gap-2"><StatusBadge value={o.status} /><StatusBadge value={o.payment_status} />
            <Link href={`/dashboard/orders/${o.id}/invoice`} className="btn btn-outline h-9 px-4 text-[13px]"><FileText className="h-3.5 w-3.5" />{o.payment_status === 'paid' ? 'Receipt' : 'Invoice'}</Link></div>
        </div>
        {!closed && (
          <ol className="mt-6 grid grid-cols-5 gap-1" aria-label="Order progress">
            {FLOW.map((s, i) => (
              <li key={s} className="text-center">
                <span className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold ${i <= idx ? 'bg-navy text-white' : 'bg-tint text-muted'}`}>{i < idx ? <Check className="h-4 w-4" /> : i + 1}</span>
                <span className={`mt-1 block text-[11px] capitalize ${i <= idx ? 'font-bold text-ink' : 'text-muted'}`}>{s}</span>
              </li>
            ))}
          </ol>
        )}
        {o.tracking_number && (
          <p className="mt-5 rounded-xl bg-tint p-4 text-[13px]">Tracking: <span className="font-bold">{o.carrier ? `${o.carrier} · ` : ''}{o.tracking_number}</span>{o.tracking_url && <> · <a href={o.tracking_url} target="_blank" rel="noopener noreferrer" className="font-bold underline">Track parcel</a></>}</p>
        )}
        {canPay && <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="mb-3 text-[13px] text-amber-900">This order has not been paid yet.</p><PayNow orderId={o.id} providers={providers ?? []} /></div>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl bg-white p-5 shadow-soft md:p-6">
          <h3 className="text-[18px]">Items</h3>
          <ul className="mt-3 divide-y divide-line">
            {o.order_items.map((i: { id: string; name: string; variant_name: string | null; image_url: string | null; quantity: number; unit_price_cents: number; line_total_cents: number }) => (
              <li key={i.id} className="flex items-center gap-4 py-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-tint">{i.image_url && <img src={i.image_url} alt="" className="h-full w-full object-cover" />}</div>
                <div className="min-w-0 flex-1"><p className="text-[14px] font-medium">{i.name}</p><p className="text-[12px] text-muted">{i.variant_name ? `${i.variant_name} · ` : ''}{i.quantity} × {m(i.unit_price_cents)}</p></div>
                <p className="text-[14px] font-bold">{m(i.line_total_cents)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-line pt-4 text-[14px]">
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{m(o.subtotal_cents)}</dd></div>
            {o.discount_cents > 0 && <div className="flex justify-between text-green-700"><dt>Discount</dt><dd>−{m(o.discount_cents)}</dd></div>}
            <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd>{o.shipping_cents ? m(o.shipping_cents) : 'Free'}</dd></div>
            {o.tax_cents > 0 && <div className="flex justify-between"><dt className="text-muted">Tax</dt><dd>{m(o.tax_cents)}</dd></div>}
            <div className="flex justify-between text-[16px] font-bold"><dt>Total</dt><dd>{m(o.total_cents)}</dd></div>
          </dl>
        </div>
        <div className="space-y-6">
          <div className="rounded-2xl bg-white p-5 shadow-soft">
            <h3 className="text-[16px]">Shipping to</h3>
            <address className="mt-2 text-[13px] not-italic leading-6 text-muted">{addr.full_name}<br />{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}<br />{addr.city}{addr.state ? `, ${addr.state}` : ''} {addr.postal_code}<br />{addr.country}<br />{addr.phone}</address>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-soft">
            <h3 className="text-[16px]">Payment</h3>
            <ul className="mt-2 space-y-1 text-[13px] text-muted">{(o.payments ?? []).map((p: { provider: string; status: string; created_at: string }, i: number) => <li key={i} className="flex justify-between"><span className="capitalize">{p.provider} · {formatDate(p.created_at)}</span><StatusBadge value={p.status} /></li>)}{(o.payments ?? []).length === 0 && <li>No payment attempts yet.</li>}</ul>
          </div>
        </div>
      </div>

      {(o.order_requests ?? []).length > 0 && (
        <div className="rounded-2xl bg-white p-5 shadow-soft md:p-6">
          <h3 className="text-[18px]">Your requests</h3>
          <ul className="mt-3 divide-y divide-line">
            {o.order_requests.map((r: { id: string; kind: string; status: string; reason: string; admin_note: string | null; created_at: string }) => (
              <li key={r.id} className="py-3"><div className="flex items-center justify-between"><span className="text-[14px] font-medium capitalize">{r.kind} · {formatDate(r.created_at)}</span><StatusBadge value={r.status} /></div><p className="mt-1 text-[13px] text-muted">{r.reason}</p>{r.admin_note && <p className="mt-1 text-[13px]"><span className="font-bold">Reply:</span> {r.admin_note}</p>}</li>
            ))}
          </ul>
        </div>
      )}

      {(canCancel || canReturn || canRefund) && (
        <div className="grid gap-6 md:grid-cols-2">
          {[canCancel && ['cancellation', 'Request cancellation', o.payment_status === 'paid' ? 'Paid orders are reviewed by our team before they are cancelled and refunded.' : 'This order is unpaid, so it will be cancelled immediately.'],
            canReturn && ['return', 'Request a return', 'Returns are accepted within 30 days of delivery.'],
            canRefund && ['refund', 'Request a refund', 'Tell us why you would like your money back.']].filter(Boolean).map((x) => {
            const [kind, title, note] = x as string[];
            return (
              <ActionForm key={kind} action={requestOrderAction} submit={title} className="rounded-2xl bg-white p-5 shadow-soft" confirm={kind === 'cancellation' ? 'Cancel this order?' : undefined}>
                <h3 className="text-[16px]">{title}</h3><p className="mt-1 text-[12px] text-muted">{note}</p>
                <input type="hidden" name="orderId" value={o.id} /><input type="hidden" name="kind" value={kind} />
                <label className="label mt-4" htmlFor={`r-${kind}`}>Reason</label>
                <textarea id={`r-${kind}`} name="reason" required minLength={5} maxLength={1000} className="textarea min-h-[90px]" />
              </ActionForm>
            );
          })}
        </div>
      )}
    </div>
  );
}
