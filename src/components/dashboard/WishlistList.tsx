'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useCart } from '../CartProvider';
import { formatMoney } from '@/lib/utils';

interface Item { product_id: string; products: { id: string; slug: string; name: string; tagline: string | null; price_cents: number; sale_price_cents: number | null; currency: string; stock_quantity: number; product_images: { url: string; sort_order: number }[] } }
/* eslint-disable @next/next/no-img-element */
export function WishlistList({ initial, userId }: { initial: Item[]; userId: string }) {
  const [items, setItems] = useState(initial);
  const { add, remove: removeFromCart } = useCart();
  const router = useRouter();
  void removeFromCart;
  async function drop(pid: string) {
    const { error } = await createClient().from('wishlists').delete().eq('product_id', pid).eq('user_id', userId);
    if (!error) { setItems((l) => l.filter((i) => i.product_id !== pid)); router.refresh(); }
  }
  async function move(pid: string) { add(pid); await drop(pid); }
  if (items.length === 0) return <p className="text-[14px] text-muted">Your wishlist is empty. <Link href="/shop" className="font-bold text-ink underline">Browse the shop</Link></p>;
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {items.map(({ products: p, product_id }) => {
        const img = [...p.product_images].sort((a, b) => a.sort_order - b.sort_order)[0]?.url;
        return (
          <li key={product_id} className="flex gap-4 rounded-2xl border border-line p-4">
            <Link href={`/product/${p.slug}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-tint">{img && <img src={img} alt="" className="h-full w-full object-cover" />}</Link>
            <div className="flex min-w-0 flex-1 flex-col">
              <Link href={`/product/${p.slug}`} className="font-serif text-[15px] font-bold">{p.name}</Link>
              <p className="text-[12px] text-muted">{p.tagline}</p>
              <p className="mt-1 text-[14px] font-bold">{formatMoney(p.sale_price_cents ?? p.price_cents, p.currency)}</p>
              <div className="mt-auto flex items-center gap-2 pt-2">
                <button onClick={() => move(product_id)} disabled={p.stock_quantity <= 0} className="btn btn-primary h-9 px-4 text-[12px]"><ShoppingBag className="h-3.5 w-3.5" />{p.stock_quantity <= 0 ? 'Sold out' : 'Move to cart'}</button>
                <button onClick={() => drop(product_id)} aria-label="Remove from wishlist" className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
