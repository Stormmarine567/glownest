import { notFound } from 'next/navigation';
import { PageSections } from '@/components/PageSections';
import { getPage } from '@/lib/data';

export async function generateMetadata() {
  const p = await getPage('shipping');
  return { title: p?.title ?? 'Shipping' };
}

export default async function Page() {
  const page = await getPage('shipping');
  if (!page) notFound();
  return <PageSections page={page} eyebrow="SHIPPING" />;
}
