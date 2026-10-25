import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type { CartLine } from '@/lib/types';

export interface PricedLine {
  productId: string; variantId: string | null; slug: string; name: string; variantName: string | null;
  imageUrl: string | null; unitCents: number; quantity: number; lineCents: number; inStock: boolean; maxQty: number;
}
export interface Pricing {
  currency: string;
  lines: PricedLine[];
  subtotalCents: number;
  discountCents: number;
  discountCode: string | null;
  discountError: string | null;
  shippingCents: number;
  shippingMethodId: string | null;
  taxCents: number;
  totalCents: number;
  freeShippingRemainingCents: number | null;
  shippingMethods: { id: string; name: string; description: string | null; price_cents: number; free_over_cents: number | null; estimated_days_min: number | null; estimated_days_max: number | null }[];
  issues: string[];
}

/**
 * The ONLY place order totals are computed. The browser sends product ids and quantities;
 * prices, discounts, shipping and tax always come from the database.
 */
export async function priceCart(input: { lines: CartLine[]; discountCode?: string | null; shippingMethodId?: string | null }): Promise<Pricing> {
  const db = createAdminClient();
  const issues: string[] = [];
  const merged = new Map<string, CartLine>();
  for (const l of input.lines.slice(0, 50)) {
    const k = `${l.productId}:${l.variantId ?? ''}`;
    const prev = merged.get(k);
    merged.set(k, { productId: l.productId, variantId: l.variantId ?? null, quantity: Math.min(99, (prev?.quantity ?? 0) + Math.max(1, Math.floor(l.quantity))) });
  }
  const lines = [...merged.values()];
  const ids = [...new Set(lines.map((l) => l.productId))];

  const [{ data: products, error: productsErr }, { data: variants, error: variantsErr }, { data: settings }, { data: methods }] = await Promise.all([
    ids.length ? db.from('products').select('id,slug,name,price_cents,sale_price_cents,currency,stock_quantity,track_inventory,is_active,product_images(url,sort_order)').in('id', ids) : Promise.resolve({ data: [] as never[], error: null }),
    ids.length ? db.from('product_variants').select('id,product_id,name,price_cents,stock_quantity,is_active').in('product_id', ids) : Promise.resolve({ data: [] as never[], error: null }),
    db.from('site_settings').select('key,value').eq('key', 'store'),
    db.from('shipping_methods').select('id,name,description,price_cents,free_over_cents,estimated_days_min,estimated_days_max').eq('is_active', true).order('sort_order'),
  ]);
  // A failed lookup must never look like "item no longer available" (that silently empties the cart).
  if (productsErr || variantsErr) throw new Error(`Could not load cart products: ${(productsErr ?? variantsErr)!.message}`);
  const store = (settings?.[0]?.value ?? {}) as { currency?: string; tax_percent?: number };
  const currency = store.currency || 'USD';

  const priced: PricedLine[] = [];
  for (const l of lines) {
    const p = (products ?? []).find((x) => x.id === l.productId);
    if (!p || !p.is_active) { issues.push('An item in your cart is no longer available and was removed.'); continue; }
    const v = l.variantId ? (variants ?? []).find((x) => x.id === l.variantId && x.product_id === p.id && x.is_active) : null;
    if (l.variantId && !v) { issues.push(`${p.name}: that option is no longer available.`); continue; }
    const unit = v?.price_cents ?? p.sale_price_cents ?? p.price_cents;
    const stock = v ? v.stock_quantity : p.stock_quantity;
    const tracked = p.track_inventory;
    const maxQty = tracked ? Math.max(stock, 0) : 99;
    const qty = Math.min(l.quantity, Math.max(maxQty, 0));
    if (tracked && stock <= 0) { issues.push(`${p.name} is sold out.`); }
    else if (qty < l.quantity) issues.push(`Only ${qty} of ${p.name} available — quantity adjusted.`);
    const img = [...(p.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0]?.url ?? null;
    priced.push({
      productId: p.id, variantId: v?.id ?? null, slug: p.slug, name: p.name, variantName: v?.name ?? null, imageUrl: img,
      unitCents: unit, quantity: qty, lineCents: unit * qty, inStock: !(tracked && stock <= 0), maxQty,
    });
  }
  const buyable = priced.filter((l) => l.inStock && l.quantity > 0);
  const subtotal = buyable.reduce((n, l) => n + l.lineCents, 0);

  // Discount code
  let discount = 0; let code: string | null = null; let discountError: string | null = null;
  if (input.discountCode?.trim()) {
    const { data: dc } = await db.from('discount_codes').select('*').eq('code', input.discountCode.trim()).maybeSingle();
    const now = Date.now();
    if (!dc || !dc.is_active) discountError = 'That code is not valid.';
    else if (dc.starts_at && new Date(dc.starts_at).getTime() > now) discountError = 'That code is not active yet.';
    else if (dc.expires_at && new Date(dc.expires_at).getTime() < now) discountError = 'That code has expired.';
    else if (dc.max_uses != null && dc.used_count >= dc.max_uses) discountError = 'That code has been fully redeemed.';
    else if (subtotal < dc.min_subtotal_cents) discountError = `Spend ${(dc.min_subtotal_cents / 100).toFixed(2)} or more to use this code.`;
    else {
      discount = dc.percent_off ? Math.round((subtotal * dc.percent_off) / 100) : Math.min(dc.amount_off_cents ?? 0, subtotal);
      code = dc.code as string;
    }
  }
  const afterDiscount = Math.max(subtotal - discount, 0);

  // Shipping
  const methodList = methods ?? [];
  const chosen = methodList.find((m) => m.id === input.shippingMethodId) ?? methodList[0] ?? null;
  const free = chosen?.free_over_cents != null && afterDiscount >= chosen.free_over_cents;
  const shipping = buyable.length === 0 || !chosen ? 0 : free ? 0 : chosen.price_cents;
  const remaining = chosen?.free_over_cents != null && !free && buyable.length ? chosen.free_over_cents - afterDiscount : null;

  const tax = Math.round((afterDiscount * Math.max(0, Number(store.tax_percent ?? 0))) / 100);

  return {
    currency, lines: priced, subtotalCents: subtotal, discountCents: discount, discountCode: code, discountError,
    shippingCents: shipping, shippingMethodId: chosen?.id ?? null, taxCents: tax,
    totalCents: afterDiscount + shipping + tax, freeShippingRemainingCents: remaining, shippingMethods: methodList, issues,
  };
}
