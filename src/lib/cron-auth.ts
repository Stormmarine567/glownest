import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Anything else is rejected, and an unset secret fails closed. */
export function cronGuard(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 500 });
  const got = req.headers.get('authorization') ?? '';
  const want = `Bearer ${secret}`;
  const a = Buffer.from(got); const b = Buffer.from(want);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return null;
}
