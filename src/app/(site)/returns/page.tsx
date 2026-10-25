import { notFound } from 'next/navigation';
import { PageSections } from '@/components/PageSections';
import { getPage } from '@/lib/data';

export async function generateMetadata() {
  const p = await getPage('returns');
  return { title: p?.title ?? 'Returns' };
}

export default async function Page() {
  const page = await getPage('returns');
  if (!page) notFound();
  return <PageSections page={page} eyebrow="RETURNS" />;
}
