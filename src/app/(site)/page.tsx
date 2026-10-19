import Link from 'next/link';
import { ArrowRight, Quote } from 'lucide-react';
import { ContentIcon } from '@/components/ContentIcon';
import { ProductCard } from '@/components/ProductCard';
import { Reveal } from '@/components/Reveal';
import { Stars } from '@/components/Stars';
import { Accordion } from '@/components/Accordion';
import { getBestsellers, getContent, getFaqs, getFeatured } from '@/lib/data';

/* eslint-disable @next/next/no-img-element */
export default async function HomePage() {
  const [hero, about, banner, concerns, promise, testimonials, featured, bestsellers, faqs] = await Promise.all([
    getContent('home_hero'), getContent('home_about'), getContent('home_routine_banner'), getContent('home_concerns'),
    getContent('home_promise'), getContent('home_testimonials'), getFeatured(), getBestsellers(), getFaqs(),
  ]);

  return (
    <>
      {/* HERO */}
      <section className="overflow-hidden bg-gradient-to-br from-tint via-[#F1F5FB] to-[#F7F9FD]">
        <div className="container grid items-center gap-8 pb-10 pt-8 md:min-h-[703px] md:grid-cols-2 md:gap-6 md:py-0">
          <div className="animate-fadeUp">
            <p className="eyebrow text-[11px] tracking-[0.2em] md:mt-[-60px]">{hero.eyebrow}</p>
            <h1 className="mt-4 text-[44px] leading-[1.05] md:text-[64px]">{hero.heading.replace('Skin ', 'Skin\n').split('\n').map((l: string, i: number) => <span key={i} className="block">{l}</span>)}</h1>
            <p className="mt-5 max-w-[400px] text-[15px] leading-7 text-muted md:text-[16px]">{hero.text}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href={hero.primary_cta.href} className="btn btn-primary group">{hero.primary_cta.label}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
              <Link href={hero.secondary_cta.href} className="btn btn-outline">{hero.secondary_cta.label}</Link>
            </div>
            <div className="mt-6 flex items-center gap-3">
              <div className="flex -space-x-2" aria-hidden="true">
                {['#9DB4E8', '#B9C8EE', '#8CA6DD', '#C7D3F1'].map((c) => <span key={c} className="h-7 w-7 rounded-full border-2 border-white" style={{ background: c }} />)}
              </div>
              <div>
                <p className="text-[12px] font-medium text-ink">{hero.trust.text}</p>
                <p className="flex items-center gap-1.5 text-[11px] text-muted"><Stars value={5} className="h-3 w-3" />{hero.trust.rating}</p>
              </div>
            </div>
          </div>

          <div className="relative md:h-[703px]">
            <div className="relative h-[360px] overflow-hidden rounded-[24px] bg-tint md:h-full md:rounded-b-[24px] md:rounded-t-none">
              <img src={hero.image_url} alt="Model applying skincare" className="h-full w-full object-cover" />
            </div>
            <div className="absolute right-3 top-6 w-[170px] rounded-xl bg-white p-3 shadow-card md:right-3 md:top-[175px] md:w-[210px] md:p-4">
              <p className="text-[10px] font-bold text-ink md:text-[11px]">{hero.results_card.title}</p>
              <ul className="mt-2 space-y-1.5 text-[10px] md:text-[11px]">
                {hero.results_card.rows.map(([k, v]: [string, string]) => (
                  <li key={k} className="flex justify-between text-muted"><span>{k}</span><span className="font-bold text-ink">{v}</span></li>
                ))}
              </ul>
              <p className="mt-2 text-[8px] text-muted">{hero.results_card.footnote}</p>
            </div>
            <div className="absolute bottom-6 left-3 hidden w-[160px] rounded-xl bg-white p-2 shadow-card md:-left-[30px] md:bottom-[46px] md:block">
              <img src="/images/routine-flatlay.svg" alt="" className="h-[100px] w-full rounded-lg object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section className="py-14 md:py-[84px]">
        <div className="container">
          <div className="grid items-center gap-8 md:grid-cols-[511px_1fr] md:gap-[121px]">
            <Reveal><img src={about.image_url} alt="Botanical skincare still life" className="h-[220px] w-full rounded-[20px] object-cover md:h-[374px]" /></Reveal>
            <Reveal delay={100}>
              <p className="eyebrow">{about.eyebrow}</p>
              <h2 className="mt-3 text-[30px] leading-[1.12] md:text-[44px]">{about.heading}</h2>
              <p className="mt-4 max-w-[430px] text-[14px] leading-7 text-muted md:text-[15px]">{about.text}</p>
              <Link href={about.cta.href} className="btn btn-outline group mt-6">{about.cta.label}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
            </Reveal>
          </div>
          <ul className="mt-12 grid grid-cols-2 gap-8 border-t border-line pt-10 md:mt-[84px] md:grid-cols-4">
            {about.features.map((f: { icon: string; title: string; text: string }, i: number) => (
              <Reveal as="li" key={f.title} delay={i * 80} className="text-center">
                <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-tint text-navy"><ContentIcon name={f.icon} className="h-4 w-4" /></span>
                <h3 className="mt-3 text-[13px]">{f.title}</h3>
                <p className="mt-1 text-[11px] text-muted">{f.text}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* FEATURED */}
      <section className="bg-[#F3F6FB] py-12 md:py-[70px]">
        <div className="container">
          <div className="flex items-center justify-between">
            <p className="eyebrow">/ FEATURED COLLECTION</p>
            <Link href="/shop" className="flex items-center gap-1.5 text-[13px] font-bold text-ink transition hover:gap-2.5">View All Products <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 md:mt-[46px] md:grid-cols-4 md:gap-[25px]">
            {featured.slice(0, 4).map((p, i) => <Reveal key={p.id} delay={i * 70}><ProductCard product={p} variant="featured" /></Reveal>)}
          </div>
        </div>
      </section>

      {/* ROUTINE BANNER */}
      <section className="bg-navy py-14 text-white md:py-[100px]">
        <div className="container grid items-center gap-8 md:grid-cols-2 md:gap-[60px]">
          <Reveal>
            <h2 className="text-[34px] leading-[1.1] text-white md:text-[48px]">{banner.heading}</h2>
            <p className="mt-5 text-[14px] text-white/70">{banner.text}</p>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-[11px] text-white/85">
              {banner.badges.map((b: string, i: number) => (
                <li key={b} className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10"><ContentIcon name={['sparkles', 'shield', 'flask'][i % 3]} className="h-3 w-3" /></span>{b}
                </li>
              ))}
            </ul>
            <Link href={banner.cta.href} className="btn btn-light group mt-7">{banner.cta.label}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
          </Reveal>
          <Reveal delay={120}><img src={banner.image_url} alt="Skincare routine products" className="aspect-[16/9] w-full rounded-xl bg-white object-cover shadow-card md:h-[334px]" /></Reveal>
        </div>
      </section>

      {/* CONCERNS */}
      <section className="py-14 md:py-[92px]">
        <div className="container grid items-start gap-10 md:grid-cols-[1fr_448px] md:gap-[100px]">
          <Reveal>
            <p className="eyebrow">{concerns.eyebrow}</p>
            <h2 className="mt-3 max-w-[560px] text-[30px] leading-[1.15] md:text-[40px]">{concerns.heading}</h2>
            <Link href={concerns.cta.href} className="btn btn-primary group mt-6">{concerns.cta.label}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
            <ul className="mt-9 grid max-w-[570px] grid-cols-2 gap-1">
              {concerns.items.map((c: { icon: string; title: string; text: string; concern: string }) => (
                <li key={c.title}>
                  <Link href={`/quiz?concern=${c.concern}`} className="block h-full rounded-xl border border-line bg-tint-soft/60 p-5 transition duration-300 hover:-translate-y-0.5 hover:border-navy/30 hover:bg-white hover:shadow-card">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-line bg-white text-navy"><ContentIcon name={c.icon} className="h-3.5 w-3.5" /></span>
                    <h3 className="mt-3 text-[13px]">{c.title}</h3>
                    <p className="mt-1 text-[11px] text-muted">{c.text}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={120}><img src={concerns.image_url} alt="Model applying cream" className="h-[360px] w-full rounded-[20px] object-cover md:h-[614px]" /></Reveal>
        </div>
      </section>

      {/* BESTSELLERS */}
      <section className="bg-[#F3F6FB] py-12 md:py-[70px]">
        <div className="container">
          <p className="eyebrow">/ BESTSELLERS</p>
          <div className="mt-8 grid grid-cols-2 gap-4 md:mt-[46px] md:grid-cols-4 md:gap-[25px]">
            {bestsellers.slice(0, 4).map((p, i) => <Reveal key={p.id} delay={i * 70}><ProductCard product={p} variant="bestseller" /></Reveal>)}
          </div>
        </div>
      </section>

      {/* PROMISE */}
      <section className="py-14 md:py-[84px]">
        <Reveal className="container">
          <p className="eyebrow">{promise.eyebrow}</p>
          <h2 className="mt-3 max-w-[640px] text-[26px] leading-[1.2] md:text-[32px]">{promise.heading}</h2>
          <ul className="mt-6 flex flex-wrap gap-3">
            {promise.pills.map((p: string, i: number) => (
              <li key={p} className="flex items-center gap-2 rounded-full bg-tint px-4 py-2.5 text-[12px] font-medium text-ink">
                <ContentIcon name={['shield', 'droplets', 'leaf'][i % 3]} className="h-3.5 w-3.5" />{p}
              </li>
            ))}
          </ul>
          <Link href={promise.cta.href} className="btn btn-primary group mt-8">{promise.cta.label}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
        </Reveal>
      </section>

      {/* TESTIMONIALS */}
      <section className="bg-[#F3F6FB] py-14 md:py-[80px]">
        <div className="container">
          <p className="eyebrow">{testimonials.eyebrow}</p>
          <h2 className="mt-3 text-[28px] md:text-[32px]">{testimonials.heading}</h2>
          <div className="mt-8 grid gap-5 md:mt-10 md:grid-cols-2 md:gap-6">
            {testimonials.items.map((t: { quote: string; name: string; place: string }, i: number) => (
              <Reveal key={t.name} delay={i * 100}>
                <figure className="h-full rounded-2xl bg-white p-7 shadow-soft md:p-9">
                  <Quote className="h-6 w-6 fill-[#D5DCEB] text-[#D5DCEB]" strokeWidth={0} />
                  <blockquote className="mt-4 text-[14px] italic leading-7 text-muted">&ldquo;{t.quote}&rdquo;</blockquote>
                  <figcaption className="mt-5 flex items-center gap-3">
                    <span className="h-9 w-9 rounded-full bg-gradient-to-br from-[#C9D6F2] to-[#9DB4E8]" aria-hidden="true" />
                    <span><span className="block text-[13px] font-bold">{t.name}</span><span className="block text-[11px] text-muted">{t.place}</span></span>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-14 md:py-[84px]">
        <Reveal className="container max-w-[704px]">
          <p className="eyebrow">/ FAQ</p>
          <h2 className="mb-7 mt-3 text-[26px] md:text-[30px]">Everything You Need to Know</h2>
          <Accordion items={faqs.slice(0, 4).map((f: { id: string; question: string; answer: string }) => ({ id: f.id, question: f.question, answer: f.answer }))} />
        </Reveal>
      </section>
    </>
  );
}
