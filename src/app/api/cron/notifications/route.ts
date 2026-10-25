import { NextResponse, type NextRequest } from 'next/server';
import { cronGuard } from '@/lib/cron-auth';
import { sendEmail, siteUrl } from '@/lib/email/send';
import { renderNotification } from '@/lib/email/templates';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/* eslint-disable @typescript-eslint/no-explicit-any */
type Q = { id: string; event: string; to_email: string; audience: 'customer' | 'admin'; subject: string; payload: Record<string, any> };

/** The order.placed trigger fires before order_items exist, so order data is always re-read at send time. */
async function freshPayload(db: ReturnType<typeof createAdminClient>, q: Q) {
  const id = q.payload?.order_id;
  if (!id) return q.payload ?? {};
  const { data: o } = await db.from('orders').select('*, order_items(*)').eq('id', id).maybeSingle();
  if (!o) return q.payload;
  return {
    ...q.payload, order_number: o.order_number, status: o.status, payment_status: o.payment_status, currency: o.currency,
    subtotal_cents: o.subtotal_cents, discount_cents: o.discount_cents, shipping_cents: o.shipping_cents, tax_cents: o.tax_cents, total_cents: o.total_cents,
    tracking_number: o.tracking_number, tracking_url: o.tracking_url, carrier: o.carrier, shipping_address: o.shipping_address, customer_email: o.email,
    items: (o.order_items ?? []).map((i: any) => ({ name: i.name, variant: i.variant_name, quantity: i.quantity, unit_price_cents: i.unit_price_cents, line_total_cents: i.line_total_cents })),
  };
}

function linkFor(q: Q, p: Record<string, any>) {
  if (p.order_id) return q.audience === 'admin' ? `/admin/orders/${p.order_id}` : `/dashboard/orders/${p.order_id}`;
  if (q.event === 'review.created') return '/admin/reviews';
  if (q.event === 'contact.message') return '/admin/messages';
  if (q.event === 'customer.registered') return '/admin/customers';
  if (q.event === 'newsletter.subscribed') return '/admin/newsletter';
  return q.audience === 'admin' ? '/admin' : '/dashboard';
}

export async function GET(req: NextRequest) {
  const denied = cronGuard(req);
  if (denied) return denied;
  const db = createAdminClient();
  const started = Date.now();
  let sent = 0, failed = 0, claimed = 0;

  while (Date.now() - started < 45_000) {
    const { data, error } = await db.rpc('claim_notifications', { p_limit: 20 });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const batch = (data ?? []) as Q[];
    if (batch.length === 0) break;
    claimed += batch.length;
    for (const q of batch) {
      try {
        const payload = await freshPayload(db, q);
        const base = siteUrl();
        const unsub = payload.unsubscribe_token ? `${base}/unsubscribe?t=${payload.unsubscribe_token}` : undefined;
        const mail = renderNotification(q.event, q.audience, payload, q.subject, { siteUrl: base, unsubscribeUrl: unsub, link: linkFor(q, payload) });
        const { id } = await sendEmail({ to: q.to_email, ...mail, idempotencyKey: `notif-${q.id}` });
        await db.rpc('complete_notification', { p_id: q.id, p_ok: true, p_error: null, p_message_id: id });
        sent++;
      } catch (e) {
        failed++;
        await db.rpc('complete_notification', { p_id: q.id, p_ok: false, p_error: e instanceof Error ? e.message : 'send failed', p_message_id: null });
      }
      await new Promise((r) => setTimeout(r, 250)); // stay under the provider's rate limit
      if (Date.now() - started > 50_000) break;
    }
  }
  return NextResponse.json({ claimed, sent, failed });
}
