'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ActionState } from '@/lib/action-types';
import { bool, fail, int, ok, optStr, run, str } from '@/lib/admin-action';
import { createClient } from '@/lib/supabase/server';

const refresh = () => { revalidatePath('/', 'layout'); revalidatePath('/admin/settings'); };
const Url = z.string().trim().url().refine((u) => /^https?:\/\//i.test(u), 'Links must start with http:// or https://');
const lines = (fd: FormData, k: string) => str(fd, k).split('\n').map((s) => s.trim()).filter(Boolean);

async function merge(key: string, patch: Record<string, unknown>, isPublic = true) {
  const sb = await createClient();
  const { data } = await sb.from('site_settings').select('value').eq('key', key).maybeSingle();
  const { error } = await sb.from('site_settings').upsert({ key, value: { ...(data?.value as object ?? {}), ...patch }, is_public: isPublic, updated_at: new Date().toISOString() });
  return error;
}

export async function saveSettingsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run('super', async () => {
    const section = str(fd, 'section');
    let err;
    if (section === 'business') {
      const email = z.string().email().safeParse(str(fd, 'email'));
      if (!str(fd, 'name') || !email.success) return fail('Enter a business name and a valid contact email.');
      const map = optStr(fd, 'map_url');
      if (map && !Url.safeParse(map).success) return fail('The map link must be a valid http(s) URL.');
      err = await merge('business', { name: str(fd, 'name'), tagline: str(fd, 'tagline'), email: email.data, phone: str(fd, 'phone'), address_lines: lines(fd, 'address_lines'), hours: lines(fd, 'hours'), map_url: map ?? '', support_note: str(fd, 'support_note') });
    } else if (section === 'branding') {
      err = await merge('branding', { logo_url: optStr(fd, 'logo_url'), favicon_url: optStr(fd, 'favicon_url') });
    } else if (section === 'store') {
      const tax = Number(str(fd, 'tax_percent') || 0);
      if (!Number.isFinite(tax) || tax < 0 || tax > 100) return fail('Tax must be between 0 and 100.');
      err = await merge('store', { currency: (str(fd, 'currency') || 'USD').toUpperCase().slice(0, 3), tax_percent: tax, maintenance_mode: bool(fd, 'maintenance_mode'), low_stock_default: Math.max(0, int(fd, 'low_stock_default', 5)), newsletter_discount: str(fd, 'newsletter_discount') });
    } else if (section === 'seo') {
      err = await merge('seo', { title: str(fd, 'title'), description: str(fd, 'description'), analytics_id: str(fd, 'analytics_id').replace(/[^A-Za-z0-9-]/g, '') });
    } else if (section === 'recipients') {
      const list = lines(fd, 'emails').map((e) => e.toLowerCase());
      if (list.some((e) => !z.string().email().safeParse(e).success)) return fail('One of the addresses is not a valid email.');
      const sb = await createClient();
      err = (await sb.from('site_settings').upsert({ key: 'notification_recipients', value: Array.from(new Set(list)), is_public: false, updated_at: new Date().toISOString() })).error;
    } else return fail('Unknown settings section.');
    if (err) return fail(err.message);
    refresh();
    return ok('Settings saved.');
  });
}

export async function saveSocialAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run('super', async () => {
    const url = Url.safeParse(str(fd, 'url'));
    const platform = str(fd, 'platform');
    if (!['instagram', 'facebook', 'tiktok', 'pinterest', 'youtube', 'x'].includes(platform)) return fail('Choose a platform.');
    if (!url.success) return fail(url.error.issues[0].message);
    const row = { platform, url: url.data, sort_order: int(fd, 'sort_order', 0), is_active: bool(fd, 'is_active') };
    const sb = await createClient(); const id = str(fd, 'id');
    const { error } = id ? await sb.from('social_links').update(row).eq('id', id) : await sb.from('social_links').insert(row);
    if (error) return fail(error.message);
    refresh();
    return ok(id ? 'Link saved.' : 'Link added.');
  });
}
export async function deleteSocialAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run('super', async () => {
    const { error } = await (await createClient()).from('social_links').delete().eq('id', str(fd, 'id'));
    if (error) return fail(error.message);
    refresh();
    return ok('Removed.');
  });
}

/* Coupons & shipping */
export async function saveCouponAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run('super', async () => {
    const code = str(fd, 'code').toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    if (code.length < 3) return fail('Codes need at least 3 letters or numbers.');
    const kind = str(fd, 'kind'); const val = Number(str(fd, 'value'));
    if (!Number.isFinite(val) || val <= 0) return fail('Enter a discount value above zero.');
    if (kind === 'percent' && val > 100) return fail('A percentage cannot exceed 100.');
    const date = (k: string) => { const v = str(fd, k); return v ? new Date(v).toISOString() : null; };
    const row = {
      code, description: optStr(fd, 'description'), percent_off: kind === 'percent' ? Math.round(val) : null, amount_off_cents: kind === 'amount' ? Math.round(val * 100) : null,
      min_subtotal_cents: Math.round(Number(str(fd, 'min_subtotal') || 0) * 100), max_uses: str(fd, 'max_uses') ? int(fd, 'max_uses') : null,
      starts_at: date('starts_at'), expires_at: date('expires_at'), is_active: bool(fd, 'is_active'),
    };
    const sb = await createClient(); const id = str(fd, 'id');
    const { error } = id ? await sb.from('discount_codes').update(row).eq('id', id) : await sb.from('discount_codes').insert(row);
    if (error) return fail(error.code === '23505' ? 'That code already exists.' : error.message);
    revalidatePath('/admin/coupons');
    return ok(id ? 'Coupon saved.' : 'Coupon created.');
  });
}
export async function deleteCouponAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run('super', async () => {
    const { error } = await (await createClient()).from('discount_codes').delete().eq('id', str(fd, 'id'));
    if (error) return fail(error.message);
    revalidatePath('/admin/coupons');
    return ok('Coupon deleted.');
  });
}
export async function saveShippingAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run('super', async () => {
    const name = str(fd, 'name');
    if (name.length < 2) return fail('Enter a name.');
    const money = (k: string) => { const v = str(fd, k); return v === '' ? null : Math.round(Number(v) * 100); };
    const row = { name, description: optStr(fd, 'description'), price_cents: money('price') ?? 0, free_over_cents: money('free_over'), estimated_days_min: str(fd, 'days_min') ? int(fd, 'days_min') : null, estimated_days_max: str(fd, 'days_max') ? int(fd, 'days_max') : null, is_active: bool(fd, 'is_active'), sort_order: int(fd, 'sort_order', 0) };
    if ([row.price_cents, row.free_over_cents ?? 0].some((n) => !Number.isFinite(n) || n < 0)) return fail('Amounts must be zero or more.');
    const sb = await createClient(); const id = str(fd, 'id');
    const { error } = id ? await sb.from('shipping_methods').update(row).eq('id', id) : await sb.from('shipping_methods').insert(row);
    if (error) return fail(error.message);
    revalidatePath('/admin/coupons'); revalidatePath('/checkout');
    return ok(id ? 'Shipping method saved.' : 'Shipping method added.');
  });
}
export async function deleteShippingAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run('super', async () => {
    const { error } = await (await createClient()).from('shipping_methods').delete().eq('id', str(fd, 'id'));
    if (error) return fail('This method is used by existing orders — deactivate it instead.');
    revalidatePath('/admin/coupons');
    return ok('Deleted.');
  });
}
