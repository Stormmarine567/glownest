import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { priceCart } from '@/lib/pricing';
import { rateLimit } from '@/lib/rate-limit';
import { startPayment } from '@/lib/payments/flow';

const Address = z.object({
  full_name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(5).max(30),
  line1: z.string().trim().min(3).max(200),
  line2: z.string().trim().max(200).optional().default(''),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().max(100).optional().default(''),
  postal_code: z.string().trim().max(20).optional().default(''),
  country: z.string().trim().length(2).toUpperCase(),
});
const Body = z.object({
  lines: z.array(z.object({ productId: z.string().uuid(), variantId: z.string().uuid().nullish(), quantity: z.number().int().min(1).max(99) })).min(1).max(50),
  discountCode: z.string().trim().max(40).nullish(),
  shippingMethodId: z.string().uuid().nullish(),
  provider: z.enum(['paystack', 'flutterwave']),
  address: Address,
  saveAddress: z.boolean().optional(),
});

export async function POST(req: Request) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in to check out.' }, { status: 401 });
  if (!(await rateLimit('checkout', 10, 600, user.id))) return NextResponse.json({ error: 'Too many attempts. Please wait a few minutes.' }, { status: 429 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Please check your delivery details.' }, { status: 400 });
  const b = parsed.data;

  const { data: profile } = await sb.from('profiles').select('email,full_name,is_active').eq('id', user.id).single();
  if (!profile?.is_active) return NextResponse.json({ error: 'Your account is not active.' }, { status: 403 });

  const pricing = await priceCart({ lines: b.lines, discountCode: b.discountCode, shippingMethodId: b.shippingMethodId });
  const buyable = pricing.lines.filter((l) => l.inStock && l.quantity > 0);
  if (buyable.length === 0) return NextResponse.json({ error: pricing.issues[0] || 'Your cart is empty.' }, { status: 400 });
  if (buyable.length !== pricing.lines.length || pricing.issues.length) return NextResponse.json({ error: pricing.issues[0] || 'Some items changed — please review your cart.', needsReview: true }, { status: 409 });
  if (b.discountCode && pricing.discountError) return NextResponse.json({ error: pricing.discountError }, { status: 400 });
  if (pricing.totalCents <= 0) return NextResponse.json({ error: 'Order total must be greater than zero.' }, { status: 400 });

  const db = createAdminClient();
  const { data: order, error } = await db.from('orders').insert({
    user_id: user.id, email: profile.email, status: 'pending', payment_status: 'unpaid', currency: pricing.currency,
    subtotal_cents: pricing.subtotalCents, discount_cents: pricing.discountCents, shipping_cents: pricing.shippingCents,
    tax_cents: pricing.taxCents, total_cents: pricing.totalCents, discount_code: pricing.discountCode,
    shipping_method_id: pricing.shippingMethodId, shipping_address: b.address, billing_address: b.address,
  }).select('id,order_number,email,total_cents,currency').single();
  if (error || !order) return NextResponse.json({ error: 'Could not create your order.' }, { status: 500 });

  const { error: itemsErr } = await db.from('order_items').insert(buyable.map((l) => ({
    order_id: order.id, product_id: l.productId, variant_id: l.variantId, name: l.name, variant_name: l.variantName,
    image_url: l.imageUrl, unit_price_cents: l.unitCents, quantity: l.quantity, line_total_cents: l.lineCents,
  })));
  if (itemsErr) {
    await db.from('orders').delete().eq('id', order.id);
    return NextResponse.json({ error: 'Could not create your order.' }, { status: 500 });
  }

  if (b.saveAddress) {
    await sb.from('addresses').insert({ user_id: user.id, label: 'Saved at checkout', ...b.address, is_default_shipping: false });
  }

  try {
    const { url } = await startPayment(order, b.provider, b.address.full_name);
    return NextResponse.json({ url, orderId: order.id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Payment could not be started.', orderId: order.id }, { status: 502 });
  }
}
