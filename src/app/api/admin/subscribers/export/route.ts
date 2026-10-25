import { NextResponse } from 'next/server';
import { getSessionProfile, can } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const cell = (v: string) => `"${(/^[=+\-@\t\r]/.test(v) ? `'${v}` : v).replace(/"/g, '""')}"`; // also blocks spreadsheet formula injection

export async function GET() {
  const s = await getSessionProfile();
  if (!s || !can(s.profile, 'newsletter')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { data } = await (await createClient()).from('newsletter_subscribers').select('email,status,source,consented_at').order('created_at', { ascending: false }).limit(50_000);
  const csv = ['email,status,source,consented_at', ...(data ?? []).map((r) => [r.email, r.status, r.source, r.consented_at].map((x) => cell(String(x ?? ''))).join(','))].join('\n');
  return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="subscribers.csv"', 'Cache-Control': 'no-store' } });
}
