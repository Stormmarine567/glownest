import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActionForm } from '@/components/dashboard/ActionForm';
import { ImageUploader } from '@/components/dashboard/ImageUploader';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { deleteBlogAction, saveBlogAction } from '../../content/actions';

export const dynamic = 'force-dynamic';

export default async function BlogEditor({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin('content');
  const { id } = await params;
  const isNew = id === 'new';
  const { data: p } = isNew ? { data: null } : await (await createClient()).from('blog_posts').select('*').eq('id', id).maybeSingle();
  if (!isNew && !p) notFound();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h2 className="text-[26px]">{isNew ? 'New post' : p!.title}</h2><Link href="/admin/blog" className="text-[13px] underline">← All posts</Link></div>
      <ActionForm action={saveBlogAction} submit="Save post" className="space-y-4 rounded-2xl bg-white p-5 shadow-soft md:p-6">
        <input type="hidden" name="id" value={isNew ? '' : id} />
        <div className="grid gap-4 md:grid-cols-2"><div><label className="label" htmlFor="title">Title</label><input id="title" name="title" required defaultValue={p?.title} className="input" /></div><div><label className="label" htmlFor="slug">URL slug</label><input id="slug" name="slug" defaultValue={p?.slug} placeholder="auto from title" className="input" /></div>
          <div><label className="label" htmlFor="category">Category</label><input id="category" name="category" defaultValue={p?.category ?? ''} className="input" /></div><div><label className="label" htmlFor="read_minutes">Read time (minutes)</label><input id="read_minutes" name="read_minutes" inputMode="numeric" defaultValue={p?.read_minutes ?? 4} className="input" /></div></div>
        <div><span className="label">Cover image</span><ImageUploader name="cover_url" bucket="content" folder="blog" initialUrl={p?.cover_url} label="Upload cover" /></div>
        <div><label className="label" htmlFor="excerpt">Excerpt</label><textarea id="excerpt" name="excerpt" defaultValue={p?.excerpt ?? ''} className="textarea min-h-[70px]" /></div>
        <div><label className="label" htmlFor="body">Article</label><textarea id="body" name="body" defaultValue={p?.body ?? ''} className="textarea min-h-[300px]" /><p className="mt-1 text-[11px] text-muted">Separate paragraphs with a blank line.</p></div>
        <div className="flex gap-6 text-[13px]"><label className="flex items-center gap-2"><input type="checkbox" name="is_published" defaultChecked={p?.is_published ?? true} />Published</label><label className="flex items-center gap-2"><input type="checkbox" name="is_featured" defaultChecked={p?.is_featured} />Featured</label></div>
      </ActionForm>
      {!isNew && <ActionForm action={deleteBlogAction} submit="Delete post" danger small confirm="Delete this post?"><input type="hidden" name="id" value={id} /></ActionForm>}
    </div>
  );
}
