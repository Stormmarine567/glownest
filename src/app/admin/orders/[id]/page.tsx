import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActionForm } from '@/components/dashboard/ActionForm';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ORDER_STATUSES } from '@/lib/types';
import { formatDate, formatMoney } from '@/lib/utils';
import { handleRequestAction, refundOrderAction, updateOrderAction } from '../actions';

export const metadata = { title: 'Order' };
export const dynamic = 'force-dynamic';

export default async function AdminOrder({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin('orders');
  const { id } = await params;
  const { data: o } = await (await createClient()).from('orders').select('*, order_items(*), payments(*), order_requests(*)').eq('id', id).maybeSingle();
  if (!o) notFound();
  const m = (c: number) => formatMoney(c, o.currency);
  const a = (o.shipping_address ?? {}) as Record<string, string>;
  const paid = (o.payments ?? []).find((p: { status: string }) => p.status === 'paid' || p.status === 'partially_refunded');
  const remaining = paid ? paid.amount_cents - paid.refunded_cents : 0;
  const box = 'rounded-2xl bg-white p-5 shadow-soft md:p-6';
  return (
    <div className="space-y-6">
      <Link href="/admin/orders" className="text-[13px] text-muted hover:text-ink">← All orders</Link>
      <div className={box}>
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-[24px]">{o.order_number}</h2><p className="text-[13px] text-muted">{formatDate(o.created_at, { dateStyle: 'long', timeStyle: 'short' })} · {o.email}</p></div><div className="flex gap-2"><StatusBadge value={o.status} /><StatusBadge value={o.payment_status} /></div></div>
        <div className="mt-5 grid gap-6 md:grid-cols-2 text-[13px]">
          <div><h3 className="mb-1 text-[12px] font-bold uppercase tracking-wider text-muted">Ship to</h3><p className="leading-6">{a.full_name}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ''}<br />{a.city}{a.state ? `, ${a.state}` : ''} {a.postal_code}<br />{a.country}{a.phone ? <><br />{a.phone}</> : null}</p></div>
          <div><h3 className="mb-1 text-[12px] font-bold uppercase tracking-wider text-muted">Payment</h3>{(o.payments ?? []).length === 0 ? <p className="text-muted">No payment attempts yet.</p> : <ul className="space-y-1">{(o.payments as { id: string; provider: string; status: string; reference: string; created_at: string; failure_reason: string | null; refunded_cents: number }[]).map((p) => <li key={p.id}><b className="capitalize">{p.provider}</b> · <StatusBadge value={p.status} /> <span className="text-muted">{p.reference}</span>{p.failure_reason && <span className="block text-red-600">{p.failure_reason}</span>}{p.refunded_cents > 0 && <span className="block text-purple-700">Refunded {m(p.refunded_cents)}</span>}</li>)}</ul>}</div>
        </div>
        <table className="mt-6 w-full text-[13px]"><tbody className="divide-y divide-line">
          {(o.order_items ?? []).map((i: { id: string; name: string; variant_name: string | null; quantity: number; unit_price_cents: number; line_total_cents: number }) => <tr key={i.id}><td className="py-2">{i.name}{i.variant_name ? ` · ${i.variant_name}` : ''} <span className="text-muted">× {i.quantity}</span></td><td className="py-2 text-right">{m(i.line_total_cents)}</td></tr>)}
          <tr><td className="py-2 text-muted">Subtotal</td><td className="py-2 text-right">{m(o.subtotal_cents)}</td></tr>
          {o.discount_cents > 0 && <tr><td className="py-2 text-muted">Discount {o.discount_code && `(${o.discount_code})`}</td><td className="py-2 text-right">−{m(o.discount_cents)}</td></tr>}
          <tr><td className="py-2 text-muted">Shipping</td><td className="py-2 text-right">{m(o.shipping_cents)}</td></tr>
          {o.tax_cents > 0 && <tr><td className="py-2 text-muted">Tax</td><td className="py-2 text-right">{m(o.tax_cents)}</td></tr>}
          <tr className="font-bold"><td className="py-2">Total</td><td className="py-2 text-right">{m(o.total_cents)}</td></tr>
        </tbody></table>
      </div>

      <ActionForm action={updateOrderAction} submit="Save changes" className={box}>
        <h3 className="text-[18px]">Fulfilment</h3><input type="hidden" name="id" value={o.id} />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div><label className="label" htmlFor="status">Order status</label><select id="status" name="status" defaultValue={o.status} className="input">{ORDER_STATUSES.filter((s) => s !== 'refunded' || o.status === 'refunded').map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
          <div><label className="label" htmlFor="carrier">Carrier</label><input id="carrier" name="carrier" defaultValue={o.carrier ?? ''} className="input" /></div>
          <div><label className="label" htmlFor="tracking_number">Tracking number</label><input id="tracking_number" name="tracking_number" defaultValue={o.tracking_number ?? ''} className="input" /></div>
          <div><label className="label" htmlFor="tracking_url">Tracking link</label><input id="tracking_url" name="tracking_url" type="url" defaultValue={o.tracking_url ?? ''} className="input" /></div>
          <div className="md:col-span-2"><label className="label" htmlFor="notes">Internal notes</label><textarea id="notes" name="notes" defaultValue={o.notes ?? ''} className="textarea" /></div>
        </div>
        <p className="mt-3 text-[12px] text-muted">The customer is notified automatically when the status changes. Payment status is only ever changed by verified payment events, never by hand.</p>
      </ActionForm>

      {(o.order_requests ?? []).length > 0 && (
        <section className={box}><h3 className="text-[18px]">Customer requests</h3>
          <ul className="mt-4 space-y-4">{(o.order_requests as { id: string; kind: string; status: string; reason: string; admin_note: string | null; created_at: string }[]).map((r) => (
            <li key={r.id} className="rounded-xl border border-line p-4 text-[13px]"><div className="flex items-center justify-between"><b className="capitalize">{r.kind} request</b><StatusBadge value={r.status} /></div><p className="mt-1 text-muted">{formatDate(r.created_at)} — “{r.reason}”</p>
              {r.status === 'requested' ? (
                <div className="mt-3 flex flex-wrap gap-3"><ActionForm action={handleRequestAction} submit="Approve" small><input type="hidden" name="id" value={r.id} /><input type="hidden" name="decision" value="approved" /><input name="admin_note" placeholder="Note to customer (optional)" aria-label="Note" className="input mt-2 h-9 w-64 text-[12px]" /></ActionForm>
                  <ActionForm action={handleRequestAction} submit="Reject" danger small><input type="hidden" name="id" value={r.id} /><input type="hidden" name="decision" value="rejected" /><input name="admin_note" placeholder="Reason (optional)" aria-label="Reason" className="input mt-2 h-9 w-64 text-[12px]" /></ActionForm></div>
              ) : r.admin_note ? <p className="mt-2">Note: {r.admin_note}</p> : null}</li>))}</ul></section>
      )}

      {paid && remaining > 0 && (
        <ActionForm action={refundOrderAction} submit="Issue refund" danger confirm="This sends a refund to the customer through the payment provider. Continue?" className={box}>
          <h3 className="text-[18px]">Refund</h3><input type="hidden" name="id" value={o.id} />
          <p className="mt-1 text-[13px] text-muted">Up to {m(remaining)} can be refunded via {paid.provider}. Leave the amount empty to refund everything that remains.</p>
          <div className="mt-3 max-w-[200px]"><label className="label" htmlFor="amount">Amount</label><input id="amount" name="amount" inputMode="decimal" placeholder={(remaining / 100).toFixed(2)} className="input" /></div>
        </ActionForm>
      )}
    </div>
  );
}
