import { NextResponse, type NextRequest } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** RFC 8058 one-click unsubscribe (mail clients POST here). The unguessable token is the authorization. */
export async function POST(req: NextRequest) {
  const t = req.nextUrl.searchParams.get('t');
  if (!t || !UUID.test(t)) return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  if (!(await rateLimit('unsub-post', 30, 600))) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  await createAdminClient().from('newsletter_subscribers').update({ status: 'unsubscribed', unsubscribed_at: new Date().toISOString() }).eq('unsubscribe_token', t).eq('status', 'subscribed');
  return NextResponse.json({ ok: true });
}
