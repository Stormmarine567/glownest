import type { Metadata } from 'next';
import Link from 'next/link';
import { SlidersHorizontal } from 'lucide-react';
import { PageHero } from '@/components/PageHero';
import { ProductCard } from '@/components/ProductCard';
import { Reveal } from '@/components/Reveal';
import { getCategories, getProducts } from '@/lib/data';

export const metadata: Metadata = { title: 'Shop', description: 'Science-backed formulas designed for every skin type and concern.' };

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ category?: string; filter?: string }> }) {
  const sp = await searchParams;
  const category = sp.category ?? 'all';
  const [categories, products] = await Promise.all([getCategories(), getProducts({ category, filter: sp.filter })]);
  const chips = [{ slug: 'all', name: 'All' }, ...categories];

  return (
    <>
      <PageHero eyebrow="SHOP" title="Our Collection" text="Science-backed formulas designed for every skin type and concern." />
      <section className="pb-16 pt-8 md:pb-[48px] md:pt-[40px]">
        <div className="container">
          <nav aria-label="Product categories" className="-mx-5 flex items-center gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
            <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.6} aria-hidden="true" />
            {chips.map((c) => {
              const on = category === c.slug;
              return (
                <Link key={c.slug} href={c.slug === 'all' ? '/shop' : `/shop?category=${c.slug}`} aria-current={on ? 'true' : undefined} scroll={false}
                  className={`shrink-0 rounded-full px-[18px] py-[10px] text-[14px] font-medium transition duration-200 ${on ? 'bg-navy text-white shadow-card' : 'bg-tint text-ink hover:bg-[#E3EAF6]'}`}>
                  {c.name}
                </Link>
              );
            })}
          </nav>
          {products.length === 0 ? (
            <p className="py-24 text-center text-muted">No products in this category yet.</p>
          ) : (
            <div className="mt-8 grid grid-cols-2 gap-3 md:mt-[40px] md:grid-cols-4 md:gap-[25px]">
              {products.map((p, i) => <Reveal key={p.id} delay={(i % 4) * 60}><ProductCard product={p} /></Reveal>)}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
