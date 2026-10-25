import Link from 'next/link';
import { Plus } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';

export const metadata = { title: 'Blog' };
export const dynamic = 'force-dynamic';

export default async function AdminBlog() {
  await requireAdmin('content');
  const { data } = await (await createClient()).from('blog_posts').select('id,title,category,is_published,is_featured,published_at').order('published_at', { ascending: false });
  return (
    <div>
      <div className="mb-5 flex items-center justify-between"><h2 className="text-[26px]">Blog</h2><Link href="/admin/blog/new" className="btn btn-primary h-10 px-4 text-[13px]"><Plus className="h-4 w-4" />New post</Link></div>
      <ul className="divide-y divide-line rounded-2xl bg-white shadow-soft">{(data ?? []).map((p) => <li key={p.id}><Link href={`/admin/blog/${p.id}`} className="flex flex-wrap items-center justify-between gap-2 p-4 text-[13px] hover:bg-tint-soft"><b>{p.title}</b><span className="text-muted">{p.category} · {formatDate(p.published_at)}{p.is_featured ? ' · featured' : ''}{p.is_published ? '' : ' · draft'}</span></Link></li>)}{(data ?? []).length === 0 && <li className="p-8 text-center text-[13px] text-muted">No posts yet.</li>}</ul>
    </div>
  );
}
