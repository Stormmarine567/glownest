import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActionForm } from '@/components/dashboard/ActionForm';
import { JsonEditor } from '@/components/dashboard/JsonEditor';
import { requireAdmin } from '@/lib/auth';
import defaults from '@/lib/default-content.json';
import { createClient } from '@/lib/supabase/server';
import { savePageAction } from '../../content/actions';

export const dynamic = 'force-dynamic';

export default async function PageEditor({ params }: { params: Promise<{ slug: string }> }) {
  await requireAdmin('content');
  const { slug } = await params;
  const d = (defaults.pages as Record<string, { title: string; summary: string; body: unknown }>)[slug];
  if (!d) notFound();
  const { data } = await (await createClient()).from('pages').select('*').eq('slug', slug).maybeSingle();
  const p = data ?? { title: d.title, summary: d.summary, body: d.body, is_published: true };
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h2 className="text-[26px]">{p.title}</h2><Link href="/admin/pages" className="text-[13px] underline">← All pages</Link></div>
      <ActionForm action={savePageAction} submit="Save page" className="space-y-5 rounded-2xl bg-white p-5 shadow-soft md:p-6">
        <input type="hidden" name="slug" value={slug} />
        <div className="grid gap-4 md:grid-cols-2"><div><label className="label" htmlFor="title">Title</label><input id="title" name="title" required defaultValue={p.title} className="input" /></div><div><label className="label" htmlFor="summary">Summary</label><input id="summary" name="summary" defaultValue={p.summary ?? ''} className="input" /></div></div>
        <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" name="is_published" defaultChecked={p.is_published} />Published</label>
        <div><span className="label">Content</span><JsonEditor name="body" initial={p.body as never} /></div>
      </ActionForm>
    </div>
  );
}
