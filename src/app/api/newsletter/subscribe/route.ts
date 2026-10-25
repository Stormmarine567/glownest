import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';

const Body = z.object({ email: z.string().trim().toLowerCase().email().max(254) });

export async function POST(req: Request) {
  if (!(await rateLimit('newsletter', 5, 600))) return NextResponse.json({ error: 'Too many attempts. Try again shortly.' }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });

  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  const { data, error } = await createAdminClient().rpc('subscribe_email', {
    p_email: parsed.data.email, p_user: user && user.email?.toLowerCase() === parsed.data.email ? user.id : null, p_source: 'website',
  });
  if (error) return NextResponse.json({ error: 'Could not subscribe right now.' }, { status: 500 });
  if (data && data.ok === false) {
    return NextResponse.json({ error: 'This address has opted out of marketing emails.' }, { status: 409 });
  }
  return NextResponse.json({ ok: true, message: 'Thanks! Check your inbox for a welcome note.' });
}
