import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Clock } from 'lucide-react';
import { PageHero } from '@/components/PageHero';
import { Reveal } from '@/components/Reveal';
import { getBlogPosts } from '@/lib/data';
import { formatDate } from '@/lib/utils';

export const metadata: Metadata = { title: 'Blog' };

/* eslint-disable @next/next/no-img-element */
export default async function BlogPage() {
  const posts = await getBlogPosts();
  const featured = posts.find((p) => p.is_featured) ?? posts[0];
  const rest = posts.filter((p) => p !== featured);
  const meta = (p: { published_at: string; read_minutes: number }) => (
    <p className="flex items-center gap-2 text-[12px] text-[#9AA5B8]">
      {formatDate(p.published_at)} <span aria-hidden="true">·</span><Clock className="h-3 w-3" aria-hidden="true" />{p.read_minutes} min read
    </p>
  );

  return (
    <>
      <PageHero eyebrow="BLOG" title="Skincare Insights" text="Expert tips, ingredient deep-dives, and routines to help you glow from within." />
      <section className="pb-16 pt-10 md:pb-[64px] md:pt-[64px]">
        <div className="container">
          {featured && (
            <Reveal>
              <article className="grid overflow-hidden rounded-[24px] border border-line bg-tint-soft md:grid-cols-2">
                <Link href={`/blog/${featured.slug}`} className="block overflow-hidden bg-[#F4F6FB]"><img src={featured.cover_url} alt="" className="h-[220px] w-full object-cover transition duration-700 hover:scale-[1.03] md:h-full" /></Link>
                <div className="flex flex-col justify-center p-6 md:p-[48px]">
                  <p className="text-[12px] font-medium uppercase tracking-[0.05em] text-muted">{featured.category}</p>
                  <h2 className="mt-3 text-[26px] leading-[1.2] md:text-[32px]"><Link href={`/blog/${featured.slug}`}>{featured.title}</Link></h2>
                  <p className="mt-4 text-[14px] leading-7 text-muted">{featured.excerpt}</p>
                  <div className="mt-5">{meta(featured)}</div>
                  <Link href={`/blog/${featured.slug}`} className="btn btn-primary group mt-6 w-fit font-bold">Read Article<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
                </div>
              </article>
            </Reveal>
          )}
          <div className="mt-8 grid gap-6 md:mt-[48px] md:grid-cols-3 md:gap-[26px]">
            {rest.map((p, i) => (
              <Reveal key={p.id} delay={i * 80}>
                <article className="group h-full overflow-hidden rounded-[16px] border border-line bg-white transition duration-300 hover:-translate-y-1 hover:shadow-card">
                  <Link href={`/blog/${p.slug}`} className="block overflow-hidden"><img src={p.cover_url} alt="" loading="lazy" className="h-[190px] w-full object-cover transition duration-700 group-hover:scale-105 md:h-[217px]" /></Link>
                  <div className="p-5">
                    <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-muted">{p.category}</p>
                    <h3 className="mt-2 text-[18px] leading-snug"><Link href={`/blog/${p.slug}`}>{p.title}</Link></h3>
                    <p className="mt-2 text-[13px] leading-6 text-muted">{p.excerpt}</p>
                    <div className="mt-4">{meta(p)}</div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
