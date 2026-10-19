import Link from 'next/link';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { ClearCart } from '@/components/ClearCart';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyAndSettle } from '@/lib/payments/flow';
import { rateLimit } from '@/lib/rate-limit';

export const metadata = { title: 'Payment status', robots: { index: false } };
export const dynamic = 'force-dynamic';

// The query string (status=success, etc.) is IGNORED. We only use it to find our own payment reference,
// then ask the payment provider server-to-server what really happened.
export default async function VerifyPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { userId } = await requireUser('/dashboard/orders');
  const reference = sp.reference || sp.trxref || sp.tx_ref;
  let state: 'paid' | 'failed' | 'pending' | 'unknown' = 'unknown';
  let orderNumber = '';
  let orderId = '';

  if (reference && (await rateLimit('verify', 30, 300, userId))) {
    const db = createAdminClient();
    const { data: pay } = await db.from('payments').select('order_id, orders(id,order_number,user_id)').eq('reference', reference).maybeSingle();
    const order = pay?.orders as unknown as { id: string; order_number: string; user_id: string } | null;
    if (order && order.user_id === userId) {
      const r = await verifyAndSettle(reference);
      state = r.state; orderNumber = order.order_number; orderId = order.id;
    }
  }

  const view = {
    paid: { icon: <CheckCircle2 className="h-12 w-12 text-green-600" />, title: 'Payment received — thank you!', text: `Order ${orderNumber} is confirmed. A receipt is on its way to your inbox.` },
    pending: { icon: <Clock className="h-12 w-12 text-amber-500" />, title: 'We are confirming your payment', text: 'Your bank has not finalised the payment yet. This page does not update by itself — refresh in a minute. We will email you the moment it clears.' },
    failed: { icon: <XCircle className="h-12 w-12 text-red-500" />, title: 'Payment did not go through', text: 'You have not been charged for a failed payment. You can try again from your order page.' },
    unknown: { icon: <XCircle className="h-12 w-12 text-muted" />, title: 'We could not find that payment', text: 'If you were charged, contact us with your order number and we will sort it out.' },
  }[state];

  return (
    <section className="container flex max-w-[560px] flex-col items-center py-20 text-center">
      {state === 'paid' && <ClearCart />}
      {view.icon}
      <h1 className="mt-5 text-[28px]">{view.title}</h1>
      <p className="mt-3 text-[14px] leading-7 text-muted">{view.text}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {orderId && <Link href={`/dashboard/orders/${orderId}`} className="btn btn-primary">View order</Link>}
        <Link href="/shop" className="btn btn-outline">Continue shopping</Link>
      </div>
    </section>
  );
}
