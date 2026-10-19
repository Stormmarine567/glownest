import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rate-limit';

const Body = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  subject: z.string().trim().max(200).optional().default(''),
  message: z.string().trim().min(5).max(4000),
  website: z.string().max(0).optional(), // honeypot — humans leave it empty
});

export async function POST(req: Request) {
  if (!(await rateLimit('contact', 5, 900))) return NextResponse.json({ error: 'Too many messages. Please try again later.' }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Please complete all fields with a valid email.' }, { status: 400 });
  const { website: _hp, ...row } = parsed.data;
  void _hp;
  const { error } = await createAdminClient().from('contact_messages').insert(row);
  if (error) return NextResponse.json({ error: 'Could not send your message.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
