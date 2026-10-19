import 'server-only';
import { randomBytes } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { gateways } from './index';
import { getGateway, type Provider } from './credentials';

const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

/** Creates a payment attempt for an order and asks the provider for a hosted checkout URL. */
export async function startPayment(order: { id: string; order_number: string; email: string; total_cents: number; currency: string }, provider: Provider, customerName?: string) {
  const db = createAdminClient();
  const g = await getGateway(provider);
  if (!g.enabled || !g.secret) throw new Error('This payment method is not available right now.');

  const reference = `${order.order_number}-${randomBytes(5).toString('hex')}`;
  const { error } = await db.from('payments').insert({
    order_id: order.id, provider, reference, amount_cents: order.total_cents, currency: order.currency, status: 'pending',
  });
  if (error) throw new Error('Could not record the payment attempt.');

  try {
    const init = await gateways[provider].init(g, {
      reference, email: order.email, amountCents: order.total_cents, currency: order.currency,
      callbackUrl: `${siteUrl()}/checkout/verify?provider=${provider}`, orderNumber: order.order_number, name: customerName,
    } as never);
    // Moving the order to "payment pending" is what triggers the payment-pending notifications.
    await db.from('orders').update({ payment_status: 'pending' }).eq('id', order.id).neq('payment_status', 'paid');
    return { url: init.url, reference };
  } catch (e) {
    await db.rpc('fail_payment', { p_reference: reference, p_reason: e instanceof Error ? e.message : 'init_failed' });
    throw e;
  }
}

/**
 * Asks the provider (server-to-server, with the secret key) what really happened to this payment,
 * then settles or fails it atomically in the database. Safe to call repeatedly (idempotent).
 * This is the ONLY way an order can become "paid".
 */
export async function verifyAndSettle(reference: string): Promise<{ state: 'paid' | 'failed' | 'pending' | 'unknown'; orderId?: string; reason?: string }> {
  const db = createAdminClient();
  const { data: pay } = await db.from('payments').select('id,order_id,provider,status,reference').eq('reference', reference).maybeSingle();
  if (!pay) return { state: 'unknown' };
  if (pay.status === 'paid') return { state: 'paid', orderId: pay.order_id };

  const provider = pay.provider as Provider;
  const g = await getGateway(provider);
  if (!g.secret) return { state: 'pending', orderId: pay.order_id, reason: 'gateway_not_configured' };

  const v = await gateways[provider].verify(g, reference);
  if (v.status === 'success') {
    const { data } = await db.rpc('settle_payment', { p_reference: reference, p_amount_cents: v.amountCents, p_currency: v.currency, p_provider_reference: v.providerRef });
    if (data?.ok) return { state: 'paid', orderId: pay.order_id };
    return { state: 'failed', orderId: pay.order_id, reason: data?.reason };
  }
  if (v.status === 'failed') {
    await db.rpc('fail_payment', { p_reference: reference, p_reason: v.reason || 'declined' });
    return { state: 'failed', orderId: pay.order_id, reason: v.reason };
  }
  return { state: 'pending', orderId: pay.order_id };
}

/** Stores the raw webhook once (unique provider+event id), so replays are ignored. Returns false for duplicates. */
export async function recordWebhook(provider: Provider, eventId: string, eventType: string, payload: unknown, signatureValid: boolean) {
  const db = createAdminClient();
  const { error } = await db.from('payment_transactions').insert({ provider, event_id: eventId, event_type: eventType, payload, signature_valid: signatureValid, processed_at: signatureValid ? new Date().toISOString() : null });
  return !error; // unique violation → already processed
}

/** Lets the provider retry a webhook we could not finish (transient error or payment not final yet). */
export async function forgetWebhook(provider: Provider, eventId: string) {
  await createAdminClient().from('payment_transactions').delete().eq('provider', provider).eq('event_id', eventId);
}
