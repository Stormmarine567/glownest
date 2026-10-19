import { notFound } from 'next/navigation';
import { PageSections } from '@/components/PageSections';
import { getPage } from '@/lib/data';

export async function generateMetadata() {
  const p = await getPage('privacy');
  return { title: p?.title ?? 'Privacy Policy' };
}

export default async function Page() {
  const page = await getPage('privacy');
  if (!page) notFound();
  return <PageSections page={page} eyebrow="LEGAL" />;
}
