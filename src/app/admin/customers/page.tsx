import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatDate, formatMoney } from '@/lib/utils';

export const metadata = { title: 'Customers' };
export const dynamic = 'force-dynamic';

export default async function AdminCustomers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { profile } = await requireAdmin('customers');
  const { q } = await searchParams;
  const sb = await createClient();
  let query = sb.from('profiles').select('id,email,full_name,phone,is_active,marketing_opt_in,created_at').eq('role', 'customer').order('created_at', { ascending: false }).limit(100);
  if (q) { const t = q.replace(/[%,()]/g, ''); query = query.or(`email.ilike.%${t}%,full_name.ilike.%${t}%`); }
  const { data } = await query;
  const ids = (data ?? []).map((c) => c.id);
  const { data: orders } = ids.length && profile.permissions.concat(profile.role === 'super_admin' ? ['orders'] : []).includes('orders')
    ? await sb.from('orders').select('user_id,total_cents,currency').in('user_id', ids).eq('payment_status', 'paid') : { data: [] as { user_id: string; total_cents: number; currency: string }[] };
  const spend = new Map<string, { n: number; t: number; c: string }>();
  for (const o of orders ?? []) { const s = spend.get(o.user_id) ?? { n: 0, t: 0, c: o.currency }; s.n++; s.t += o.total_cents; spend.set(o.user_id, s); }
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="text-[26px]">Customers</h2><form className="flex gap-2"><input name="q" defaultValue={q} placeholder="Search name or email" aria-label="Search customers" className="input h-10 w-56" /><button className="btn btn-outline h-10 px-4 text-[13px]">Search</button></form></div>
      <div className="overflow-x-auto rounded-2xl bg-white shadow-soft"><table className="w-full min-w-[680px] text-left text-[13px]">
        <thead className="border-b border-line text-[11px] uppercase tracking-wider text-muted"><tr><th className="p-4">Customer</th><th>Phone</th><th>Orders</th><th>Spent</th><th>Marketing</th><th>Joined</th></tr></thead>
        <tbody className="divide-y divide-line">{(data ?? []).map((c) => { const s = spend.get(c.id); return <tr key={c.id}><td className="p-4"><b>{c.full_name || '—'}</b><span className="block text-muted">{c.email}</span></td><td>{c.phone || '—'}</td><td>{s?.n ?? 0}</td><td>{s ? formatMoney(s.t, s.c) : '—'}</td><td>{c.marketing_opt_in ? 'Opted in' : 'No'}</td><td>{formatDate(c.created_at)}</td></tr>; })}
          {(data ?? []).length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted">No customers found.</td></tr>}</tbody></table></div>
    </div>
  );
}
