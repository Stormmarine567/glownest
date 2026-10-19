import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CampaignForm } from '@/components/dashboard/CampaignActions';
import { CampaignFields } from '@/components/dashboard/CampaignFields';
import { ActionForm } from '@/components/dashboard/ActionForm';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';
import { cancelCampaignAction, deleteCampaignAction } from '../../actions';

export const metadata = { title: 'Campaign' };
export const dynamic = 'force-dynamic';

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin('newsletter');
  const { id } = await params;
  const sb = await createClient();
  const isNew = id === 'new';
  const { data: c } = isNew ? { data: null } : await sb.from('newsletter_campaigns').select('*').eq('id', id).maybeSingle();
  if (!isNew && !c) notFound();
  const locked = Boolean(c && ['sending', 'sent'].includes(c.status));
  let stats: Record<string, number> = {};
  if (c && c.status !== 'draft') {
    const { data } = await sb.from('newsletter_deliveries').select('status').eq('campaign_id', id);
    stats = (data ?? []).reduce<Record<string, number>>((m, d) => { m[d.status] = (m[d.status] ?? 0) + 1; return m; }, {});
  }
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h2 className="text-[26px]">{isNew ? 'New campaign' : c!.subject}</h2><Link href="/admin/newsletter" className="text-[13px] underline">← Newsletter</Link></div>
      {c && <div className="flex flex-wrap items-center gap-3 text-[13px]"><StatusBadge value={c.status} />{c.scheduled_at && c.status === 'scheduled' && <span>Sends {formatDate(c.scheduled_at, { dateStyle: 'medium', timeStyle: 'short' })}</span>}{c.sent_at && <span>Finished {formatDate(c.sent_at, { dateStyle: 'medium', timeStyle: 'short' })}</span>}
        {c.status !== 'draft' && c.status !== 'scheduled' && <span className="text-muted">Recipients {c.total_recipients} · sent {stats.sent ?? 0} · pending {(stats.pending ?? 0) + (stats.processing ?? 0)} · failed {stats.failed ?? 0} · skipped {stats.dead ?? 0}</span>}</div>}
      <CampaignForm id={isNew ? undefined : id} locked={locked}>
        <CampaignFields locked={locked} initial={{ subject: c?.subject ?? '', preheader: c?.preheader ?? '', banner_url: c?.banner_url ?? '', body_html: c?.body_html ?? '<h2>Hello</h2>\n<p>Write your message here.</p>', scheduled_at: c?.scheduled_at ?? '' }} />
      </CampaignForm>
      {c?.status === 'scheduled' && <ActionForm action={cancelCampaignAction} submit="Cancel schedule" small submitClassName="btn btn-outline h-10 px-4 text-[13px]"><input type="hidden" name="id" value={id} /></ActionForm>}
      {c && ['draft', 'failed', 'sent'].includes(c.status) && <ActionForm action={deleteCampaignAction} submit="Delete campaign" danger small confirm="Delete this campaign?"><input type="hidden" name="id" value={id} /></ActionForm>}
    </div>
  );
}
