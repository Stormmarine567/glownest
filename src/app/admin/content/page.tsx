import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import defaults from '@/lib/default-content.json';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';

export const metadata = { title: 'Site content' };
export const dynamic = 'force-dynamic';

const LABELS: Record<string, [string, string]> = {
  home_hero: ['Home — hero', 'Headline, buttons, hero image and results card.'], home_about: ['Home — about section', 'Intro text, image and feature points.'],
  home_routine_banner: ['Home — routine banner', 'The call-to-action band.'], home_concerns: ['Home — skin concerns', 'Concern cards.'], home_promise: ['Home — brand promise', 'Promise points.'],
  home_testimonials: ['Home — testimonials', 'Customer quotes.'], nav: ['Navigation', 'Header menu links.'], footer: ['Footer', 'Footer columns, copyright and newsletter text.'],
  our_story: ['Our Story page', 'Story sections, values and images.'], quiz: ['Skincare Quiz page', 'Quiz intro and result copy.'],
};

export default async function ContentIndex() {
  await requireAdmin('content');
  const { data } = await (await createClient()).from('site_content').select('key,updated_at');
  const edited = new Map((data ?? []).map((r) => [r.key, r.updated_at]));
  return (
    <div>
      <h2 className="text-[26px]">Site content</h2><p className="mb-5 text-[13px] text-muted">Edit the text, images and links on your storefront. Changes go live immediately.</p>
      <ul className="grid gap-3 md:grid-cols-2">{Object.keys(defaults.content).map((k) => <li key={k}><Link href={`/admin/content/${k}`} className="block rounded-2xl bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-card"><b>{LABELS[k]?.[0] ?? k}</b><span className="mt-1 block text-[12px] text-muted">{LABELS[k]?.[1]}</span><span className="mt-2 block text-[11px] text-muted">{edited.has(k) ? `Edited ${formatDate(edited.get(k)!)}` : 'Original text'}</span></Link></li>)}</ul>
    </div>
  );
}
