import { notFound } from 'next/navigation';
import { PageSections } from '@/components/PageSections';
import { getPage } from '@/lib/data';

export async function generateMetadata() {
  const p = await getPage('sustainability');
  return { title: p?.title ?? 'Sustainability' };
}

export default async function Page() {
  const page = await getPage('sustainability');
  if (!page) notFound();
  return <PageSections page={page} eyebrow="SUSTAINABILITY" />;
}
