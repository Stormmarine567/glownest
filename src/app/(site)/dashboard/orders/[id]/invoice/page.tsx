import { notFound } from 'next/navigation';
import { PrintButton } from '@/components/dashboard/PrintButton';
import { requireUser } from '@/lib/auth';
import { getSite } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';
import { formatDate, formatMoney } from '@/lib/utils';

export const metadata = { title: 'Invoice', robots: { index: false } };

export default async function Invoice({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await requireUser(`/dashboard/orders/${id}/invoice`);
  const sb = await createClient();
  const { data: o } = await sb.from('orders').select('*, order_items(*)').eq('id', id).eq('user_id', userId).maybeSingle();
  if (!o) notFound();
  const { business } = await getSite();
  const m = (c: number) => formatMoney(c, o.currency);
  const a = o.shipping_address as Record<string, string>;
  return (
    <div className="mx-auto max-w-[800px] rounded-2xl bg-white p-8 shadow-soft print:rounded-none print:p-0 print:shadow-none">
      <div className="flex justify-between"><div><p className="font-serif text-[26px] font-bold">{business.name}</p><p className="text-[12px] text-muted">{(business.address_lines as string[]).join(', ')}<br />{business.email}</p></div>
        <div className="text-right"><p className="text-[22px] font-bold">{o.payment_status === 'paid' ? 'RECEIPT' : 'INVOICE'}</p><p className="text-[13px] text-muted">{o.order_number}<br />{formatDate(o.created_at, { dateStyle: 'long' })}</p></div></div>
      <div className="mt-8 grid grid-cols-2 gap-6 text-[13px]"><div><p className="font-bold">Billed to</p><p className="text-muted">{a.full_name}<br />{o.email}</p></div><div><p className="font-bold">Ship to</p><p className="text-muted">{a.line1}{a.line2 ? `, ${a.line2}` : ''}<br />{a.city} {a.postal_code}, {a.country}</p></div></div>
      <table className="mt-8 block w-full overflow-x-auto text-[13px] sm:table"><thead><tr className="border-b border-line text-left text-muted"><th className="py-2">Item</th><th className="text-right">Qty</th><th className="text-right">Price</th><th className="text-right">Total</th></tr></thead>
        <tbody>{o.order_items.map((i: { id: string; name: string; variant_name: string | null; quantity: number; unit_price_cents: number; line_total_cents: number }) => <tr key={i.id} className="border-b border-line"><td className="py-2">{i.name}{i.variant_name ? ` (${i.variant_name})` : ''}</td><td className="text-right">{i.quantity}</td><td className="text-right">{m(i.unit_price_cents)}</td><td className="text-right">{m(i.line_total_cents)}</td></tr>)}</tbody></table>
      <dl className="ml-auto mt-4 w-64 space-y-1 text-[13px]"><div className="flex justify-between"><dt>Subtotal</dt><dd>{m(o.subtotal_cents)}</dd></div>{o.discount_cents > 0 && <div className="flex justify-between"><dt>Discount</dt><dd>−{m(o.discount_cents)}</dd></div>}<div className="flex justify-between"><dt>Shipping</dt><dd>{m(o.shipping_cents)}</dd></div>{o.tax_cents > 0 && <div className="flex justify-between"><dt>Tax</dt><dd>{m(o.tax_cents)}</dd></div>}<div className="flex justify-between border-t border-line pt-2 text-[15px] font-bold"><dt>Total</dt><dd>{m(o.total_cents)}</dd></div></dl>
      <p className="mt-8 text-[12px] text-muted">Payment status: <span className="font-bold capitalize">{o.payment_status}</span>{o.paid_at ? ` · paid ${formatDate(o.paid_at, { dateStyle: 'long' })}` : ''}</p>
      <div className="mt-6"><PrintButton /></div>
    </div>
  );
}
