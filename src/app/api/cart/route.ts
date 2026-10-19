import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const Body = z.object({
  lines: z.array(z.object({
    productId: z.string().uuid(),
    variantId: z.string().uuid().nullish(),
    quantity: z.number().int().min(1).max(99),
  })).max(50),
});

// Cart rows are protected by RLS, so the user-scoped client can only touch the caller's own cart.
export async function GET() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ lines: [] }, { status: 401 });
  const { data: cart } = await sb.from('carts').select('id').eq('user_id', user.id).maybeSingle();
  if (!cart) return NextResponse.json({ lines: [] });
  const { data } = await sb.from('cart_items').select('product_id,variant_id,quantity').eq('cart_id', cart.id);
  return NextResponse.json({ lines: (data ?? []).map((r) => ({ productId: r.product_id, variantId: r.variant_id, quantity: r.quantity })) });
}

export async function PUT(req: Request) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid cart' }, { status: 400 });

  let { data: cart } = await sb.from('carts').select('id').eq('user_id', user.id).maybeSingle();
  if (!cart) {
    const ins = await sb.from('carts').insert({ user_id: user.id }).select('id').single();
    cart = ins.data;
  }
  if (!cart) return NextResponse.json({ error: 'Could not save cart' }, { status: 500 });
  await sb.from('cart_items').delete().eq('cart_id', cart.id);
  if (parsed.data.lines.length) {
    await sb.from('cart_items').insert(parsed.data.lines.map((l) => ({
      cart_id: cart!.id, product_id: l.productId, variant_id: l.variantId ?? null, quantity: l.quantity,
    })));
  }
  return NextResponse.json({ ok: true });
}
