import Link from 'next/link';
import { Download, Plus } from 'lucide-react';
import { ActionForm } from '@/components/dashboard/ActionForm';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';
import { addSubscriberAction, deleteSubscriberAction, subscriberStatusAction } from './actions';

export const metadata = { title: 'Newsletter' };
export const dynamic = 'force-dynamic';

export default async function AdminNewsletter({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  await requireAdmin('newsletter');
  const { q, status } = await searchParams;
  const sb = await createClient();
  let sq = sb.from('newsletter_subscribers').select('id,email,status,source,consented_at,created_at').order('created_at', { ascending: false }).limit(100);
  if (q) sq = sq.ilike('email', `%${q.replace(/[%,()]/g, '')}%`);
  if (status && ['subscribed', 'unsubscribed', 'suppressed'].includes(status)) sq = sq.eq('status', status);
  const [{ data: subs }, { data: campaigns }, { data: all }] = await Promise.all([
    sq,
    sb.from('newsletter_campaigns').select('id,subject,status,scheduled_at,sent_at,total_recipients,created_at').order('created_at', { ascending: false }).limit(30),
    sb.from('newsletter_subscribers').select('status'),
  ]);
  const count = (s: string) => (all ?? []).filter((x) => x.status === s).length;
  const box = 'rounded-2xl bg-white p-5 shadow-soft md:p-6';
  return (
    <div className="space-y-6">
      <h2 className="text-[26px]">Newsletter</h2>
      <div className="grid gap-4 sm:grid-cols-3">{[['Subscribed', count('subscribed')], ['Unsubscribed', count('unsubscribed')], ['Suppressed (bounced/complained)', count('suppressed')]].map(([l, v]) => <div key={l} className="rounded-2xl bg-white p-5 shadow-soft"><p className="text-[12px] uppercase tracking-wider text-muted">{l}</p><p className="mt-2 font-serif text-[28px] font-bold">{v}</p></div>)}</div>

      <section className={box}><div className="flex items-center justify-between"><h3 className="text-[18px]">Campaigns</h3><Link href="/admin/newsletter/campaigns/new" className="btn btn-primary h-10 px-4 text-[13px]"><Plus className="h-4 w-4" />New campaign</Link></div>
        <ul className="mt-4 divide-y divide-line">{(campaigns ?? []).map((c) => <li key={c.id}><Link href={`/admin/newsletter/campaigns/${c.id}`} className="flex flex-wrap items-center justify-between gap-2 py-3 text-[13px] hover:bg-tint-soft"><b>{c.subject}</b><span className="flex items-center gap-3"><span className="text-muted">{c.status === 'scheduled' && c.scheduled_at ? formatDate(c.scheduled_at, { dateStyle: 'medium', timeStyle: 'short' }) : c.sent_at ? `${c.total_recipients} recipients` : formatDate(c.created_at)}</span><StatusBadge value={c.status} /></span></Link></li>)}{(campaigns ?? []).length === 0 && <li className="py-4 text-[13px] text-muted">No campaigns yet.</li>}</ul></section>

      <section className={box}><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-[18px]">Subscribers</h3><a href="/api/admin/subscribers/export" className="btn btn-outline h-10 px-4 text-[13px]"><Download className="h-4 w-4" />Export CSV</a></div>
        <form className="mt-4 flex flex-wrap gap-2"><input name="q" defaultValue={q} placeholder="Search email" aria-label="Search subscribers" className="input h-10 w-56" /><select name="status" defaultValue={status ?? ''} aria-label="Status" className="input h-10 w-40"><option value="">All</option><option value="subscribed">Subscribed</option><option value="unsubscribed">Unsubscribed</option><option value="suppressed">Suppressed</option></select><button className="btn btn-outline h-10 px-4 text-[13px]">Filter</button></form>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[640px] text-left text-[13px]"><thead className="text-[11px] uppercase tracking-wider text-muted"><tr><th className="py-2">Email</th><th>Status</th><th>Source</th><th>Consent date</th><th /></tr></thead>
          <tbody className="divide-y divide-line">{(subs ?? []).map((s) => <tr key={s.id}><td className="py-2.5">{s.email}</td><td><StatusBadge value={s.status} /></td><td>{s.source}</td><td>{formatDate(s.consented_at)}</td>
            <td className="flex justify-end gap-2 py-1.5">{s.status === 'subscribed' && <ActionForm action={subscriberStatusAction} submit="Unsubscribe" small submitClassName="rounded-full border border-line px-3 py-1 text-[11px] hover:bg-tint"><input type="hidden" name="id" value={s.id} /><input type="hidden" name="status" value="unsubscribed" /></ActionForm>}
              <ActionForm action={deleteSubscriberAction} submit="Remove" small confirm="Remove this subscriber permanently?" submitClassName="rounded-full px-3 py-1 text-[11px] text-red-600 hover:bg-red-50"><input type="hidden" name="id" value={s.id} /></ActionForm></td></tr>)}
            {(subs ?? []).length === 0 && <tr><td colSpan={5} className="py-6 text-center text-muted">No subscribers found.</td></tr>}</tbody></table></div>
        <ActionForm action={addSubscriberAction} submit="Add subscriber" resetOnSuccess className="mt-6 border-t border-line pt-6"><h4 className="text-[15px] font-bold">Add a subscriber manually</h4>
          <div className="mt-3 flex flex-wrap gap-3"><input name="email" type="email" required placeholder="email@example.com" aria-label="Email" className="input h-10 w-64" /></div>
          <label className="mt-3 flex items-start gap-2 text-[12px] text-muted"><input type="checkbox" name="consent" className="mt-0.5" required />This person gave explicit consent to receive marketing emails from GLOWNEST.</label></ActionForm></section>
    </div>
  );
}
