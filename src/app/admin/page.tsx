import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { can, requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatDate, formatMoney } from '@/lib/utils';

export const metadata = { title: 'Overview' };
export const dynamic = 'force-dynamic';

export default async function AdminOverview({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const { profile } = await requireAdmin();
  const { denied } = await searchParams;
  const sb = await createClient();
  const since = new Date(Date.now() - 29 * 864e5); since.setHours(0, 0, 0, 0);
  const canOrders = can(profile, 'orders'), canProducts = can(profile, 'products'), canCustomers = can(profile, 'customers'), canReviews = can(profile, 'reviews'), canNews = can(profile, 'newsletter');

  const [paidOrders, recentOrders, lowStock, recentCustomers, recentReviews, subs, newCustomers, orderCount] = await Promise.all([
    canOrders ? sb.from('orders').select('total_cents,currency,created_at').eq('payment_status', 'paid').gte('created_at', since.toISOString()) : null,
    canOrders ? sb.from('orders').select('id,order_number,email,status,payment_status,total_cents,currency,created_at').order('created_at', { ascending: false }).limit(6) : null,
    canProducts ? sb.from('products').select('id,name,stock_quantity,low_stock_threshold').eq('is_active', true).eq('track_inventory', true).order('stock_quantity').limit(40) : null,
    canCustomers ? sb.from('profiles').select('id,email,full_name,created_at').eq('role', 'customer').order('created_at', { ascending: false }).limit(5) : null,
    canReviews ? sb.from('reviews').select('id,display_name,rating,body,status,created_at,products(name)').order('created_at', { ascending: false }).limit(5) : null,
    canNews ? sb.from('newsletter_subscribers').select('status') : null,
    canCustomers ? sb.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'customer') : null,
    canOrders ? sb.from('orders').select('id', { count: 'exact', head: true }) : null,
  ]);

  const paid = paidOrders?.data ?? [];
  const revenue = paid.reduce((s, o) => s + o.total_cents, 0);
  const cur = paid[0]?.currency ?? 'USD';
  const days = Array.from({ length: 30 }, (_, i) => { const d = new Date(since.getTime() + i * 864e5); return d.toISOString().slice(0, 10); });
  const byDay = new Map(days.map((d) => [d, 0]));
  for (const o of paid) { const k = o.created_at.slice(0, 10); if (byDay.has(k)) byDay.set(k, (byDay.get(k) ?? 0) + o.total_cents); }
  const series = days.map((d) => byDay.get(d) ?? 0);
  const max = Math.max(1, ...series);
  const low = (lowStock?.data ?? []).filter((p) => p.stock_quantity <= p.low_stock_threshold);
  const subCount = (subs?.data ?? []).filter((s) => s.status === 'subscribed').length;

  const stat = (label: string, value: string, href?: string) => (
    <Link href={href ?? '#'} className="rounded-2xl bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-card"><p className="text-[12px] uppercase tracking-wider text-muted">{label}</p><p className="mt-2 font-serif text-[28px] font-bold">{value}</p></Link>
  );

  return (
    <div className="space-y-6">
      {denied && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-[13px] text-amber-800">You do not have permission to open that section.</p>}
      <div><h2 className="text-[26px]">Welcome back{profile.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}</h2><p className="text-[13px] text-muted">Here is what is happening in the last 30 days.</p></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {canOrders && stat('Revenue (30 days)', formatMoney(revenue, cur), '/admin/orders')}
        {canOrders && stat('Total orders', String(orderCount?.count ?? 0), '/admin/orders')}
        {canCustomers && stat('Customers', String(newCustomers?.count ?? 0), '/admin/customers')}
        {canNews && stat('Subscribers', String(subCount), '/admin/newsletter')}
      </div>

      {canOrders && (
        <section className="rounded-2xl bg-white p-5 shadow-soft md:p-6" aria-label="Sales chart">
          <h3 className="text-[18px]">Daily sales</h3>
          <div className="mt-5 flex h-40 items-end gap-1" role="img" aria-label={`Daily paid sales over the last 30 days, total ${formatMoney(revenue, cur)}`}>
            {series.map((v, i) => <div key={days[i]} title={`${days[i]}: ${formatMoney(v, cur)}`} className="flex-1 rounded-t bg-navy/80 transition hover:bg-navy" style={{ height: `${Math.max(2, (v / max) * 100)}%`, opacity: v ? 1 : 0.15 }} />)}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-muted"><span>{formatDate(days[0])}</span><span>{formatDate(days[29])}</span></div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {recentOrders && (
          <section className="rounded-2xl bg-white p-5 shadow-soft"><div className="flex items-center justify-between"><h3 className="text-[18px]">Recent orders</h3><Link href="/admin/orders" className="text-[12px] font-bold underline">All</Link></div>
            <ul className="mt-3 divide-y divide-line">{(recentOrders.data ?? []).map((o) => <li key={o.id}><Link href={`/admin/orders/${o.id}`} className="flex items-center justify-between gap-3 py-3 text-[13px] hover:bg-tint-soft"><span><b>{o.order_number}</b><span className="block text-[12px] text-muted">{o.email}</span></span><span className="flex items-center gap-2"><StatusBadge value={o.payment_status === 'paid' ? o.status : o.payment_status} />{formatMoney(o.total_cents, o.currency)}</span></Link></li>)}{(recentOrders.data ?? []).length === 0 && <li className="py-3 text-[13px] text-muted">No orders yet.</li>}</ul>
          </section>
        )}
        {lowStock && (
          <section className="rounded-2xl bg-white p-5 shadow-soft"><h3 className="flex items-center gap-2 text-[18px]">{low.length > 0 && <AlertTriangle className="h-4 w-4 text-amber-600" />}Low stock</h3>
            <ul className="mt-3 divide-y divide-line">{low.map((p) => <li key={p.id}><Link href={`/admin/products/${p.id}`} className="flex justify-between py-3 text-[13px] hover:bg-tint-soft"><span>{p.name}</span><b className={p.stock_quantity === 0 ? 'text-red-600' : 'text-amber-700'}>{p.stock_quantity} left</b></Link></li>)}{low.length === 0 && <li className="py-3 text-[13px] text-muted">All products are well stocked.</li>}</ul>
          </section>
        )}
        {recentCustomers && (
          <section className="rounded-2xl bg-white p-5 shadow-soft"><h3 className="text-[18px]">New customers</h3>
            <ul className="mt-3 divide-y divide-line">{(recentCustomers.data ?? []).map((c) => <li key={c.id} className="flex justify-between py-3 text-[13px]"><span>{c.full_name || c.email}</span><span className="text-muted">{formatDate(c.created_at)}</span></li>)}{(recentCustomers.data ?? []).length === 0 && <li className="py-3 text-[13px] text-muted">No customers yet.</li>}</ul>
          </section>
        )}
        {recentReviews && (
          <section className="rounded-2xl bg-white p-5 shadow-soft"><div className="flex items-center justify-between"><h3 className="text-[18px]">Latest reviews</h3><Link href="/admin/reviews" className="text-[12px] font-bold underline">Moderate</Link></div>
            <ul className="mt-3 divide-y divide-line">{(recentReviews.data ?? []).map((r) => <li key={r.id} className="py-3 text-[13px]"><div className="flex justify-between"><b>{r.display_name} · {'★'.repeat(r.rating)}</b><StatusBadge value={r.status} /></div><p className="mt-1 line-clamp-2 text-muted">{r.body}</p></li>)}{(recentReviews.data ?? []).length === 0 && <li className="py-3 text-[13px] text-muted">No reviews yet.</li>}</ul>
          </section>
        )}
      </div>
    </div>
  );
}
