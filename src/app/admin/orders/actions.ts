'use server';
import { revalidatePath } from 'next/cache';
import type { ActionState } from '@/lib/action-types';
import { fail, int, ok, optStr, run, str } from '@/lib/admin-action';
import { logAudit } from '@/lib/audit';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getGateway, type Provider } from '@/lib/payments/credentials';
import { gateways } from '@/lib/payments';
import { ORDER_STATUSES } from '@/lib/types';

const touch = (id: string) => { revalidatePath('/admin/orders'); revalidatePath(`/admin/orders/${id}`); revalidatePath(`/dashboard/orders/${id}`); };

/** Status / tracking updates go through the admin's own session so RLS and the audit trigger record who did it. */
export async function updateOrderAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run('orders', async () => {
    const id = str(fd, 'id'); const status = str(fd, 'status');
    if (!(ORDER_STATUSES as readonly string[]).includes(status)) return fail('Invalid status.');
    const sb = await createClient();
    const { data: cur } = await sb.from('orders').select('status,payment_status').eq('id', id).single();
    if (!cur) return fail('Order not found.');
    if (['shipped', 'delivered'].includes(status) && cur.payment_status !== 'paid') return fail('This order has not been paid, so it cannot be shipped or delivered.');
    if (status === 'refunded') return fail('Use the Refund button to refund an order — it contacts the payment provider.');
    const tracking = optStr(fd, 'tracking_number'); const url = optStr(fd, 'tracking_url');
    if (url && !/^https?:\/\//i.test(url)) return fail('Tracking link must start with http:// or https://');
    const { error } = await sb.from('orders').update({ status, tracking_number: tracking, tracking_url: url, carrier: optStr(fd, 'carrier'), notes: optStr(fd, 'notes') }).eq('id', id);
    if (error) return fail(error.message);
    touch(id);
    return ok('Order updated.');
  });
}

export async function handleRequestAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run('orders', async ({ userId }) => {
    const id = str(fd, 'id'); const decision = str(fd, 'decision');
    if (!['approved', 'rejected', 'completed'].includes(decision)) return fail('Invalid decision.');
    const sb = await createClient();
    const { data: r } = await sb.from('order_requests').select('id,order_id,kind,status').eq('id', id).single();
    if (!r) return fail('Request not found.');
    const { error } = await sb.from('order_requests').update({ status: decision, admin_note: optStr(fd, 'admin_note'), handled_by: userId, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) return fail(error.message);
    if (r.kind === 'cancellation' && decision === 'approved') {
      const { data: o } = await sb.from('orders').select('status').eq('id', r.order_id).single();
      if (o && ['pending', 'confirmed', 'processing'].includes(o.status)) await sb.from('orders').update({ status: 'cancelled' }).eq('id', r.order_id);
    }
    touch(r.order_id);
    return ok(decision === 'approved' ? 'Request approved. If the order was paid, issue the refund below.' : 'Request updated.');
  });
}

/** Refunds go to the provider first; the order is only marked refunded after the provider accepts it. */
export async function refundOrderAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run('orders', async ({ profile }) => {
    const orderId = str(fd, 'id');
    const db = createAdminClient();
    const { data: pay } = await db.from('payments').select('*').eq('order_id', orderId).eq('status', 'paid').order('created_at', { ascending: false }).limit(1).maybeSingle();
    const { data: order } = await db.from('orders').select('id,order_number,total_cents,status').eq('id', orderId).single();
    if (!pay || !order) return fail('No paid payment found for this order.');
    const remaining = pay.amount_cents - pay.refunded_cents;
    const amount = fd.get('amount') ? Math.round(Number(str(fd, 'amount')) * 100) : remaining;
    if (!Number.isFinite(amount) || amount <= 0 || amount > remaining) return fail(`Enter an amount up to ${(remaining / 100).toFixed(2)}.`);
    const provider = pay.provider as Provider;
    const g = await getGateway(provider);
    if (!g.secret) return fail('Payment gateway credentials are not configured.');
    try {
      await gateways[provider].refund(g, provider === 'paystack' ? pay.reference : pay.provider_reference ?? '', amount);
    } catch (e) {
      await logAudit(profile, 'order.refund_failed', 'orders', orderId, { after: { amount, error: e instanceof Error ? e.message : 'unknown' } });
      return fail(e instanceof Error ? e.message : 'The provider rejected the refund.');
    }
    const refunded = pay.refunded_cents + amount; const full = refunded >= pay.amount_cents;
    await db.from('payments').update({ refunded_cents: refunded, status: full ? 'refunded' : 'partially_refunded', updated_at: new Date().toISOString() }).eq('id', pay.id);
    await db.from('orders').update(full ? { payment_status: 'refunded', status: 'refunded' } : { payment_status: 'partially_refunded' }).eq('id', orderId);
    await logAudit(profile, 'order.refund', 'orders', orderId, { before: { refunded_cents: pay.refunded_cents }, after: { refunded_cents: refunded, amount, provider, order: order.order_number } });
    touch(orderId);
    return ok(`Refunded ${(amount / 100).toFixed(2)} via ${provider}.`);
  });
}
void int;
