'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getSessionProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ActionState } from '@/lib/action-types';

async function me() {
  const s = await getSessionProfile();
  if (!s) throw new Error('Please sign in again.');
  return s;
}
const fail = (message: string): ActionState => ({ ok: false, message });
const ok = (message: string): ActionState => ({ ok: true, message });

/* ── Orders: cancellation / return requests ── */
const ReqSchema = z.object({ orderId: z.string().uuid(), kind: z.enum(['cancellation', 'return', 'refund']), reason: z.string().trim().min(5, 'Please tell us a little more.').max(1000) });

export async function requestOrderAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { userId } = await me();
    const p = ReqSchema.safeParse(Object.fromEntries(fd));
    if (!p.success) return fail(p.error.issues[0]?.message ?? 'Invalid request.');
    const sb = await createClient();
    const { data: o } = await sb.from('orders').select('id,status,payment_status,delivered_at,user_id').eq('id', p.data.orderId).maybeSingle();
    if (!o || o.user_id !== userId) return fail('Order not found.');

    if (p.data.kind === 'cancellation') {
      if (!['pending', 'confirmed', 'processing'].includes(o.status)) return fail('This order has already shipped or closed, so it can no longer be cancelled.');
      if (o.payment_status !== 'paid') {
        // Nothing was charged: cancel straight away.
        const { error } = await createAdminClient().from('orders').update({ status: 'cancelled' }).eq('id', o.id).neq('payment_status', 'paid');
        if (error) return fail('Could not cancel the order.');
        revalidatePath('/dashboard/orders'); revalidatePath(`/dashboard/orders/${o.id}`);
        return ok('Your order has been cancelled.');
      }
    }
    if (p.data.kind === 'return') {
      if (o.status !== 'delivered' || !o.delivered_at) return fail('Returns can be requested once the order is delivered.');
      if (Date.now() - new Date(o.delivered_at).getTime() > 30 * 86400_000) return fail('The 30-day return window for this order has passed.');
    }
    if (p.data.kind === 'refund' && !(o.payment_status === 'paid' && ['cancelled', 'delivered'].includes(o.status))) return fail('A refund can be requested for paid orders that were cancelled or delivered.');

    const { error } = await sb.from('order_requests').insert({ order_id: o.id, user_id: userId, kind: p.data.kind, reason: p.data.reason });
    if (error) return fail(error.code === '23505' ? 'You already have an open request of this kind for this order.' : 'Could not submit your request.');
    revalidatePath(`/dashboard/orders/${o.id}`);
    return ok('Request received. We will email you as soon as it is reviewed.');
  } catch (e) { return fail(e instanceof Error ? e.message : 'Something went wrong.'); }
}

/* ── Profile ── */
const ProfileSchema = z.object({ full_name: z.string().trim().max(120), phone: z.string().trim().max(30), avatar_url: z.string().url().max(500).or(z.literal('')) });
export async function updateProfileAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { userId } = await me();
    const p = ProfileSchema.safeParse(Object.fromEntries(fd));
    if (!p.success) return fail('Please check your details.');
    const sb = await createClient();
    const { error } = await sb.from('profiles').update({ full_name: p.data.full_name || null, phone: p.data.phone || null, avatar_url: p.data.avatar_url || null }).eq('id', userId);
    if (error) return fail('Could not save your profile.');
    revalidatePath('/dashboard', 'layout');
    return ok('Profile updated.');
  } catch (e) { return fail(e instanceof Error ? e.message : 'Something went wrong.'); }
}

/* ── Addresses ── */
const AddrSchema = z.object({
  label: z.string().trim().max(40).optional().default(''),
  full_name: z.string().trim().min(1).max(120), phone: z.string().trim().max(30).optional().default(''),
  line1: z.string().trim().min(3).max(200), line2: z.string().trim().max(200).optional().default(''),
  city: z.string().trim().min(1).max(100), state: z.string().trim().max(100).optional().default(''),
  postal_code: z.string().trim().max(20).optional().default(''), country: z.string().trim().length(2).toUpperCase(),
});
export async function addAddressAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { userId } = await me();
    const p = AddrSchema.safeParse(Object.fromEntries(fd));
    if (!p.success) return fail('Please complete the required address fields (country as a 2-letter code, e.g. NG).');
    const sb = await createClient();
    const { count } = await sb.from('addresses').select('id', { count: 'exact', head: true }).eq('user_id', userId);
    if ((count ?? 0) >= 10) return fail('You can save up to 10 addresses.');
    const first = (count ?? 0) === 0;
    const { error } = await sb.from('addresses').insert({ ...p.data, user_id: userId, is_default_shipping: first, is_default_billing: first });
    if (error) return fail('Could not save the address.');
    revalidatePath('/dashboard/profile');
    return ok('Address saved.');
  } catch (e) { return fail(e instanceof Error ? e.message : 'Something went wrong.'); }
}
export async function deleteAddressAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { userId } = await me();
    const id = z.string().uuid().parse(fd.get('id'));
    const { error } = await (await createClient()).from('addresses').delete().eq('id', id).eq('user_id', userId);
    if (error) return fail('Could not remove the address.');
    revalidatePath('/dashboard/profile');
    return ok('Address removed.');
  } catch (e) { return fail(e instanceof Error ? e.message : 'Something went wrong.'); }
}
export async function setDefaultAddressAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { userId } = await me();
    const id = z.string().uuid().parse(fd.get('id'));
    const kind = z.enum(['shipping', 'billing']).parse(fd.get('kind'));
    const col = kind === 'shipping' ? 'is_default_shipping' : 'is_default_billing';
    const sb = await createClient();
    await sb.from('addresses').update({ [col]: false }).eq('user_id', userId);
    const { error } = await sb.from('addresses').update({ [col]: true }).eq('id', id).eq('user_id', userId);
    if (error) return fail('Could not update the default address.');
    revalidatePath('/dashboard/profile');
    return ok(`Default ${kind} address updated.`);
  } catch (e) { return fail(e instanceof Error ? e.message : 'Something went wrong.'); }
}

/* ── Newsletter preferences ── */
export async function setNewsletterAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { userId, profile } = await me();
    const on = fd.get('subscribe') === 'on';
    const db = createAdminClient();
    if (on) {
      const { data } = await db.rpc('subscribe_email', { p_email: profile.email, p_user: userId, p_source: 'dashboard' });
      if (data && data.ok === false) return fail('This address is on our suppression list. Contact support to resubscribe.');
    } else {
      await db.from('newsletter_subscribers').update({ status: 'unsubscribed', unsubscribed_at: new Date().toISOString() }).eq('email', profile.email).neq('status', 'suppressed');
    }
    await (await createClient()).from('profiles').update({ marketing_opt_in: on }).eq('id', userId);
    revalidatePath('/dashboard/newsletter');
    return ok(on ? 'You are subscribed to marketing emails.' : 'You have been unsubscribed. Order updates will still be sent.');
  } catch (e) { return fail(e instanceof Error ? e.message : 'Something went wrong.'); }
}
