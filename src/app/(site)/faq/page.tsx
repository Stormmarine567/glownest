import { PageHero } from '@/components/PageHero';
import { Accordion } from '@/components/Accordion';
import { getFaqs } from '@/lib/data';

export const metadata = { title: 'FAQ' };

export default async function FaqPage() {
  const faqs = await getFaqs();
  const groups = faqs.reduce<Record<string, typeof faqs>>((a, f) => ((a[f.category] ||= []).push(f), a), {});
  return (
    <>
      <PageHero eyebrow="FAQ" title="Frequently Asked Questions" text="Quick answers to the things we are asked most." />
      <section className="py-12 md:py-[64px]">
        <div className="container max-w-[760px] space-y-10">
          {Object.entries(groups).map(([cat, items]) => (
            <div key={cat}>
              <h2 className="mb-4 text-[20px]">{cat}</h2>
              <Accordion items={items.map((f) => ({ id: f.id, question: f.question, answer: f.answer }))} />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
