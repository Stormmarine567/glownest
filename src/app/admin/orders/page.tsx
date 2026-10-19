import Link from 'next/link';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ORDER_STATUSES } from '@/lib/types';
import { formatDate, formatMoney } from '@/lib/utils';

export const metadata = { title: 'Orders' };
export const dynamic = 'force-dynamic';

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  await requireAdmin('orders');
  const { status, q, page } = await searchParams;
  const pg = Math.max(1, parseInt(page ?? '1', 10) || 1); const size = 25;
  let query = (await createClient()).from('orders').select('id,order_number,email,status,payment_status,total_cents,currency,created_at', { count: 'exact' }).order('created_at', { ascending: false }).range((pg - 1) * size, pg * size - 1);
  if (status && (ORDER_STATUSES as readonly string[]).includes(status)) query = query.eq('status', status);
  if (q) { const t = q.replace(/[%,()]/g, ''); query = query.or(`order_number.ilike.%${t}%,email.ilike.%${t}%`); }
  const { data, count } = await query;
  const pages = Math.max(1, Math.ceil((count ?? 0) / size));
  const href = (p: number) => `/admin/orders?${new URLSearchParams({ ...(status ? { status } : {}), ...(q ? { q } : {}), page: String(p) })}`;
  return (
    <div>
      <h2 className="mb-5 text-[26px]">Orders</h2>
      <form className="mb-4 flex flex-wrap gap-2"><input name="q" defaultValue={q} placeholder="Order number or email" aria-label="Search orders" className="input h-10 w-56" />
        <select name="status" defaultValue={status ?? ''} aria-label="Status" className="input h-10 w-40"><option value="">All statuses</option>{ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select>
        <button className="btn btn-outline h-10 px-4 text-[13px]">Filter</button></form>
      <div className="overflow-x-auto rounded-2xl bg-white shadow-soft">
        <table className="w-full min-w-[720px] text-left text-[13px]">
          <thead className="border-b border-line text-[11px] uppercase tracking-wider text-muted"><tr><th className="p-4">Order</th><th>Customer</th><th>Date</th><th>Status</th><th>Payment</th><th className="pr-4 text-right">Total</th></tr></thead>
          <tbody className="divide-y divide-line">
            {(data ?? []).map((o) => <tr key={o.id} className="hover:bg-tint-soft"><td className="p-4 font-bold"><Link href={`/admin/orders/${o.id}`} className="underline-offset-2 hover:underline">{o.order_number}</Link></td><td>{o.email}</td><td>{formatDate(o.created_at)}</td><td><StatusBadge value={o.status} /></td><td><StatusBadge value={o.payment_status} /></td><td className="pr-4 text-right">{formatMoney(o.total_cents, o.currency)}</td></tr>)}
            {(data ?? []).length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted">No orders found.</td></tr>}
          </tbody>
        </table>
      </div>
      {pages > 1 && <div className="mt-4 flex items-center justify-between text-[13px]"><span className="text-muted">Page {pg} of {pages}</span><span className="flex gap-3">{pg > 1 && <Link href={href(pg - 1)} className="underline">Previous</Link>}{pg < pages && <Link href={href(pg + 1)} className="underline">Next</Link>}</span></div>}
    </div>
  );
}
