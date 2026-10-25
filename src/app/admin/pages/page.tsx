import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import defaults from '@/lib/default-content.json';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Pages & FAQs' };
export const dynamic = 'force-dynamic';

export default async function PagesIndex() {
  await requireAdmin('content');
  const { data } = await (await createClient()).from('pages').select('slug,title,is_published');
  const rows = new Map((data ?? []).map((p) => [p.slug, p]));
  const slugs = Object.keys(defaults.pages);
  const card = 'block rounded-2xl bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-card';
  return (
    <div className="space-y-6">
      <div><h2 className="text-[26px]">Pages & FAQs</h2><p className="text-[13px] text-muted">Footer pages, FAQ and job openings.</p></div>
      <ul className="grid gap-3 md:grid-cols-2">
        {slugs.map((s) => <li key={s}><Link href={`/admin/pages/${s}`} className={card}><b>{rows.get(s)?.title ?? (defaults.pages as Record<string, { title: string }>)[s].title}</b><span className="block text-[12px] text-muted">/{s}{rows.get(s) && !rows.get(s)!.is_published ? ' · hidden' : ''}</span></Link></li>)}
        <li><Link href="/admin/faqs" className={card}><b>FAQ</b><span className="block text-[12px] text-muted">Questions and answers</span></Link></li>
        <li><Link href="/admin/jobs" className={card}><b>Careers — job openings</b><span className="block text-[12px] text-muted">Roles shown on the Careers page</span></Link></li>
        <li><Link href="/admin/content/quiz" className={card}><b>Skincare Quiz</b><span className="block text-[12px] text-muted">Intro and result copy (product matching is set per product)</span></Link></li>
      </ul>
    </div>
  );
}
