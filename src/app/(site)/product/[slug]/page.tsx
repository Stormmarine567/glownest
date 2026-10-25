import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, BadgeCheck } from 'lucide-react';
import { AddToCartButton } from '@/components/AddToCartButton';
import { ReviewForm } from '@/components/ReviewForm';
import { WishlistButton } from '@/components/WishlistButton';
import { createClient } from '@/lib/supabase/server';
import { hasBackend } from '@/lib/data';
import { Stars } from '@/components/Stars';
import { getProduct, getReviews } from '@/lib/data';
import { getSessionProfile } from '@/lib/auth';
import { formatCount, formatDate, formatMoney } from '@/lib/utils';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProduct((await params).slug);
  if (!p) return { title: 'Product not found' };
  return { title: p.name, description: p.description?.slice(0, 160) ?? undefined, openGraph: { images: p.product_images?.[0]?.url ? [p.product_images[0].url] : undefined } };
}

/* eslint-disable @next/next/no-img-element */
export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();
  const [reviews, session] = await Promise.all([getReviews(product.id), getSessionProfile()]);
  const img = [...(product.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0];
  const price = product.sale_price_cents ?? product.price_cents;
  let inWishlist = false;
  if (session && hasBackend()) {
    const { data: w } = await (await createClient()).from('wishlists').select('product_id').eq('product_id', product.id).eq('user_id', session.userId).maybeSingle();
    inWishlist = Boolean(w);
  }

  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Product', name: product.name, description: product.description,
    image: img?.url, sku: product.slug,
    offers: { '@type': 'Offer', priceCurrency: product.currency, price: (price / 100).toFixed(2), availability: product.stock_quantity > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' },
    ...(product.rating_count > 0 ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: product.rating_avg, reviewCount: product.rating_count } } : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <div className="container pt-8 md:pt-[22px]">
        <Link href="/shop" className="inline-flex items-center gap-2 text-[14px] text-muted transition hover:text-ink"><ArrowLeft className="h-4 w-4" />Back to Shop</Link>
      </div>

      <section className="container grid gap-8 pb-14 pt-6 md:grid-cols-[584px_1fr] md:gap-[48px] md:pb-[64px] md:pt-[40px]">
        <div className="rounded-[24px] bg-tint p-5 md:p-8">
          <img src={img?.url ?? '/images/products/hyaluronic-acid-serum.svg'} alt={img?.alt ?? product.name} className="aspect-square w-full bg-white object-cover" />
        </div>
        <div className="md:pt-3">
          <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-muted">{product.categories?.name}</p>
          <h1 className="mt-2 text-[34px] leading-tight md:text-[40px]">{product.name}</h1>
          <p className="mt-3 text-[16px] text-muted">{product.tagline}</p>
          <p className="mt-3 flex items-center gap-2 text-[14px] text-muted">
            <Stars value={product.rating_avg} className="h-4 w-4" />
            {Number(product.rating_avg).toFixed(1)} ({formatCount(product.rating_count)} reviews)
          </p>
          <p className="mt-6 text-[24px] font-bold text-ink">
            {formatMoney(price, product.currency)}
            {product.sale_price_cents != null && <span className="ml-3 text-[16px] font-normal text-muted line-through">{formatMoney(product.price_cents, product.currency)}</span>}
          </p>
          <p className="mt-4 max-w-[580px] text-[14px] leading-[1.9] text-muted">{product.description}</p>
          {product.stock_quantity > 0 && product.stock_quantity <= 5 && <p className="mt-3 text-[13px] font-medium text-amber-700">Only {product.stock_quantity} left</p>}
          <AddToCartButton productId={product.id} soldOut={product.stock_quantity <= 0} extra={<WishlistButton productId={product.id} userId={session?.userId ?? null} initial={inWishlist} />} />
        </div>
      </section>

      <section className="container border-t border-line pb-16 pt-12 md:pb-[32px] md:pt-[48px]" aria-labelledby="reviews-h">
        <div className="grid gap-10 md:grid-cols-[1fr_584px] md:gap-[48px]">
          <div>
            <h2 id="reviews-h" className="text-[24px] md:text-[26px]">Customer Reviews</h2>
            {reviews.length === 0 ? (
              <p className="mt-8 text-[14px] text-muted">No reviews yet — be the first to share your experience.</p>
            ) : (
              <ul className="mt-6 space-y-5">
                {reviews.map((r) => (
                  <li key={r.id} className="rounded-2xl border border-line p-5">
                    <div className="flex items-center justify-between gap-3">
                      <Stars value={r.rating} className="h-4 w-4" />
                      <time className="text-[12px] text-muted" dateTime={r.created_at}>{formatDate(r.created_at)}</time>
                    </div>
                    {r.title && <h3 className="mt-3 text-[16px]">{r.title}</h3>}
                    <p className="mt-2 whitespace-pre-line text-[14px] leading-7 text-muted">{r.body}</p>
                    {r.images?.length > 0 && (
                      <div className="mt-3 flex gap-2">{r.images.map((u: string) => <img key={u} src={u} alt="Customer photo" loading="lazy" className="h-16 w-16 rounded-lg object-cover" />)}</div>
                    )}
                    <p className="mt-3 flex items-center gap-2 text-[12px] font-medium text-ink">
                      {r.display_name}
                      {r.is_verified_purchase && <span className="flex items-center gap-1 text-green-700"><BadgeCheck className="h-3.5 w-3.5" />Verified purchase</span>}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <ReviewForm productId={product.id} userId={session?.userId ?? null} defaultName={session?.profile.full_name ?? ''} />
        </div>
      </section>
    </>
  );
}
