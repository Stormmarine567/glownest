import Link from 'next/link';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatDate, formatMoney } from '@/lib/utils';

export const metadata = { title: 'My Orders' };

export default async function OrdersPage() {
  const { userId } = await requireUser('/dashboard/orders');
  const sb = await createClient();
  const { data: orders } = await sb.from('orders').select('id,order_number,status,payment_status,total_cents,currency,created_at,order_items(name,quantity)').eq('user_id', userId).order('created_at', { ascending: false });
  return (
    <div className="rounded-2xl bg-white p-5 shadow-soft md:p-6">
      <h2 className="text-[22px]">My Orders</h2>
      {(orders ?? []).length === 0 ? <p className="mt-4 text-[14px] text-muted">You have not placed any orders yet.</p> : (
        <ul className="mt-4 divide-y divide-line">
          {orders!.map((o) => (
            <li key={o.id}>
              <Link href={`/dashboard/orders/${o.id}`} className="flex flex-col gap-2 py-4 transition hover:bg-tint-soft md:flex-row md:items-center md:justify-between">
                <span>
                  <span className="block text-[15px] font-bold">{o.order_number}</span>
                  <span className="block text-[12px] text-muted">{formatDate(o.created_at)} · {(o.order_items ?? []).reduce((n: number, i: { quantity: number }) => n + i.quantity, 0)} items</span>
                </span>
                <span className="flex flex-wrap items-center gap-2"><StatusBadge value={o.status} /><StatusBadge value={o.payment_status} /><span className="ml-2 text-[14px] font-bold">{formatMoney(o.total_cents, o.currency)}</span></span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
