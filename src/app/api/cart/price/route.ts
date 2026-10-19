import { NextResponse } from 'next/server';
import { z } from 'zod';
import { priceCart } from '@/lib/pricing';
import { rateLimit } from '@/lib/rate-limit';

const Body = z.object({
  lines: z.array(z.object({ productId: z.string().uuid(), variantId: z.string().uuid().nullish(), quantity: z.number().int().min(1).max(99) })).max(50),
  discountCode: z.string().trim().max(40).nullish(),
  shippingMethodId: z.string().uuid().nullish(),
});

export async function POST(req: Request) {
  if (!(await rateLimit('price', 90, 60))) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid cart' }, { status: 400 });
  return NextResponse.json(await priceCart(parsed.data));
}
