'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import type { ActionState } from '@/lib/action-types';
import { bool, cents, checks, csv, fail, int, json, ok, optStr, run, str } from '@/lib/admin-action';
import { createClient } from '@/lib/supabase/server';
import { slugify } from '@/lib/utils';

const Base = z.object({
  name: z.string().min(2, 'Enter a product name.').max(160),
  price: z.number({ message: 'Enter a valid price.' }).int().min(0),
});

export async function saveProductAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let createdId: string | null = null;
  const res = await run('products', async ({ userId }) => {
    const sb = await createClient();
    const id = str(fd, 'id');
    const price = cents(fd, 'price'); const sale = cents(fd, 'sale_price');
    const parsed = Base.safeParse({ name: str(fd, 'name'), price });
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the form.');
    if (sale !== null && sale > (price ?? 0)) return fail('The sale price cannot be higher than the regular price.');
    const row = {
      name: parsed.data.name, slug: slugify(str(fd, 'slug') || parsed.data.name),
      tagline: optStr(fd, 'tagline'), description: optStr(fd, 'description'), category_id: optStr(fd, 'category_id'),
      price_cents: parsed.data.price, sale_price_cents: sale, currency: (str(fd, 'currency') || 'USD').toUpperCase().slice(0, 3),
      sku: optStr(fd, 'sku'), low_stock_threshold: Math.max(0, int(fd, 'low_stock_threshold', 5)), track_inventory: bool(fd, 'track_inventory'),
      is_active: bool(fd, 'is_active'), is_featured: bool(fd, 'is_featured'), is_bestseller: bool(fd, 'is_bestseller'),
      tags: csv(fd, 'tags'), skin_types: checks(fd, 'skin_types'), concerns: checks(fd, 'concerns'), goals: checks(fd, 'goals'),
      routine_step: optStr(fd, 'routine_step'), routine_time: optStr(fd, 'routine_time'),
      is_vegan: bool(fd, 'is_vegan'), is_fragrance_free: bool(fd, 'is_fragrance_free'), sort_order: int(fd, 'sort_order', 0),
      updated_at: new Date().toISOString(),
    };
    const stock = Math.max(0, int(fd, 'stock_quantity', 0));
    let pid = id;
    if (id) {
      const { data: before } = await sb.from('products').select('stock_quantity').eq('id', id).single();
      const { error } = await sb.from('products').update({ ...row, stock_quantity: stock }).eq('id', id);
      if (error) return fail(error.code === '23505' ? 'That slug or SKU is already used by another product.' : error.message);
      if (before && before.stock_quantity !== stock) await sb.from('inventory_movements').insert({ product_id: id, delta: stock - before.stock_quantity, reason: 'adjustment', actor_id: userId });
    } else {
      const { data, error } = await sb.from('products').insert({ ...row, stock_quantity: stock }).select('id').single();
      if (error || !data) return fail(error?.code === '23505' ? 'That slug or SKU is already used by another product.' : error?.message ?? 'Could not create the product.');
      pid = data.id; createdId = data.id;
      if (stock > 0) await sb.from('inventory_movements').insert({ product_id: pid, delta: stock, reason: 'restock', actor_id: userId });
    }

    // Images: replace the gallery with the submitted list.
    const images = json<{ url: string; alt: string }[]>(fd, 'images', []).filter((i) => /^https?:\/\/|^\//.test(i.url));
    await sb.from('product_images').delete().eq('product_id', pid);
    if (images.length) await sb.from('product_images').insert(images.map((i, n) => ({ product_id: pid, url: i.url, alt: i.alt || row.name, sort_order: n })));

    // Variants: upsert submitted rows, remove the rest.
    const variants = json<{ id?: string; name: string; sku: string; price: string; stock: string }[]>(fd, 'variants', []).filter((v) => v.name.trim());
    const { data: existing } = await sb.from('product_variants').select('id').eq('product_id', pid);
    const keep = new Set(variants.map((v) => v.id).filter(Boolean));
    const drop = (existing ?? []).map((v) => v.id).filter((v) => !keep.has(v));
    if (drop.length) await sb.from('product_variants').delete().in('id', drop);
    for (const [n, v] of variants.entries()) {
      const vp = v.price.trim() === '' ? null : Math.round(Number(v.price) * 100);
      const vr = { product_id: pid, name: v.name.trim(), sku: v.sku.trim() || null, price_cents: vp !== null && Number.isFinite(vp) && vp >= 0 ? vp : null, stock_quantity: Math.max(0, parseInt(v.stock, 10) || 0), sort_order: n, is_active: true };
      const { error } = v.id ? await sb.from('product_variants').update(vr).eq('id', v.id) : await sb.from('product_variants').insert(vr);
      if (error) return fail(`Variant "${v.name}": ${error.code === '23505' ? 'SKU already in use.' : error.message}`);
    }
    revalidatePath('/shop'); revalidatePath('/'); revalidatePath(`/product/${row.slug}`); revalidatePath('/admin/products');
    return ok('Product saved.');
  });
  if (createdId) redirect(`/admin/products/${createdId}?created=1`);
  return res;
}

export async function deleteProductAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const res = await run('products', async () => {
    const { error } = await (await createClient()).from('products').delete().eq('id', str(fd, 'id'));
    if (error) return fail(error.message);
    revalidatePath('/shop'); revalidatePath('/admin/products');
    return ok('Product deleted.');
  });
  if (res?.ok) redirect('/admin/products');
  return res;
}

export async function toggleProductAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run('products', async () => {
    const field = str(fd, 'field');
    if (!['is_active', 'is_featured', 'is_bestseller'].includes(field)) return fail('Invalid field.');
    const { error } = await (await createClient()).from('products').update({ [field]: str(fd, 'value') === 'true', updated_at: new Date().toISOString() }).eq('id', str(fd, 'id'));
    if (error) return fail(error.message);
    revalidatePath('/shop'); revalidatePath('/'); revalidatePath('/admin/products');
    return ok('Updated.');
  });
}
