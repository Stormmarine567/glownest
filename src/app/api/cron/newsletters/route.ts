import { NextResponse, type NextRequest } from 'next/server';
import { cronGuard } from '@/lib/cron-auth';
import { sendEmail, siteUrl } from '@/lib/email/send';
import { renderCampaign } from '@/lib/email/templates';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_ATTEMPTS = 3;

export async function GET(req: NextRequest) {
  const denied = cronGuard(req);
  if (denied) return denied;
  const db = createAdminClient();
  const started = Date.now();
  const base = siteUrl();
  const stats = { activated: 0, sent: 0, failed: 0, skipped: 0, completed: 0 };

  // 1. Turn due scheduled campaigns into delivery rows. The status flip is the lock: only one run can win it.
  const { data: due } = await db.from('newsletter_campaigns').select('id').eq('status', 'scheduled').lte('scheduled_at', new Date().toISOString());
  for (const c of due ?? []) {
    const { data: won } = await db.from('newsletter_campaigns').update({ status: 'sending' }).eq('id', c.id).eq('status', 'scheduled').select('id');
    if (!won?.length) continue;
    let from = 0, total = 0;
    for (;;) {
      const { data: subs } = await db.from('newsletter_subscribers').select('id,email').eq('status', 'subscribed').order('created_at').range(from, from + 499);
      if (!subs?.length) break;
      await db.from('newsletter_deliveries').upsert(subs.map((s) => ({ campaign_id: c.id, subscriber_id: s.id, email: s.email })), { onConflict: 'campaign_id,subscriber_id', ignoreDuplicates: true });
      total += subs.length; from += 500;
      if (subs.length < 500) break;
    }
    await db.from('newsletter_campaigns').update({ total_recipients: total }).eq('id', c.id);
    stats.activated++;
  }

  // 2. Send. A previous run that died mid-batch leaves rows in "processing"; the idempotency key makes re-sending them safe.
  const { data: sending } = await db.from('newsletter_campaigns').select('id,subject,preheader,banner_url,body_html').eq('status', 'sending');
  for (const c of sending ?? []) {
    await db.from('newsletter_deliveries').update({ status: 'pending' }).eq('campaign_id', c.id).eq('status', 'processing');
    while (Date.now() - started < 45_000) {
      const { data: batch } = await db.rpc('claim_newsletter_deliveries', { p_campaign: c.id, p_limit: 25 });
      if (!batch?.length) break;
      for (const d of batch as { id: string; subscriber_id: string; email: string; attempts: number }[]) {
        const { data: sub } = await db.from('newsletter_subscribers').select('status,unsubscribe_token').eq('id', d.subscriber_id).maybeSingle();
        if (!sub || sub.status !== 'subscribed') { // unsubscribed or suppressed since the campaign was queued
          await db.from('newsletter_deliveries').update({ status: 'dead', last_error: 'No longer subscribed' }).eq('id', d.id);
          stats.skipped++; continue;
        }
        const unsub = `${base}/unsubscribe?t=${sub.unsubscribe_token}`;
        try {
          const mail = renderCampaign(c, unsub, base);
          const { id } = await sendEmail({
            to: d.email, ...mail, idempotencyKey: `campaign-${d.id}`,
            headers: { 'List-Unsubscribe': `<${base}/api/unsubscribe?t=${sub.unsubscribe_token}>, <${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
          });
          await db.from('newsletter_deliveries').update({ status: 'sent', sent_at: new Date().toISOString(), provider_message_id: id, last_error: null }).eq('id', d.id);
          stats.sent++;
        } catch (e) {
          await db.from('newsletter_deliveries').update({ status: d.attempts >= MAX_ATTEMPTS ? 'failed' : 'pending', last_error: (e instanceof Error ? e.message : 'send failed').slice(0, 500) }).eq('id', d.id);
          stats.failed++;
        }
        await new Promise((r) => setTimeout(r, 250));
        if (Date.now() - started > 52_000) break;
      }
    }
    // 3. Finished when nothing is left to send.
    const { count } = await db.from('newsletter_deliveries').select('id', { count: 'exact', head: true }).eq('campaign_id', c.id).in('status', ['pending', 'processing']);
    if (!count) { await db.from('newsletter_campaigns').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', c.id).eq('status', 'sending'); stats.completed++; }
  }
  return NextResponse.json(stats);
}
