'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import type { ActionState } from '@/lib/action-types';
import { bool, fail, ok, optStr, run, str } from '@/lib/admin-action';
import { sendEmail, siteUrl } from '@/lib/email/send';
import { renderCampaign } from '@/lib/email/templates';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const Email = z.string().trim().toLowerCase().email('Enter a valid email address.');

export async function addSubscriberAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run('newsletter', async () => {
    const e = Email.safeParse(str(fd, 'email'));
    if (!e.success) return fail(e.error.issues[0].message);
    if (!bool(fd, 'consent')) return fail('Confirm that this person has given consent to receive marketing emails.');
    const { data, error } = await createAdminClient().rpc('subscribe_email', { p_email: e.data, p_user: null, p_source: 'admin' });
    if (error) return fail(error.message);
    if (!(data as { ok: boolean }).ok) return fail('This address previously unsubscribed or was suppressed, so it cannot be re-added by an admin.');
    revalidatePath('/admin/newsletter');
    return ok('Subscriber added.');
  });
}

export async function subscriberStatusAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run('newsletter', async () => {
    const status = str(fd, 'status');
    if (!['unsubscribed', 'suppressed'].includes(status)) return fail('Invalid status.');
    const { error } = await (await createClient()).from('newsletter_subscribers').update({ status, unsubscribed_at: new Date().toISOString() }).eq('id', str(fd, 'id'));
    if (error) return fail(error.message);
    revalidatePath('/admin/newsletter');
    return ok('Updated.');
  });
}

export async function deleteSubscriberAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run('newsletter', async () => {
    const { error } = await (await createClient()).from('newsletter_subscribers').delete().eq('id', str(fd, 'id'));
    if (error) return fail(error.message);
    revalidatePath('/admin/newsletter');
    return ok('Subscriber removed.');
  });
}

const Campaign = z.object({
  subject: z.string().trim().min(3, 'Add a subject line.').max(200),
  body_html: z.string().trim().min(10, 'Write the email content.').max(200_000),
});

function parseCampaign(fd: FormData) {
  return Campaign.safeParse({ subject: str(fd, 'subject'), body_html: str(fd, 'body_html') });
}

export async function saveCampaignAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let newId: string | null = null;
  const res = await run('newsletter', async ({ userId }) => {
    const p = parseCampaign(fd);
    if (!p.success) return fail(p.error.issues[0].message);
    const intent = str(fd, 'intent'); // draft | schedule | now
    const sb = await createClient();
    const id = str(fd, 'id');
    let scheduled_at: string | null = null; let status: 'draft' | 'scheduled' = 'draft';
    if (intent === 'now') { scheduled_at = new Date().toISOString(); status = 'scheduled'; }
    if (intent === 'schedule') {
      const d = new Date(str(fd, 'scheduled_at'));
      if (Number.isNaN(d.getTime()) || d.getTime() < Date.now() - 60_000) return fail('Pick a date and time in the future.');
      scheduled_at = d.toISOString(); status = 'scheduled';
    }
    if (status === 'scheduled') {
      const { count } = await sb.from('newsletter_subscribers').select('id', { count: 'exact', head: true }).eq('status', 'subscribed');
      if (!count) return fail('There are no subscribed recipients yet.');
    }
    const row = { subject: p.data.subject, preheader: optStr(fd, 'preheader'), banner_url: optStr(fd, 'banner_url'), body_html: p.data.body_html, status, scheduled_at };
    if (id) {
      const { data: cur } = await sb.from('newsletter_campaigns').select('status').eq('id', id).single();
      if (!cur || !['draft', 'failed', 'scheduled'].includes(cur.status)) return fail('This campaign has already started sending and can no longer be edited.');
      const { error } = await sb.from('newsletter_campaigns').update(row).eq('id', id);
      if (error) return fail(error.message);
    } else {
      const { data, error } = await sb.from('newsletter_campaigns').insert({ ...row, created_by: userId }).select('id').single();
      if (error || !data) return fail(error?.message ?? 'Could not save.');
      newId = data.id;
    }
    revalidatePath('/admin/newsletter');
    return ok(intent === 'now' ? 'Queued — it will start sending within 15 minutes.' : intent === 'schedule' ? 'Campaign scheduled.' : 'Draft saved.');
  });
  if (newId) redirect(`/admin/newsletter/campaigns/${newId}`);
  return res;
}

export async function cancelCampaignAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run('newsletter', async () => {
    const { error } = await (await createClient()).from('newsletter_campaigns').update({ status: 'draft', scheduled_at: null }).eq('id', str(fd, 'id')).eq('status', 'scheduled');
    if (error) return fail(error.message);
    revalidatePath('/admin/newsletter');
    return ok('Schedule cancelled — back to draft.');
  });
}

export async function deleteCampaignAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const res = await run('newsletter', async () => {
    const { error } = await (await createClient()).from('newsletter_campaigns').delete().eq('id', str(fd, 'id')).in('status', ['draft', 'failed', 'sent']);
    if (error) return fail(error.message);
    return ok('Deleted.');
  });
  if (res?.ok) redirect('/admin/newsletter');
  return res;
}

export async function sendTestAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run('newsletter', async ({ profile }) => {
    const p = parseCampaign(fd);
    if (!p.success) return fail(p.error.issues[0].message);
    const base = siteUrl();
    const mail = renderCampaign({ subject: `[Test] ${p.data.subject}`, preheader: optStr(fd, 'preheader'), banner_url: optStr(fd, 'banner_url'), body_html: p.data.body_html }, `${base}/unsubscribe?t=test`, base);
    try { await sendEmail({ to: profile.email, ...mail }); } catch (e) { return fail(e instanceof Error ? e.message : 'Could not send the test.'); }
    return ok(`Test sent to ${profile.email}.`);
  });
}
