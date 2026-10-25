import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/** Resend signs webhooks with Svix: HMAC-SHA256 over `${id}.${timestamp}.${body}` using the base64 part of the `whsec_` secret. */
function verify(raw: string, req: NextRequest, secret: string) {
  const id = req.headers.get('svix-id'); const ts = req.headers.get('svix-timestamp'); const sigs = req.headers.get('svix-signature');
  if (!id || !ts || !sigs) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false; // replay window
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const expected = createHmac('sha256', key).update(`${id}.${ts}.${raw}`).digest();
  return sigs.split(' ').some((part) => {
    const [v, s] = part.split(',');
    if (v !== 'v1' || !s) return false;
    const got = Buffer.from(s, 'base64');
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  const raw = await req.text();
  if (!verify(raw, req, secret)) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });

  let evt: { type?: string; data?: { email_id?: string; to?: string[] } };
  try { evt = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Bad payload' }, { status: 400 }); }
  const status = ({ 'email.delivered': 'delivered', 'email.bounced': 'bounced', 'email.complained': 'complained' } as Record<string, string>)[evt.type ?? ''];
  const mid = evt.data?.email_id;
  if (!status || !mid) return NextResponse.json({ ok: true, ignored: true });

  const db = createAdminClient();
  await db.from('notification_queue').update({ delivery_status: status }).eq('provider_message_id', mid);
  if (status !== 'delivered') {
    // A hard bounce or spam complaint permanently suppresses marketing email to that address.
    const { data: d } = await db.from('newsletter_deliveries').select('subscriber_id').eq('provider_message_id', mid).maybeSingle();
    if (d) await db.from('newsletter_subscribers').update({ status: 'suppressed', unsubscribed_at: new Date().toISOString() }).eq('id', d.subscriber_id);
    await db.from('newsletter_deliveries').update({ last_error: status }).eq('provider_message_id', mid);
  }
  return NextResponse.json({ ok: true });
}
