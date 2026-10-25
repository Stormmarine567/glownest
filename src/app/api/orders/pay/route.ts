import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { startPayment } from '@/lib/payments/flow';

const Body = z.object({ orderId: z.string().uuid(), provider: z.enum(['paystack', 'flutterwave']) });

// "Pay now" for an order that is still unpaid. Ownership is enforced by RLS on the user-scoped read.
export async function POST(req: Request) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  if (!(await rateLimit('pay', 10, 600, user.id))) return NextResponse.json({ error: 'Too many attempts.' }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });

  const { data: order } = await sb.from('orders').select('id,order_number,email,total_cents,currency,status,payment_status,user_id').eq('id', parsed.data.orderId).maybeSingle();
  if (!order || order.user_id !== user.id) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  if (order.payment_status === 'paid' || order.status === 'cancelled') return NextResponse.json({ error: 'This order cannot be paid.' }, { status: 409 });
  try {
    const { url } = await startPayment(order, parsed.data.provider);
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Payment could not be started.' }, { status: 502 });
  }
}
