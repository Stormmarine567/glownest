import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActionForm } from '@/components/dashboard/ActionForm';
import { ImageListEditor } from '@/components/dashboard/ImageListEditor';
import { VariantsEditor } from '@/components/dashboard/VariantsEditor';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { deleteProductAction, saveProductAction } from '../actions';

export const metadata = { title: 'Edit product' };
export const dynamic = 'force-dynamic';

const SKIN = ['dry', 'oily', 'combination', 'sensitive', 'normal'];
const CONCERNS = ['acne', 'aging', 'dullness', 'dehydration', 'dark_spots', 'redness'];
const GOALS = ['hydrate', 'brighten', 'protect', 'clear', 'firm'];

function Checks({ name, options, value }: { name: string; options: string[]; value: string[] }) {
  return <div className="flex flex-wrap gap-2">{options.map((o) => <label key={o} className="flex cursor-pointer items-center gap-2 rounded-full border border-line px-3 py-1.5 text-[12px] capitalize"><input type="checkbox" name={name} value={o} defaultChecked={value.includes(o)} />{o.replace('_', ' ')}</label>)}</div>;
}

export default async function ProductEditor({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  await requireAdmin('products');
  const { id } = await params; const { created } = await searchParams;
  const sb = await createClient();
  const isNew = id === 'new';
  const [{ data: cats }, pr] = await Promise.all([
    sb.from('categories').select('id,name').order('sort_order'),
    isNew ? null : sb.from('products').select('*, product_images(url,alt,sort_order), product_variants(id,name,sku,price_cents,stock_quantity,sort_order)').eq('id', id).maybeSingle(),
  ]);
  const p = pr?.data;
  if (!isNew && !p) notFound();
  const money = (c: number | null | undefined) => (c == null ? '' : (c / 100).toFixed(2));
  const imgs = [...(p?.product_images ?? [])].sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order).map((i: { url: string; alt: string | null }) => ({ url: i.url, alt: i.alt ?? '' }));
  const variants = [...(p?.product_variants ?? [])].sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order).map((v: { id: string; name: string; sku: string | null; price_cents: number | null; stock_quantity: number }) => ({ id: v.id, name: v.name, sku: v.sku ?? '', price: money(v.price_cents), stock: String(v.stock_quantity) }));
  const sec = 'rounded-2xl bg-white p-5 shadow-soft md:p-6';
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h2 className="text-[26px]">{isNew ? 'New product' : p!.name}</h2><Link href="/admin/products" className="text-[13px] underline">← All products</Link></div>
      {created && <p role="status" className="rounded-xl bg-green-50 p-3 text-[13px] text-green-800">Product created.</p>}
      <ActionForm action={saveProductAction} submit="Save product" className="space-y-6">
        <input type="hidden" name="id" value={isNew ? '' : id} />
        <section className={sec}><h3 className="text-[18px]">Basics</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div><label className="label" htmlFor="name">Name</label><input id="name" name="name" required defaultValue={p?.name} className="input" /></div>
            <div><label className="label" htmlFor="slug">URL slug</label><input id="slug" name="slug" defaultValue={p?.slug} placeholder="auto from name" className="input" /></div>
            <div><label className="label" htmlFor="tagline">Tagline</label><input id="tagline" name="tagline" defaultValue={p?.tagline ?? ''} className="input" /></div>
            <div><label className="label" htmlFor="category_id">Category</label><select id="category_id" name="category_id" defaultValue={p?.category_id ?? ''} className="input"><option value="">None</option>{(cats ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div className="md:col-span-2"><label className="label" htmlFor="description">Description</label><textarea id="description" name="description" defaultValue={p?.description ?? ''} className="textarea min-h-[120px]" /></div>
            <div><label className="label" htmlFor="tags">Tags (comma separated)</label><input id="tags" name="tags" defaultValue={(p?.tags ?? []).join(', ')} className="input" /></div>
          </div></section>
        <section className={sec}><h3 className="text-[18px]">Pricing & inventory</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div><label className="label" htmlFor="price">Price</label><input id="price" name="price" required inputMode="decimal" defaultValue={money(p?.price_cents)} className="input" /></div>
            <div><label className="label" htmlFor="sale_price">Sale price</label><input id="sale_price" name="sale_price" inputMode="decimal" defaultValue={money(p?.sale_price_cents)} className="input" /></div>
            <div><label className="label" htmlFor="currency">Currency</label><input id="currency" name="currency" maxLength={3} defaultValue={p?.currency ?? 'USD'} className="input uppercase" /></div>
            <div><label className="label" htmlFor="sku">SKU</label><input id="sku" name="sku" defaultValue={p?.sku ?? ''} className="input" /></div>
            <div><label className="label" htmlFor="stock_quantity">Stock quantity</label><input id="stock_quantity" name="stock_quantity" inputMode="numeric" defaultValue={p?.stock_quantity ?? 0} className="input" /></div>
            <div><label className="label" htmlFor="low_stock_threshold">Low-stock alert at</label><input id="low_stock_threshold" name="low_stock_threshold" inputMode="numeric" defaultValue={p?.low_stock_threshold ?? 5} className="input" /></div>
          </div>
          <label className="mt-4 flex items-center gap-2 text-[13px]"><input type="checkbox" name="track_inventory" defaultChecked={p?.track_inventory ?? true} />Track inventory</label>
          <h4 className="mt-6 text-[15px] font-bold">Variants</h4><div className="mt-2"><VariantsEditor name="variants" initial={variants} /></div></section>
        <section className={sec}><h3 className="text-[18px]">Images</h3><div className="mt-4"><ImageListEditor name="images" folder="products" initial={imgs} /></div></section>
        <section className={sec}><h3 className="text-[18px]">Visibility</h3>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
            <label className="flex items-center gap-2"><input type="checkbox" name="is_active" defaultChecked={p?.is_active ?? true} />Visible in shop</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="is_featured" defaultChecked={p?.is_featured} />Featured on home</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="is_bestseller" defaultChecked={p?.is_bestseller} />Bestseller</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="is_vegan" defaultChecked={p?.is_vegan ?? true} />Vegan</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="is_fragrance_free" defaultChecked={p?.is_fragrance_free} />Fragrance free</label>
          </div>
          <div className="mt-4 max-w-[160px]"><label className="label" htmlFor="sort_order">Sort order</label><input id="sort_order" name="sort_order" inputMode="numeric" defaultValue={p?.sort_order ?? 0} className="input" /></div></section>
        <section className={sec}><h3 className="text-[18px]">Skincare quiz matching</h3><p className="mt-1 text-[12px] text-muted">These attributes decide when the quiz recommends this product.</p>
          <div className="mt-4 space-y-4">
            <div><span className="label">Skin types</span><Checks name="skin_types" options={SKIN} value={p?.skin_types ?? []} /></div>
            <div><span className="label">Concerns</span><Checks name="concerns" options={CONCERNS} value={p?.concerns ?? []} /></div>
            <div><span className="label">Goals</span><Checks name="goals" options={GOALS} value={p?.goals ?? []} /></div>
            <div className="grid gap-4 md:grid-cols-2">
              <div><label className="label" htmlFor="routine_step">Routine step</label><select id="routine_step" name="routine_step" defaultValue={p?.routine_step ?? ''} className="input"><option value="">—</option>{['cleanse', 'treat', 'moisturize', 'protect'].map((s) => <option key={s}>{s}</option>)}</select></div>
              <div><label className="label" htmlFor="routine_time">Time of day</label><select id="routine_time" name="routine_time" defaultValue={p?.routine_time ?? ''} className="input"><option value="">—</option>{['am', 'pm', 'both'].map((s) => <option key={s}>{s}</option>)}</select></div>
            </div></div></section>
      </ActionForm>
      {!isNew && <ActionForm action={deleteProductAction} submit="Delete product" danger small confirm="Delete this product permanently? Past orders keep their line items."><input type="hidden" name="id" value={id} /></ActionForm>}
    </div>
  );
}
