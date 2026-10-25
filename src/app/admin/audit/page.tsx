import Link from 'next/link';
import { requireSuperAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';

export const metadata = { title: 'Audit log' };
export const dynamic = 'force-dynamic';

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ q?: string; entity?: string; page?: string }> }) {
  await requireSuperAdmin();
  const { q, entity, page } = await searchParams;
  const pg = Math.max(1, parseInt(page ?? '1', 10) || 1); const size = 50;
  let query = (await createClient()).from('audit_logs').select('*', { count: 'exact' }).order('id', { ascending: false }).range((pg - 1) * size, pg * size - 1);
  if (entity) query = query.eq('entity', entity);
  if (q) { const t = q.replace(/[%,()]/g, ''); query = query.or(`actor_email.ilike.%${t}%,action.ilike.%${t}%,entity_id.ilike.%${t}%`); }
  const { data, count } = await query;
  const pages = Math.max(1, Math.ceil((count ?? 0) / size));
  const href = (p: number) => `/admin/audit?${new URLSearchParams({ ...(q ? { q } : {}), ...(entity ? { entity } : {}), page: String(p) })}`;
  const ENTITIES = ['products', 'orders', 'reviews', 'payment_gateways', 'payment_gateway_secrets', 'site_settings', 'site_content', 'pages', 'profiles', 'discount_codes', 'shipping_methods', 'social_links'];
  return (
    <div>
      <h2 className="mb-1 text-[26px]">Audit log</h2><p className="mb-5 text-[13px] text-muted">Who changed what. Entries cannot be edited or deleted. Secrets are never recorded.</p>
      <form className="mb-4 flex flex-wrap gap-2"><input name="q" defaultValue={q} placeholder="Admin email, action or ID" aria-label="Search" className="input h-10 w-full sm:w-64" /><select name="entity" defaultValue={entity ?? ''} aria-label="Area" className="input h-10 w-full sm:w-52"><option value="">All areas</option>{ENTITIES.map((e) => <option key={e}>{e}</option>)}</select><button className="btn btn-outline h-10 px-4 text-[13px]">Filter</button></form>
      <div className="overflow-x-auto rounded-2xl bg-white shadow-soft"><table className="w-full min-w-[760px] text-left text-[13px]"><thead className="border-b border-line text-[11px] uppercase tracking-wider text-muted"><tr><th className="p-4">When</th><th>Who</th><th>Action</th><th>Item</th><th>Details</th></tr></thead>
        <tbody className="divide-y divide-line align-top">{(data ?? []).map((l) => (
          <tr key={l.id}><td className="whitespace-nowrap p-4">{formatDate(l.created_at, { dateStyle: 'medium', timeStyle: 'short' })}</td><td>{l.actor_email ?? <span className="text-muted">system</span>}{l.actor_role && <span className="block text-[11px] text-muted">{l.actor_role}</span>}</td><td className="font-medium">{l.action}</td><td className="max-w-[160px] truncate" title={l.entity_id ?? ''}>{l.entity_id}</td>
            <td className="py-3 pr-4">{(l.before || l.after) ? <details><summary className="cursor-pointer text-[12px] underline">View</summary><pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-tint-soft p-3 text-[11px]">{JSON.stringify({ before: l.before, after: l.after }, null, 2)}</pre></details> : '—'}</td></tr>))}
          {(data ?? []).length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted">Nothing recorded yet.</td></tr>}</tbody></table></div>
      {pages > 1 && <div className="mt-4 flex items-center justify-between text-[13px]"><span className="text-muted">Page {pg} of {pages}</span><span className="flex gap-3">{pg > 1 && <Link href={href(pg - 1)} className="underline">Previous</Link>}{pg < pages && <Link href={href(pg + 1)} className="underline">Next</Link>}</span></div>}
    </div>
  );
}
