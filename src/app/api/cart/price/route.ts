import { NextResponse } from 'next/server';
import { z } from 'zod';
import { priceCart } from '@/lib/pricing';
import { rateLimit } from '@/lib/rate-limit';

const Line = z.object({ productId: z.string().uuid(), variantId: z.string().uuid().nullish(), quantity: z.number().int().min(1).max(99) });
const Body = z.object({
  // Lines are validated one by one below, so one stale/invalid line can't break the whole cart.
  lines: z.array(z.unknown()).max(50),
  discountCode: z.string().trim().max(40).nullish(),
  shippingMethodId: z.string().uuid().nullish(),
});

export async function POST(req: Request) {
  if (!(await rateLimit('price', 90, 60))) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid cart' }, { status: 400 });
  try {
    const lines = parsed.data.lines.flatMap((l) => { const r = Line.safeParse(l); return r.success ? [r.data] : []; });
    return NextResponse.json(await priceCart({ ...parsed.data, lines }));
  } catch (e) {
    console.error('[cart/price]', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'Could not load your cart. Please try again.' }, { status: 503 });
  }
}
