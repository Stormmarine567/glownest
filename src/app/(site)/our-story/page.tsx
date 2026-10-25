import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ContentIcon } from '@/components/ContentIcon';
import { Reveal } from '@/components/Reveal';
import { getContent } from '@/lib/data';

export const metadata: Metadata = { title: 'Our Story' };

/* eslint-disable @next/next/no-img-element */
export default async function OurStoryPage() {
  const s = await getContent('our_story');
  return (
    <>
      <section className="bg-tint">
        <div className="container grid items-center gap-8 py-12 md:grid-cols-2 md:gap-10 md:py-[80px]">
          <div className="animate-fadeUp">
            <p className="eyebrow">{s.eyebrow}</p>
            <h1 className="mt-3 text-[34px] leading-[1.1] md:text-[44px]">{s.heading}</h1>
            <p className="mt-5 max-w-[400px] text-[14px] leading-[1.9] text-muted md:text-[15px]">{s.text}</p>
            <Link href={s.cta.href} className="btn btn-primary group mt-7">{s.cta.label}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
          </div>
          <img src={s.image_url} alt="Botanical skincare still life" className="h-[240px] w-full rounded-[20px] object-cover shadow-card md:h-[328px] md:w-[450px] md:justify-self-end" />
        </div>
      </section>

      <section className="py-14 md:py-[84px]">
        <div className="container">
          <div className="text-center">
            <p className="eyebrow">/ OUR JOURNEY</p>
            <h2 className="mt-2 text-[26px] md:text-[28px]">{s.journey_heading}</h2>
          </div>
          <ol className="mx-auto mt-10 max-w-[600px] md:mt-[44px]">
            {s.timeline.map((t: { year: string; title: string; text: string }, i: number) => (
              <Reveal as="li" key={t.year} delay={i * 80} className="grid grid-cols-[48px_16px_1fr] gap-x-3 md:grid-cols-[60px_16px_1fr] md:gap-x-5">
                <span className="pt-0.5 text-right font-serif text-[15px] font-bold">{t.year}</span>
                <span className="relative flex justify-center">
                  <span className="mt-2 h-2.5 w-2.5 rounded-full bg-navy" />
                  {i < s.timeline.length - 1 && <span className="absolute bottom-0 top-6 w-px bg-line" />}
                </span>
                <div className="pb-9 md:pb-[48px]">
                  <h3 className="text-[15px]">{t.title}</h3>
                  <p className="mt-1.5 text-[12.5px] leading-6 text-muted">{t.text}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-[#F6F8FC] py-14 md:py-[80px]">
        <div className="container">
          <div className="text-center">
            <p className="eyebrow">/ OUR VALUES</p>
            <h2 className="mt-2 text-[26px] md:text-[28px]">{s.values_heading}</h2>
          </div>
          <ul className="mt-10 grid gap-5 md:mt-[44px] md:grid-cols-3 md:gap-[25px]">
            {s.values.map((v: { icon: string; title: string; text: string }, i: number) => (
              <Reveal as="li" key={v.title} delay={(i % 3) * 80}>
                <div className="h-full rounded-2xl border border-line/70 bg-white p-6 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-card">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-tint text-navy"><ContentIcon name={v.icon} className="h-[18px] w-[18px]" /></span>
                  <h3 className="mt-4 text-[15px]">{v.title}</h3>
                  <p className="mt-2 text-[12.5px] leading-6 text-muted">{v.text}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-14 md:py-[84px]">
        <Reveal className="container">
          <div className="grid overflow-hidden rounded-[24px] bg-navy md:grid-cols-[1fr_518px]">
            <div className="p-8 text-white md:p-[48px] md:pr-8">
              <h2 className="text-[28px] leading-[1.15] text-white md:text-[32px]">{s.cta_banner.heading}</h2>
              <p className="mt-4 text-[14px] text-white/80">{s.cta_banner.text}</p>
              <Link href={s.cta_banner.cta.href} className="btn btn-light group mt-6">{s.cta_banner.cta.label}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
            </div>
            <img src={s.cta_banner.image_url} alt="Skincare products" className="h-[220px] w-full object-cover md:h-full" />
          </div>
        </Reveal>
      </section>
    </>
  );
}
