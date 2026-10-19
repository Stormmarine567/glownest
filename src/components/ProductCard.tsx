'use client';
import Link from 'next/link';
import { Plus, Star } from 'lucide-react';
import { useCart } from './CartProvider';
import { formatCount, formatMoney } from '@/lib/utils';
import type { Product } from '@/lib/types';

export function ProductCard({ product, variant = 'shop' }: { product: Product; variant?: 'shop' | 'featured' | 'bestseller' }) {
  const { add } = useCart();
  const img = [...(product.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0];
  const price = product.sale_price_cents ?? product.price_cents;
  const href = `/product/${product.slug}`;
  const out = product.stock_quantity <= 0;

  const rating = (
    <span className="flex items-center gap-1 text-[12px] text-muted">
      <Star className="h-3.5 w-3.5 fill-star text-star" strokeWidth={0} />
      {Number(product.rating_avg).toFixed(1)} ({formatCount(product.rating_count)})
    </span>
  );

  const addBtn = (
    <button
      type="button"
      disabled={out}
      onClick={() => add(product.id)}
      aria-label={`Add ${product.name} to cart`}
      className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-white transition duration-200 hover:scale-110 hover:bg-navy-700 active:scale-95 disabled:opacity-40 md:h-[34px] md:w-[34px]"
    >
      <Plus className="h-4 w-4" strokeWidth={2.2} />
    </button>
  );

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[18px] border border-line bg-tint-soft transition duration-300 hover:-translate-y-1 hover:shadow-card">
      <Link href={href} className="block" aria-label={product.name}>
        <div className="relative bg-tint p-[8.5%]">
          {variant === 'shop' && product.categories?.name && (
            <span className="absolute left-3 top-3 z-10 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-muted">{product.categories.name}</span>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img?.url ?? '/images/products/hyaluronic-acid-serum.svg'} alt={img?.alt ?? product.name} loading="lazy"
            className="aspect-square w-full bg-white object-cover transition duration-500 group-hover:scale-[1.03]" />
        </div>
      </Link>
      <div className="flex flex-1 flex-col bg-white px-4 pb-4 pt-4">
        <Link href={href} className="block">
          <h3 className="font-serif text-[14px] font-bold leading-snug md:text-[15px]">{product.name}</h3>
          {variant !== 'bestseller' && <p className="mt-1 text-[12px] text-muted md:text-[13px]">{product.tagline}</p>}
          {variant === 'shop' && <div className="mt-2">{rating}</div>}
        </Link>
        <div className="mt-auto flex items-center justify-between pt-4">
          <span className="text-[14px] font-bold text-ink">
            {formatMoney(price, product.currency)}
            {product.sale_price_cents != null && <span className="ml-2 text-[12px] font-normal text-muted line-through">{formatMoney(product.price_cents, product.currency)}</span>}
          </span>
          {variant === 'bestseller' ? <div className="flex items-center gap-3">{rating}{addBtn}</div> : addBtn}
        </div>
      </div>
    </article>
  );
}
