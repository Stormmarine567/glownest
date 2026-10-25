import { PageHero } from '@/components/PageHero';
import { QuizFlow } from '@/components/QuizFlow';
import { getContent } from '@/lib/data';

export const metadata = { title: 'Skincare Quiz', description: 'Answer a few questions and get a routine matched to your skin.' };

export default async function QuizPage({ searchParams }: { searchParams: Promise<{ concern?: string }> }) {
  const [content, sp] = await Promise.all([getContent('quiz'), searchParams]);
  return (
    <>
      <PageHero eyebrow="SKIN QUIZ" title={content.title} text={content.intro} />
      <section className="py-10 md:py-[56px]"><div className="container"><QuizFlow content={content} initialConcern={sp.concern} /></div></section>
    </>
  );
}
