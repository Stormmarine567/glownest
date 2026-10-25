import Link from 'next/link';
import { Plus } from 'lucide-react';
import { ActionForm } from '@/components/dashboard/ActionForm';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatMoney } from '@/lib/utils';
import { toggleProductAction } from './actions';

export const metadata = { title: 'Products' };
export const dynamic = 'force-dynamic';

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin('products');
  const { q } = await searchParams;
  let query = (await createClient()).from('products').select('id,name,slug,price_cents,sale_price_cents,currency,stock_quantity,low_stock_threshold,is_active,is_featured,is_bestseller,categories(name),product_images(url,sort_order)').order('sort_order').order('created_at', { ascending: false });
  if (q) query = query.ilike('name', `%${q.replace(/[%,]/g, '')}%`);
  const { data } = await query;
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="text-[26px]">Products</h2>
        <div className="flex gap-2"><form className="flex gap-2"><input name="q" defaultValue={q} placeholder="Search products" aria-label="Search products" className="input h-10 w-48" /><button className="btn btn-outline h-10 px-4 text-[13px]">Search</button></form><Link href="/admin/products/new" className="btn btn-primary h-10 px-4 text-[13px]"><Plus className="h-4 w-4" />New product</Link></div></div>
      <div className="overflow-x-auto rounded-2xl bg-white shadow-soft">
        <table className="w-full min-w-[760px] text-left text-[13px]">
          <thead className="border-b border-line text-[11px] uppercase tracking-wider text-muted"><tr><th className="p-4">Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Visible</th><th>Featured</th><th>Bestseller</th></tr></thead>
          <tbody className="divide-y divide-line">
            {(data ?? []).map((p) => {
              const img = [...(p.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0]?.url;
              const low = p.stock_quantity <= p.low_stock_threshold;
              const tog = (field: string, on: boolean) => (
                <ActionForm action={toggleProductAction} submit={on ? 'On' : 'Off'} small submitClassName={`rounded-full px-3 py-1 text-[11px] font-bold ${on ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                  <input type="hidden" name="id" value={p.id} /><input type="hidden" name="field" value={field} /><input type="hidden" name="value" value={String(!on)} />
                </ActionForm>
              );
              return (
                <tr key={p.id} className="hover:bg-tint-soft">
                  <td className="p-4"><Link href={`/admin/products/${p.id}`} className="flex items-center gap-3 font-medium">{/* eslint-disable-next-line @next/next/no-img-element */}{img ? <img src={img} alt="" className="h-10 w-10 rounded-lg bg-tint object-cover" /> : <span className="h-10 w-10 rounded-lg bg-tint" />}{p.name}</Link></td>
                  <td>{(p.categories as unknown as { name: string } | null)?.name ?? '—'}</td>
                  <td>{p.sale_price_cents != null ? <><s className="text-muted">{formatMoney(p.price_cents, p.currency)}</s> {formatMoney(p.sale_price_cents, p.currency)}</> : formatMoney(p.price_cents, p.currency)}</td>
                  <td className={low ? 'font-bold text-red-600' : ''}>{p.stock_quantity}{low && ' · low'}</td>
                  <td>{tog('is_active', p.is_active)}</td><td>{tog('is_featured', p.is_featured)}</td><td>{tog('is_bestseller', p.is_bestseller)}</td>
                </tr>
              );
            })}
            {(data ?? []).length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted">No products found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
